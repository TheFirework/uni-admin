## 系统架构总览

### 整体数据流

```
用户访问应用
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ Phase 1: 路由守卫 (guards.ts)                      │
│                                                     │
│  Stage 1: 白名单检查 → /login, /404, /403 直接放行   │
│  Stage 2: Token 校验 → 无 Token → 重定向 /login      │
│  Stage 3: 动态路由就绪检查 ⭐                        │
│    ├── isRoutesLoaded = true → 放行                 │
│    └── isRoutesLoaded = false → 触发 Phase 2        │
│  Stage 4: 权限校验 → 无权限 → /403                  │
└─────────────────────┬───────────────────────────────┘
                      │ Phase 2 触发
                      ▼
┌─────────────────────────────────────────────────────┐
│ Phase 2: 菜单获取 (menu.store.ts)                    │
│                                                     │
│  1️⃣ 防并发检查 (isLoading?)                         │
│     ├── 正在加载中 → 复用已有 Promise (去重器)         │
│     └── 未加载 → 继续                                │
│                                                     │
│  2️⃣ 缓存检查 (MenuCacheManager)                     │
│     ├── L1 内存命中 (<0.1ms) → 返回 + 后台静默刷新   │
│     ├── L2 Storage命中 (1-5ms) → 返回 + 回填L1       │
│     └── 未命中 → 进入 Phase 3                        │
└─────────────────────┬───────────────────────────────┘
                      │ 缓存未命中
                      ▼
┌─────────────────────────────────────────────────────┐
│ Phase 3: 数据源适配 (RouteAdapter)                   │
│                                                     │
│  读取 VITE_ROUTER_MODE 配置                          │
│     │                                               │
│     ├─► [frontend] → FrontendAdapter                │
│     │   └── getModuleRoutes()                       │
│     │       └── Vite glob 自动聚合 modules/*.ts      │
│     │                                               │
│     ├─► [backend]  → BackendAdapter                 │
│     │   └── getMenus() API                           │
│     │       └── generateRoutes() 转换               │
│     │       └── 开发环境失败时降级到 FrontendAdapter  │
│     │                                               │
│     └─► [mixed]    → MixedAdapter                   │
│         ├── 加载静态路由 (base)                      │
│         ├── 尝试加载动态路由 (override)              │
│         └── 深度合并 (动态覆盖静态，权限字段动态优先)  │
└─────────────────────┬───────────────────────────────┘
                      │ 获取到 RouteRecordRaw[]
                      ▼
┌─────────────────────────────────────────────────────┐
│ Phase 4: 注册与缓存                                 │
│                                                     │
│  1️⃣ 写入缓存 (同时更新 L1 和 L2)                   │
│     ├── L1: Map<key, CacheEntry> (同步)             │
│     └── L2: localStorage (异步, TTL=30min)           │
│                                                     │
│  2️⃣ 注册动态路由                                   │
│     └── setupDynamicRoutes(router, routes)          │
│         └── router.addRoute('/', route) × N          │
│                                                     │
│  3️⃣ 更新状态                                       │
│     ├── menuStore.routes = routes                   │
│     ├── menuStore.isLoaded = true                   │
│     └── guards.isRoutesLoaded = true                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ Phase 5: 渲染 UI + 触发预加载 ⭐                     │
│                                                     │
│  1️⃣ Sidebar 从 menuStore.visibleMenus 读取并渲染     │
│                                                     │
│  2️⃣ afterEach 守卫触发预加载                        │
│     └── routePrefetcher.prefetchSiblings(currentPath)│
│         └── 预测相邻路由 → 空闲时预加载组件            │
│                                                     │
│  3️⃣ 用户鼠标悬停菜单项                              │
│     └── hoverPrefetcher.bind(element, path, loader) │
│         └── 150ms 延后执行 loader() 预加载组件         │
└─────────────────────────────────────────────────────┘
```

---

## 模块设计详解

### 模块 1: 路由配置层 (`config/router.config.ts`)

**职责**: 集中管理所有路由系统相关的配置项，通过环境变量注入

**接口定义**:
```typescript
export type RouterMode = 'frontend' | 'backend' | 'mixed';

export interface RouterConfig {
  /** 路由数据源模式 */
  mode: RouterMode;
  
  /** 是否启用菜单缓存 */
  cacheEnabled: boolean;
  
  /** 缓存过期时间（毫秒），默认 30 分钟 */
  cacheTTL: number;
  
  /** 是否启用悬停预加载 */
  prefetchEnabled: boolean;
  
  /** 悬停预加载延迟（毫秒） */
  hoverDelay: number;
  
  /** 最大预加载数量 */
  maxPrefetchCache: number;
}

// 导出只读单例
export const routerConfig: Readonly<RouterConfig>;
```

