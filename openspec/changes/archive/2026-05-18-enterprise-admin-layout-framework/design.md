## Context

### 当前状态

uni-admin 是一个 pnpm monorepo 企业级管理后台项目，已完成：
- 登录页面（验证码/记住我/表单校验）
- Auth Store（login/logout/checkAuth）
- HTTP 封装层（自动 Token / 错误处理 / 请求取消 / 加载状态）
- 后端 NestJS + Prisma + MySQL + Redis + JWT 双 Token 认证

**前端当前缺陷**：`App.vue` 仅 `<router-view />`，路由表只有 3 个扁平路由，无 Layout 嵌套、无侧边栏、无顶栏、无标签页、无 404、无路由守卫逻辑、Storage 操作无统一封装。无法支撑后续业务模块开发。

### 技术约束

- 前端技术栈: Vue 3.4 + Element Plus 2.5 + Pinia + Vue Router 4.2 + TypeScript 5.3 + Vite 5
- 已有依赖: @vueuse/core ^14.3.0, @iconify/vue ^5.0.1, vee-validate ^4.15.1, zod ^4.4.3
- UI 风格: 现代简约风格，SCSS 变量体系已建立 (`_variables.scss`)
- 共享包: @uni-admin/request (HTTP 封装), @uni-admin/shared-types (Zod Schema)
- 构建工具: Vite 5 (支持 import.meta.glob 动态导入)

## Goals / Non-Goals

**Goals:**

1. 搭建完整的企业级后台主框架（Layout + Sidebar + Header + TagsView + Breadcrumb + AvatarDrawer）
2. 实现后端驱动的无限层级动态菜单系统
3. 实现中间件式路由守卫链（白名单 → Token → 动态路由 → 权限）
4. 实现生产级 Storage 封装（类型安全 + TTL + AES-GCM 加密 + 容量监控 + 命名空间 + 联动）
5. 实现 keep-alive Tag 标签页（关闭销毁，不持久化跨刷新）
6. 实现 404 兜底页面 + 面包屑导航
7. 实现桌面分辨率响应式适配（4 档断点）
8. 建立 views 目录规范（约定式组件映射）

**Non-Goals:**

1. 第三方登录（GitHub/GitLab/OAuth）— 后续迭代
2. 标签页跨刷新持久化 — 刷新后标签清空
3. 手机端专门适配 — 仅桌面分辨率响应
4. 国际化 i18n
5. 暗色模式切换 UI — 预留接口
6. 拖拽排序菜单/标签

## Decisions

### 决策 1: 路由嵌套结构 — 两层 Layout 模式

**选择**: `App.vue → BasicLayout.vue → Content Page`

**理由**:

| 方案 | 优点 | 缺点 |
|------|------|------|
| 单层路由 + 组件内判断 | 简单 | Login 页面也加载 Layout 代码，浪费 |
| **两层嵌套 (选择)** | Login 独立渲染，Layout 仅包裹需认证页面 | 多一层路由嵌套 |
| 路由 meta 控制显示隐藏 | 灵活 | 每个 Layout 子组件都要判断 meta |

**实现要点**:
- `App.vue` 使用 `<router-view />` 作为第一层出口
- 静态路由中 `/login` 直接指向 `Login.vue`
- 其余路径指向 `BasicLayout.vue`，其内部包含第二层 `<router-view />`
- 404 路由作为 BasicLayout 的子路由，确保 404 也有侧边栏顶栏

```
App.vue
├── /login          → views/login/index.vue        (独立，无Layout)
└── /*              → layouts/BasicLayout.vue       (主布局框架)
    ├── <Sidebar>   (固定可折叠侧边栏)
    ├── <Header>    (固定顶部栏)
    │   ├── <Breadcrumb>
    │   ├── <TagsView>
    │   └── <AvatarDrawer trigger>
    └── <router-view>                            (内容区出口)
        ├── /                    → views/dashboard/index.vue
        ├── /system/user         → views/system/user/index.vue
        ├── /system/role         → views/system/role/index.vue
        └── /:pathMatch(.*)*     → views/error/404.vue
```

---

### 决策 2: 动态路由方案 — 后端返回完整路由配置

**选择**: 后端接口返回完整菜单树，前端通过 component 字符串映射到真实组件，使用 `router.addRoute()` 动态注册

**数据结构约定**:

```typescript
// 后端返回的菜单项结构
interface MenuDTO {
  id: string;
  name: string;                    // 路由 name (唯一标识)
  path: string;                    // 路由路径 (相对于父级)
  component: string;               // 组件路径: 'system/user/index' 或特殊值 'Layout'
  redirect?: string;               // 父路由重定向
  meta: {
    title: string;                 // 菜单标题
    icon?: string;                 // Iconify 图标名: 'mdi:account-group'
    hidden?: boolean;              // 不在侧边栏显示
    affix?: boolean;               // 固定标签(不可关闭)
    noCache?: boolean;             // 不缓存(keep-alive exclude)
    externalLink?: string;         // 外部链接(新窗口打开)
    [key: string]: unknown;        // 扩展字段
  };
  sort: number;                    // 排序权重
  children?: MenuDTO[];            // 子菜单 (无限层级)
}
```

**Component 映射规则**:

```typescript
// 特殊组件值 → 硬编码映射
const COMPONENT_MAP: Record<string, Component> = {
  'Layout': () => import('@/layouts/BasicLayout.vue'),
};

// 常规组件值 → views 目录动态导入
// 'system/user/index' → import('@/views/system/user/index.vue')
function resolveComponent(componentStr: string): Component {
  if (COMPONENT_MAP[componentStr]) {
    return COMPONENT_MAP[componentStr];
  }
  // 使用 Vite 的 glob 动态导入 (生产环境预构建)
  const modules = import.meta.glob('@/views/**/index.vue');
  const key = `/src/views/${componentStr}.vue`;
  return modules[key] ?? NotFound;
}
```

**为什么不用前端骨架路由 + 后端过滤?**
- 后端返回完整配置更灵活，新增页面无需前端发版
- 符合 RBAC 权限模型：后端根据角色直接返回可见菜单树
- 权衡：需要维护 component 映射表，但 views 目录约定已标准化此映射

---

### 决策 3: Storage 封装 — 工厂模式 + 分层能力

**核心 API 设计**:

```typescript
class StorageFactory {
  /** 读取存储值，带类型约束和默认值兜底 */
  get<T>(key: string, options?: StorageGetOptions<T>): T;

  /** 写入存储值，自动 JSON 序列化 */
  set<T>(key: string, value: T, options?: StorageSetOptions): void;

  /** 移除单个键 */
  remove(key: string, options?: StorageBaseOptions): void;

  /** 判断键是否存在 */
  has(key: string, options?: StorageBaseOptions): boolean;

  /** 按命名空间批量清除 */
  clearNamespace(namespace: string): void;

  /** 清除全部 ua: 前缀的存储 */
  clearAll(): void;
}

interface StorageGetOptions<T> {
  defaultValue?: T;           // 默认值，避免 undefined 报错
  type?: 'local' | 'session'; // 默认 'local'
  namespace?: string;          // 默认 ''
}

interface StorageSetOptions extends StorageBaseOptions {
  ttl?: number;                // 过期时间 (毫秒)
}

interface StorageBaseOptions {
  type?: 'local' | 'session';
  namespace?: string;
  encrypt?: boolean;           // 是否 AES-GCM 加密
}
```

**内部实现层次**:

```
用户调用 storage.set('token', 'xxx', { encrypt: true, namespace: 'auth' })
    │
    ▼
┌─────────────────────────────────────┐
│  1. 前缀处理                         │
│     key → 'ua:auth:token'           │
├─────────────────────────────────────┤
│  2. 容量检查                         │
│     检查剩余空间 < 200KB? → warn     │
│     检查剩余空间 < 50KB? → 清理过期  │
│     仍不足? → throw                  │
├─────────────────────────────────────┤
│  3. 序列化                           │
│     value → JSON.stringify(value)    │
├─────────────────────────────────────┤
│  4. 加密 (可选)                      │
│     encrypt=true → AES-GCM 加密      │
│     密钥: 从设备指纹派生              │
├─────────────────────────────────────┤
│  5. TTL 处理                         │
│     有ttl → 额外写入 _exp 时间戳     │
├─────────────────────────────────────┤
│  6. 写入原生 API                     │
│     localStorage/sessionStorage.setItem│
└─────────────────────────────────────┘
```

**命名空间规划**:

| 命名空间 | 存储类型 | 内容 | 示例 Key |
|---------|---------|------|----------|
| `auth` | localStorage | Token (加密) | `ua:auth:token`, `ua:auth:_exp` |
| `user` | localStorage | 用户信息 | `ua:user:info` |
| `app` | localStorage | 应用偏好 | `ua:app:sidebarCollapsed`, `ua:app:theme` |
| `tags` | sessionStorage | 标签列表 | `ua:tags:list` |
| `cache` | sessionStorage | 临时查询缓存 | `ua:cache:query_xxx` |