**环境变量映射**:
```bash
# .env.development
VITE_ROUTER_MODE=frontend          # 开发用前端静态路由
VITE_MENU_CACHE=false             # 开发时不缓存
VITE_HOVER_DELAY=150              # 悬停延迟

# .env.production
VITE_ROUTER_MODE=backend           # 生产用后端API
VITE_MENU_CACHE=true              # 生产必须开启缓存
VITE_MENU_CACHE_TTL=1800000       # 30分钟
```

---

### 模块 2: 类型系统 (`router/routes/types.ts`)

**职责**: 定义扩展的路由 Meta 类型，统一字段命名，消除 authority/roles 歧义

**核心类型**:
```typescript
export interface UniAdminRouteMeta {
  // ====== 基础信息 ======
  title: string;                    // 页面标题
  icon?: string;                     // Iconify 图标
  
  // ====== 显示控制 ======
  hidden?: boolean;                  // 侧边栏隐藏
  hideInMenu?: boolean;              // 别名
  hideChildrenInMenu?: boolean;
  hideInTab?: boolean;
  hideInBreadcrumb?: boolean;

  // ====== 权限控制（统一字段）=====
  access?: string | string[] | ((user: any) => boolean);  // 标准化权限字段
  ignoreAccess?: boolean;            // 忽略权限检查

  // ====== 缓存与行为 ======
  keepAlive?: boolean;
  noCache?: boolean;
  affix?: boolean;
  affixTabOrder?: number;

  // ====== 排序 ======
  order?: number;
  sort?: number;  // 别名

  // ====== 特殊类型 ======
  iframeSrc?: string;
  link?: string;
  externalLink?: string;
  activePath?: string;
  query?: Record<string, any>;
  noBasicLayout?: boolean;
  
  // 框架内部使用
  requiresAuth?: boolean;
}

export interface UniAdminRouteRecord extends Omit<RouteRecordRaw, 'meta'> {
  meta: UniAdminRouteMeta;
  children?: UniAdminRouteRecord[];
}
```

**工具函数**:
```typescript
/** 将不同命名的权限字段统一转换为标准 access 字段 */
export function normalizeAuthority(meta: Record<string, any>): UniAdminRouteMeta['access'];
```

---

### 模块 3: 统一适配器 (`router/adapters/RouteAdapter.ts`)

**职责**: 屏蔽数据源差异，对外提供统一的 `fetchRoutes()` 接口

**类结构**:
```typescript
export class RouteAdapter {
  static async fetchRoutes(): Promise<RouteRecordRaw[]>;
}

class FrontendAdapter {
  static async fetch(): Promise<RouteRecordRaw[]>;
  // 实现: 调用 getModuleRoutes() 返回静态路由数组
}

class BackendAdapter {
  static async fetch(): Promise<RouteRecordRaw[]>;
  // 实现: 调用 getMenus() API → generateRoutes() 转换
  //        失败时开发环境降级到 FrontendAdapter
}

class MixedAdapter {
  static async fetch(): Promise<RouteRecordRaw[]>;
  // 实现: 加载静态 → 尝试动态 → 深度合并
}
```

**MixedAdapter 合并算法伪代码**:
```typescript
function mergeWithStrategy(baseRoutes, overrideRoutes): RouteRecordRaw[] {
  const overrideMap = new Map(overrideRoutes.map(r => [buildKey(r), r]));
  const result = [];
  const mergedKeys = new Set();

  for (const base of baseRoutes) {
    const key = buildKey(base);
    if (overrideMap.has(key)) {
      result.push(deepMerge(base, overrideMap.get(key)));  // 深度合并
      mergedKeys.add(key);
    } else {
      result.push(base);  // 无匹配，保留原样
    }
  }

  // 追加仅存在于动态路由的新路由
  for (const override of overrideRoutes) {
    if (!mergedKeys.has(buildKey(override))) {
      result.push(override);
    }
  }

  return result;
}

function deepMergeMeta(baseMeta, overrideMeta): Record<string, any> {
  const DYNAMIC_FIELDS = new Set(['access', 'authority', 'roles', 'title', 'icon', 'hidden']);
  const STATIC_FIELDS = new Set(['keepAlive', 'affix', 'order']);
  
  const merged = {};
  for (const key of allKeys) {
    if (DYNAMIC_FIELDS.has(key)) {
      merged[key] = overrideMeta[key] ?? baseMeta[key];  // 动态优先
    } else if (STATIC_FIELDS.has(key)) {
      merged[key] = baseMeta[key] ?? overrideMeta[key];  // 静态优先
    } else {
      merged[key] = overrideMeta[key] ?? baseMeta[key];  // 默认动态优先
    }
  }
  
  // 权限字段标准化
  if (merged.authority || merged.roles) {
    merged.access = normalizeAuthority(merged);
    delete merged.authority;
    delete merged.roles;
  }
  
  return merged;
}
```

---

### 模块 4: 双层缓存管理器 (`utils/cache/MenuCacheManager.ts`)

**职责**: 管理 L1 内存缓存和 L2 Storage 缓存的读写、失效和清理

**核心接口**:
```typescript
class MenuCacheManager {
  /** 初始化（版本校验） */
  initialize(): Promise<void>;
  
  /** 读取缓存（L1 → L2 → miss） */
  getMenu(): Promise<CacheResult<MenuDTO[]>>;
  // 返回: { status: 'hit', data, source: 'L1'|'L2' } 
  //    或: { status: 'miss', reason: 'expired'|'not_found'|'version_mismatch' }

  /** 写入缓存（L1 + L2 双写） */
  setMenu(data: MenuDTO[], source: string): Promise<void>;

  /** 清除所有缓存 */
  clearAll(): Promise<void>;

  /** 获取统计信息（调试用） */
  getStats(): { l1Size: number; version: string; lastCachedAt: number };
}
```

**内部数据结构**:
```typescript
interface CacheEntry<T> {
  data: T;              // 实际数据
  version: string;      // 应用版本号（用于失效）
  cachedAt: number;     // 写入时间戳
  expiresAt: number;    // 过期时间戳
}
```

**L1 命中条件** (全部满足):
1. `l1Cache !== null`
2. `l1Cache.version === appVersion` (版本匹配)
3. `Date.now() < l1Cache.expiresAt` (未过期)

**L2 命中条件** (全部满足):
1. Storage 中存在 key
2. 解析后的 entry.version === appVersion
3. `Date.now() < entry.expiresAt`

---

### 模块 5: 并发去重器 (`utils/concurrency/PromiseDeduplicator.ts`)

**职责**: 确保相同参数的异步请求只执行一次，避免竞态和资源浪费

**接口**:
```typescript
class PromiseDeduplicator<TResult> {
  /** 执行去重的异步函数 */
  execute(key: string, fn: () => Promise<TResult>, options?: { cacheTTL?: number }): Promise<TResult>;
  
  /** 取消指定 key 的请求 */
  cancel(key: string): boolean;
  
  /** 获取当前并发数 */
  getPendingCount(): number;
}
```

**使用示例**:
```typescript
const deduplicator = new PromiseDeduplicator<RouteRecordRaw[]>();

// 第一次调用：实际执行
const result1 = await deduplicator.execute('fetch-menus', () => fetchFromAPI());

// 第二次调用（在第一次完成前）：共享同一个 Promise
const result2 = await deduplicator.execute('fetch-menus', () => fetchFromAPI());
// result1 === result2 (同一个引用)

// 可选：5 秒内相同 key 直接返回上一次的结果（不重新执行）
```

---

### 模块 6: 悬停预加载器 (`utils/prefetch/HoverPrefetcher.ts`)

**职责**: 监听鼠标悬停事件，延迟触发目标路由组件的预加载

**接口**:
```typescript
class HoverPrefetcher {
  constructor(delay: number = 150);  // 默认 150ms 延迟
  
  /** 为 DOM 元素绑定悬停预加载事件 */
  bind(element: Element, routePath: string, loader: () => Promise<any>): void;
  
  /** 解绑事件 */
  unbind(element: Element): void;
  
  /** 销毁所有定时器和监听器 */
  destroy(): void;
}
```