---

### 决策 4: 加密方案 — Web Crypto API (AES-GCM)

**选择**: AES-256-GCM，使用浏览器原生 Web Crypto API

**密钥管理策略**:
- 基于 `crypto.subtle.digest('SHA-256', navigator.userAgent + origin)` 派生设备绑定密钥
- 密钥缓存在内存变量中（不持久化），页面关闭即丢失
- 可选: 支持从服务端获取加密密钥（更高安全场景）

**加解密流程**:
```
加密: plaintext → encoder.encode() → crypto.subtle.encrypt(AES-GCM, key, iv + data)
解密: ciphertext → crypto.subtle.decrypt(AES-GCM, key, data) → decoder.decode()
```

**为什么不选其他方案?**
- Base64: 不是加密，仅编码，防君子不防小人
- 自定义 XOR: 易被逆向，安全性不足
- AES-GCM: 浏览器原生零依赖，认证加密防篡改，性能优秀

---

### 决策 5: Tag 标签页 — keep-alive + route.name 作为 cacheKey

**选择**: 使用 `<keep-alive>` 包裹 `<router-view>`，用 `route.name` 作为 include/exclude 的 key

**关键设计点**:
- **cache key 用 `route.name` 不用 `route.path`**: 因为动态路由可能有参数变化（如 `/user/:id`），name 更稳定
- **打开标签**: 将 `{ name, path, title, query }` 加入 tags list (sessionStorage)，同时 name 加入 keep-alive include
- **切换标签**: `router.push({ name })`，keep-alive 自动恢复缓存实例
- **关闭标签**: 从 tags list 移除 → 从 keep-alive include 移除 → 下次访问重新渲染
- **固定标签 (affix)**: 如 Dashboard，不可关闭，始终在列表首位

**为什么不用 `<router-view v-slot>` 的 Component 方案?**
- `v-slot` 的 `<component :is="...">` 在动态路由场景下与 keep-alive 配合有已知 bug
- 直接用 `include` 字符串数组控制更可靠，Vue 官方推荐方式

---

### 决策 6: 路由守卫 — 四级中间件链

**执行顺序**:

```
router.beforeEach((to, from, next) => {
  │
  ├─► Stage 1: 白名单检查
  │     to.path 在 WHITE_LIST 中?
  │     YES → next() 放行
  │     NO  → 继续 Stage 2
  │
  ├─► Stage 2: Token 校验
  │     storage.get('token', { namespace: 'auth' })
  │     有Token → 继续 Stage 3
  │     无Token → next('/login') + 携带 redirect
  │
  ├─► Stage 3: 动态路由就绪检查
  │     isRoutesLoaded 标志位?
  │     YES → 继续 Stage 4
  │     NO  → await generateAndAddRoutes()
  │           → next({ ...to, replace: true }) 重新导航
  │
  └─► Stage 4: 权限校验
        to.matched 中有 requiresAuth 且无权限?
        YES → next('/403') 或显示无权限提示
        NO  → next() 放行
})
```

**白名单配置**:
```typescript
const WHITE_LIST = ['/login', '/404', '/403'];
```

**动态路由触发时机**:
- 首次登录成功后 → 调用菜单接口 → addRoute → 跳转首页
- 页面刷新后 → beforeEach 检测 isRoutesLoaded=false → 重新拉取菜单 → addRoute → 重新导航

---

### 决策 7: 响应式布局 — 4 档桌面断点

**断点定义** (复用已有 SCSS 变量):

| 断点 | 范围 | 侧边栏行为 | 顶栏行为 |
|------|------|-----------|---------|
| `xl` | ≥ 1200px | 完整展开 (240px) | 完整显示 |
| `lg` | 992–1199px | 可折叠为图标模式 (64px) | 完整显示 |
| `md` | 768–991px | 默认隐藏，汉堡按钮触发临时抽屉 | 简化显示 |
| `sm` | < 768px | 全屏覆盖式抽屉 | 最小化 |

**实现工具**: `@vueuse/core` 的 `useBreakpoints` (项目已依赖)

```typescript
import { useBreakpoints } from '@vueuse/core';

const breakpoints = useBreakpoints({
  sm: 768,
  md: 992,
  xl: 1200,
});

const isMobile = breakpoints.smaller('md');
const isTablet = breakpoints.between('md', 'xl');
const isDesktop = breakpoints.greater('xl');
```

---

### 决策 8: views 目录规范 — 约定式映射