**工作原理**:
```
用户鼠标进入菜单项
     │
     ▼ [mouseenter 事件触发]
     │
     ▼ 启动 150ms 定时器
     │
     ├─► [150ms 内鼠标离开] → 取消定时器 → 不预加载 ✅ (误触过滤)
     │
     └─► [150ms 后鼠标仍在元素上] → 执行 loader()
                                          │
                                          ▼
                                     调用 routePrefetcher.prefetch(key, loader)
                                          │
                                          ▼
                                     将结果缓存到 LRU Pool
                                     (下次点击该菜单时 < 50ms 即刻显示)
```

---

## 文件结构说明

### 新增文件清单（共 11 个）

```
apps/web/src/
├── config/
│   └── router.config.ts              (~60 行)   路由配置中心
│
├── router/
│   ├── routes/
│   │   ├── types.ts                   (~100 行)  扩展类型定义
│   │   ├── core/
│   │   │   └── index.ts               (~40 行)   核心路由 (404/403)
│   │   └── modules/
│   │       ├── _index.ts              (~80 行)   Vite glob 自动聚合器
│   │       ├── dashboard.ts           (~25 行)   示例：仪表盘模块
│   │       └── system.ts              (~70 行)   示例：系统管理模块
│   │
│   └── adapters/
│       └── RouteAdapter.ts            (~180 行)  三模式适配器 (含 Frontend/Backend/Mixed)
│
├── utils/
│   ├── cache/
│   │   └── MenuCacheManager.ts        (~220 行)  双层缓存管理器
│   │
│   ├── concurrency/
│   │   └── PromiseDeduplicator.ts     (~90 行)   Promise 去重器
│   │
│   └── prefetch/
│       └── HoverPrefetcher.ts        (~85 行)   悬停预加载器
│
└── .env.development                   (~8 行)    开发环境变量
.env.production                    (~8 行)    生产环境变量
```

**总代码量**: ~1,080 行（vs 原版复杂方案 ~2,500 行，减少 **57%**）

### 需要修改的现有文件（共 4 个）

| 文件 | 改动内容 | 影响范围 |
|------|---------|---------|
| `stores/menu.store.ts` | 集成适配器+缓存+去重器，改造 `fetchMenus()` | 核心逻辑重写 |
| `router/guards.ts` | 补全 Stage 3，调用新的 MenuStore | 新增 ~20 行 |
| `main.ts` | 初始化缓存系统 | 新增 ~10 行 |
| `vite.config.ts` | 可能调整 alias（如需） | 微调 |

---

## 关键算法详解

### 算法 1: Redirect 自动计算

**输入**: 父级路由配置（无 redirect 字段，有 children）

**输出**: 自动填充的 redirect 路径（指向第一个有效子路由）

**规则**:
1. 如果父路由已显式指定 `redirect` → 保留不变
2. 如果父路由有 `children` 但无 `redirect` → 查找第一个有效子路由
3. 有效子路由定义: 有 `component` 且未被 `hidden`（可选跳过）
4. 构建完整路径: `${parentPath}/${firstChildPath}`

**示例**:
```typescript
// 输入
{ path: '/system', children: [
  { path: 'user', component: UserPage },
  { path: 'role', component: RolePage },
]}

// 输出 (自动计算)
{ path: '/system', redirect: '/system/user', children: [...] }
```

**实现位置**: `RedirectCalculator.process(routes)` 在 FrontendAdapter 内部调用

---

### 算法 2: LRU 淘汰策略

**场景**: 预加载缓存池已达上限（10 个），需要为新条目腾出空间

**算法**:
```
evictIfNeeded():
  while (cachePool.size >= MAX_SIZE):
    oldestKey = accessOrder.shift()  // 取出最早访问的 key
    cachePool.delete(oldestKey)       // 从 Map 中移除
    console.log(`LRU 淘汰: ${oldestKey}`)
```

**访问记录更新**:
```
updateAccessRecord(key):
  # 从当前位置移除
  index = accessOrder.indexOf(key)
  if index > -1: accessOrder.splice(index, 1)
  
  # 添加到末尾（最新访问）
  accessOrder.push(key)
```

**时间复杂度**: O(1) 平均（Map 查找 + 数组操作）

---

### 算法 3: 版本化缓存失效

**触发时机**: 应用更新（构建版本号变化）

**检测逻辑**:
```typescript
initialize():
  storedVersion = storage.get('cache_version')
  currentVersion = import.meta.env.VITE_BUILD_VERSION
  
  if (storedVersion && storedVersion !== currentVersion):
    # 版本不匹配！清除所有旧缓存
    clearAll()
    
    # 更新版本号
    storage.set('cache_version', currentVersion)
```

**为什么不用时间戳而用版本号?**
- 时间戳可能因客户端时钟不准导致误判
- 版本号语义明确：每次构建自动递增（通过 CI/CD 注入）
- 支持灰度发布：不同版本的用户看到不同的缓存行为

---

## 与现有代码的集成点

### 集成点 1: guards.ts Stage 3 补全

**现状** (第 67-73 行):
```typescript
async function checkDynamicRoutes(): Promise<void> {
  // TODO: 后续实现动态路由懒加载逻辑
}
```

**改造后**:
```typescript
async function checkDynamicRoutes(router: Router): Promise<void> {
  if (isRoutesLoaded) return;
  
  try {
    const menuStore = useMenuStore();
    await menuStore.fetchMenus();  // 触发完整的获取流程（含缓存+适配器）
    isRoutesLoaded = true;
  } catch (error) {
    isRoutesLoaded = false;
    throw error;  // 向上抛出，由主守卫处理重定向
  }
}
```

**签名变更**: `setupRouterGuards()` 需要接收 `router` 参数以传递给 Stage 3

---

### 集成点 2: menu.store.ts 改造

**关键差异**:

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 数据来源 | 硬编码 `getMenus()` | 通过 RouteAdapter 动态选择 |
| 缓存支持 | ❌ 无 | ✅ L1 + L2 双层 |
| 并发控制 | ❌ 无 | ✅ PromiseDeduplicator |
| 错误处理 | 直接抛错 | 开发环境自动降级 |
| 返回类型 | `MenuDTO[]` | `RouteRecordRaw[]` |

**对外接口保持兼容**:
```typescript
const store = useMenuStore();
await store.fetchMenus();        // ✅ 签名不变
store.visibleMenus;              // ✅ getter 不变
store.toggleCollapse();          // ✅ 方法不变
```

---

### 集成点 3: main.ts 初始化

**新增代码** (~10 行):
```typescript
import { menuCacheManager } from './utils/cache/MenuCacheManager';

app.use(createPinia());  // Pinia 必须在缓存初始化前
app.use(router);

// 异步初始化缓存（不阻塞渲染）
menuCacheManager.initialize()
  .then(() => console.log('[Main] 缓存系统就绪'))
  .catch((err) => console.warn('[Main] 缓存初始化失败:', err));

app.mount('#app');
```

---

## 性能指标预期

### 缓存命中率目标

| 场景 | 当前耗时 | 优化后耗时 | 提升 |
|------|---------|-----------|------|
| F5 刷新（首次） | 300-500ms | 300-500ms（无变化） | - |
| F5 刷新（再次） | 300-500ms | **30-80ms (L2 命中)** | **~85% ↓** |
| 切换标签页（已访问过） | 100-300ms | **20-50ms (L1 命中)** | **~80% ↓** |
| 首次访问新页面 | 200-400ms | 200-400ms（无预加载） | - |
| 首次访问新页面（已悬停过） | 200-400ms | **20-50ms (预加载命中)** | **~90% ↓** |

### 网络请求减少

| 操作 | 当前请求数 | 优化后请求数 | 减少 |
|------|-----------|-----------|------|
| 登录后首页加载 | 1 次 (/menus) | 1 次（首次）/ 0 次（缓存生效后） | **50-100% ↓** |
| F5 刷新 | 1 次 | 0-1 次（取决于 L2 TTL） | **~90% ↓** |
| 快速连续点击菜单 5 次 | 5 次 | **1 次** (去重器) | **80% ↓** |

---

## 安全性考虑

### 1. 缓存数据安全

- **精简版默认关闭 AES-GCM 加密**（减少性能开销）
- 如需加密，可在 `MenuCacheManager.setMenu()` 中设置 `encrypt: true`
- 敏感数据（Token）已在 auth 层加密，菜单数据通常不含敏感信息

### 2. XSS 防护

- 缓存数据存储在 localStorage，理论上可被同源 XSS 脚本读取
- **缓解措施**:
  - 菜单数据不包含 Token 或密码等高敏感信息
  - 配置严格的 Content-Security-Policy (CSP)
  - 使用 HttpOnly Cookie 存储敏感信息（不在 Storage 中）

### 3. 权限绕过防护

- 即使 L2 缓存了旧菜单数据，路由守卫的 Stage 4（权限校验）仍会在每次导航时执行
- 重要操作前的二次校验（可选增强）
- 权限轮询机制确保最长 5 分钟内感知变更