**目录结构**:
```
views/
├── dashboard/
│   └── index.vue              # 映射: "dashboard"
├── login/
│   └── index.vue              # 静态路由，不走动态
├── system/
│   ├── user/
│   │   └── index.vue          # 映射: "system/user"
│   │   └── components/        # 模块私有子组件
│   │       ├── UserForm.vue
│   │       └── UserTable.vue
│   ├── role/
│   │   └── index.vue          # 映射: "system/role"
│   └── menu/
│       └── index.vue          # 映射: "system/menu"
├── monitor/
│   ├── online/
│   │   └── index.vue          # 映射: "monitor/online"
│   └── log/
│       └── index.vue          # 映射: "monitor/log"
├── error/
│   ├── 404.vue                # 特殊路由，硬编码
│   └── 403.vue                # 特殊路由，硬编码
└── profile/
    └── index.vue              # 个人中心 (头像抽屉内嵌)
```

**映射规则**:
1. 后端 `component` 字段值 = `views/` 下的相对路径 (不含扩展名)
2. 例如 `"system/user/index"` → `@/views/system/user/index.vue`
3. 每个功能模块必须有自己的目录
4. 入口文件统一命名为 `index.vue`
5. 模块内部的私有子组件放在 `components/` 子目录
6. 特殊组件 (Layout, Login, 404, 403) 不参与动态映射，硬编码处理

---

## Risks / Trade-offs

### 风险 1: 动态路由首次加载白屏

**问题**: 用户登录成功或刷新页面后，路由守卫检测到动态路由未加载，需要先请求菜单接口再 `addRoute()`，此期间页面可能空白或闪烁。

**缓解措施**:
- 设置全局 `isRouteLoading` 状态标志位，BasicLayout 在加载中显示 **Loading 骨架屏**
- 骨架屏复用 Element Plus 的 `el-skeleton` 组件，模拟侧边栏+顶栏+内容区轮廓
- 菜单接口响应增加 Cache-Control 或前端内存缓存（同一会话内不重复请求）
- `addRoute()` 完成后使用 `next({ ...to, replace: true })` 重新导航，确保组件正确渲染

**兜底方案**: 如果菜单接口超时 (>3s)，显示错误提示并提供"重试"按钮。

---

### 风险 2: AES-GCM 密钥管理安全性

**问题**: 密钥如果存储在 localStorage 中可被提取；如果纯内存存储则每次刷新页面都需要重新派生。

**缓解措施**:
- **密钥不在任何 Storage 中持久化**，仅在 JavaScript 内存变量中持有
- 页面刷新后自动从 `navigator.userAgent + origin` 重新派生（同浏览器同域名下结果一致）
- 密钥派生使用 `PBKDF2` 增加暴力破解成本（迭代 100000 次）
- 提供 `storage.regenerateKey()` 方法供紧急场景手动轮换
- 敏感数据范围明确: 仅 `auth` 命名空间的 token 类数据启用加密

**权衡**: 对于管理后台场景，XSS 攻击是更大威胁（一旦 XSS 拿到内存数据，加密也无效）。因此加密主要防御的是：
- 防止存储明文 Token 被第三方浏览器插件/脚本扫描
- 防止开发者工具 Application 面板直接看到明文
- 配合 Content-Security-Policy 降低 XSS 风险

---

### 风险 3: keep-alive 与动态路由冲突

**问题**: 动态路由使用 `addRoute()` 注册后，keep-alive 的 `include` 数组中的 route.name 可能与新注册的路由不一致，导致缓存失效或缓存了错误的组件。

**缓解措施**:
- **强制要求后端返回的每个菜单项都有唯一的 `name` 字段**，且 name 格式为 PascalCase（如 `UserManagement`）
- keep-alive 的 `include` 使用 **精确匹配** route.name 字符串，不用正则
- 动态路由注册时做 name **去重校验**，重复 name 抛出警告
- TagsView Store 维护的 tag list 和 keep-alive include 列表保持 **单向数据流**: Store → include
- 关闭标签时同步操作: 从 store.tags 移除 → 触发 computed include 更新 → keep-alive 自动销毁对应缓存

**额外防护**: 在 `onBeforeUnmount` 中清理可能的副作用（取消未完成的请求、清除定时器等），防止 keep-alived 组件泄漏。

---

### 风险 4: Storage 5MB 限制

**问题**: localStorage 和 sessionStorage 各有约 5MB 限制（因浏览器而异）。大量菜单数据、用户信息、标签列表等累积后可能超限。

**缓解措施**:
- 每次 `set` 操作前调用以下检查逻辑:
  ```
  1. 计算 newSerializedValue.length
  2. 尝试 JSON.stringify(整个 storage) → 检测总大小
  3. 剩余空间 = 5MB (5242880 bytes) - currentTotalSize
  4. 剩余 < 200KB → console.warn('[Storage] 容量预警，剩余空间不足')
  5. 剩余 < 50KB → 自动清理所有 _exp 过期的条目
  6. 清理后仍不足 → 抛出 QuotaExceededError，调用方决定降级策略
  ```
- **TTL 条目自动过期**: 每次 `get` 时检查 `_exp`，过期的返回 defaultValue 并异步删除
- **命名空间隔离的好处**: `clearNamespace('cache')` 可以一键清理临时缓存释放空间
- **大体积数据不存 Storage**: 菜单树数据存在 Pinia Store 内存中（memoryOnly），不持久化到 Storage

---

### 风险 5: 侧边栏折叠动画与内容区宽度过渡冲突

**问题**: 侧边栏从 240px 折叠到 64px 时，如果内容区宽度使用 CSS transition，可能出现布局抖动或重排。

**缓解措施**:
- 侧边栏使用 `width` + `transition: width 0.3s ease` 动画
- 内容区 **不使用 transition**，而是立即适应新宽度（`flex: 1` 自动填充）
- 使用 CSS `will-change: width` 提示浏览器优化
- 表格类组件内部监听 `resize` 事件重新计算列宽（Element Plus Table 已内置支持）

---

### 风险 6: 多标签页间状态隔离

**问题**: 同一组件（如 UserManagement）在不同标签页打开时，如果共享 keep-alive 缓存，切换标签会导致状态混乱（如表单填写了一半切走再切回来应该保留，但两个标签应该是独立实例）。

**缓解措施**:
- **当前决策: 不支持同一页面的多实例标签**。如果用户再次点击已在标签列表中的菜单项，直接切换到已有标签而不是新建。
- 这符合大多数管理后台的使用习惯（不会同时打开两个用户管理页面）
- 如果未来需要多实例，可升级方案: 使用 `route.fullPath + query` 作为 cache key 的后缀来区分实例

---

## Migration Plan

### 部署步骤

#### 阶段 1: 基础设施层（无 UI 变更）

1. 创建 `utils/storage.ts` — Storage 封装层（纯工具函数，不影响现有代码）
2. 创建 `router/guards.ts` — 路由守卫（此时仅添加白名单和 Token 检查基础逻辑）
3. 修改 `stores/auth.store.ts` — 联动 Storage 层读写 Token（向后兼容，Store 内存仍有副本）

#### 阶段 2: 布局框架（UI 变更开始）

4. 创建 `layouts/BasicLayout.vue` 及子组件目录
5. 实现 Sidebar 组件（静态菜单硬编码先行，验证布局效果）
6. 实现 Header 组件（面包屑 + 占位区域）
7. 重构 `App.vue` 和 `router/index.ts` — 引入嵌套路由结构
8. 创建 `views/error/404.vue` — 404 兜底页面

#### 阶段 3: 动态化

9. 创建 `router/generateRoutes.ts` — 动态路由生成器
10. 创建 `stores/menu.store.ts` — 菜单状态管理
11. 实现 TagsView 标签页组件 + `stores/tags.store.ts`
12. 实现 AvatarDrawer 抽屉组件 + `views/profile/index.vue`
13. 路由守卫接入动态路由加载逻辑
14. Sidebar 改为从 menu.store 读取动态数据

#### 阶段 4: 打磨

15. 响应式断点适配
16. Storage 容量监控 + 过期清理测试
17. 全链路联调测试（登录 → Layout → 菜单 → 切换标签 → 退出 → 重登）

### 回滚策略

每个阶段完成后打 git tag，出现问题可按阶段回退:
- 回退到阶段 1: 删除 layouts/, 恢复原始 App.vue 和 router
- 回退到阶段 2: 保留 Storage 封装但移除 Layout 组件
- 回退到阶段 3: 恢复静态菜单，移除动态路由逻辑

## Open Questions

1. **后端菜单接口的具体路径和权限要求待确认**: 是 `GET /system/menus` 还是 `GET /auth/menus`？是否需要特定角色才能访问？
2. **登录后的默认跳转路径**: 是固定跳转 `/dashboard` 还是取后端返回的第一个有效菜单 path？需要在登录接口响应中增加 `defaultRoute` 字段吗？
3. **图标库统一**: 后端返回的 icon 字段格式是否统一为 Iconify 的 `mdi:` 前缀格式？还是支持自定义 SVG 组件？
