# 智能路由系统改造 - 实施任务清单

> **Change**: smart-router-system  
> **状态**: planning → in-progress → completed  
> **预计工期**: 3-5 天

---

## Phase 1: 基础设施层（0.5 天）

**目标**: 建立配置体系、类型系统和静态路由文件结构，不影响现有功能

### 1.1 创建路由配置中心

- [ ] **1.1.1** 创建 `src/config/router.config.ts`
  - 定义 `RouterMode` 类型别名 (`'frontend' | 'backend' | 'mixed'`)
  - 定义 `RouterConfig` 接口（mode, cacheEnabled, cacheTTL, prefetchEnabled, hoverDelay, maxPrefetchCache）
  - 实现 `validateConfig()` 函数：
    - 读取 `import.meta.env.VITE_ROUTER_MODE`
    - 校验是否为合法值（不在白名单时降级为 `'backend'` 并输出警告）
    - 解析布尔值和数值型环境变量（带默认值兜底）
  - 导出只读单例 `routerConfig: Readonly<RouterConfig>`
  - **验证**: `pnpm dev` 启动后控制台输出正确的 mode 和 cacheEnabled 值

### 1.2 创建环境变量文件

- [ ] **1.2.1** 创建 `apps/web/.env.development`
  ```
  VITE_ROUTER_MODE=frontend
  VITE_MENU_CACHE=false
  VITE_HOVER_DELAY=150
  ```

- [ ] **1.2.2** 创建 `apps/web/.env.production`
  ```
  VITE_ROUTER_MODE=backend
  VITE_MENU_CACHE=true
  VITE_MENU_CACHE_TTL=1800000
  VITE_HOVER_DELAY=150
  ```
  - **验证**: 修改 `.env.development` 的 `VITE_ROUTER_MODE` 为 `backend`，重启 dev server 后控制台输出变化

### 1.3 定义扩展类型系统

- [ ] **1.3.1** 创建 `src/router/routes/types.ts`
  - 导出 `UniAdminRouteMeta` 接口（包含所有 meta 字段定义）
  - 导出 `UniAdminRouteRecord` 接口（扩展 RouteRecordRaw）
  - 实现 `normalizeAuthority()` 工具函数：
    - 输入: `Record<string, any>` (原始 meta 对象)
    - 逻辑: 按 `access` > `authority` > `roles` 优先级查找
    - 输出: 标准化的 `string | string[] | undefined`
  - **验证**: TypeScript 类型检查通过 (`pnpm typecheck`)
  - **验证**: 可在组件中使用 `UniAdminRouteMeta` 类型标注 route.meta

### 1.4 创建核心路由定义

- [ ] **1.4.1** 创建 `src/router/routes/core/index.ts`
  - 定义 `coreRoutes: UniAdminRouteRecord[]`
  - 包含:
    - `/403` → `views/error/403.vue` (meta: { title: '无权限', hidden: true, requiresAuth: false })
    - `/:pathMatch(.*)*` → `views/error/404.vue` (meta: { title: '页面不存在', hidden: true })
  - 导出默认
  - **验证**: 访问 `/403` 和任意不存在的路径能正确显示错误页面

### 1.5 创建自动聚合器

- [ ] **1.5.1** 创建 `src/router/routes/modules/_index.ts`
  - 使用 `import.meta.glob('./modules/*.ts', { eager: true })` 动态导入
  - 实现 `collectModuleRoutes()` 函数：
    - 遍历所有导入的模块
    - 过滤出 `default` 导出且为数组的模块
    - 扁平化合并为一个 `UniAdminRouteRecord[]`
  - 实现 `getModuleRoutes()` 带缓存版本（避免重复计算）
  - 实现 `resetModuleCache()` （HMR 热更新时调用）
  - 开发环境下监听 `import.meta.hot.accept` 自动重置缓存
  - **验证**: 在 modules 目录下创建测试文件，重启 dev server 后控制台输出 "已收集 N 个业务路由"

### 1.6 创建示例业务路由

- [ ] **1.6.1** 创建 `src/router/routes/modules/dashboard.ts`
  ```typescript
  export const dashboardRoutes: UniAdminRouteRecord[] = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index.vue'),
      meta: { title: '仪表盘', icon: 'mdi:view-dashboard', affix: true, order: 0, keepAlive: true },
    },
  ];
  ```

- [ ] **1.6.2** 创建 `src/router/routes/modules/system.ts`
  ```typescript
  export const systemRoutes: UniAdminRouteRecord[] = [
    {
      path: '/system',
      name: 'System',
      redirect: '/system/user',  // 可选：手动指定或由 RedirectCalculator 自动计算
      meta: { title: '系统管理', icon: 'mdi:cog-outline', order: 10, access: ['admin'] },
      children: [
        {
          path: 'user',
          name: 'UserManagement',
          component: () => import('@/views/system/user/index.vue'),
          meta: { title: '用户管理', icon: 'mdi:account-group', access: ['admin', 'user:list'], keepAlive: true, order: 1 },
        },
        {
          path: 'role',
          name: 'RoleManagement',
          component: () => import('@/views/system/role/index.vue'),
          meta: { title: '角色管理', icon: 'mdi:shield-account', access: ['admin'], order: 2 },
        },
      ],
    },
  ];
  ```
  - **验证**: 设置 `VITE_ROUTER_MODE=frontend` 时侧边栏能看到"仪表盘"和"系统管理"菜单

---

## Phase 1 验收标准 ☑️

- [ ] 所有新文件 TypeScript 编译无报错
- [ ] `pnpm dev` 正常启动，无运行时错误
- [ ] 现有功能完全正常（登录、菜单显示、路由跳转）
- [ ] 控制台输出: `[Main] 路由模式: frontend` 和 `[RouteModules] 已收集 X 个业务路由`

---

## Phase 2: 适配器与缓存系统（1 天）

**目标**: 实现多源路由适配器、双层缓存、并发去重，改造 MenuStore 和 Guards

### 2.1 实现统一路由适配器

- [ ] **2.1.1** 创建 `src/router/adapters/RouteAdapter.ts`
  - 导出 `RouteAdapter` 类（主入口）
  - 实现 `static async fetchRoutes(): Promise<RouteRecordRaw[]>`
    - 根据 `routerConfig.mode` 分发到不同 Adapter
  
  - **FrontendAdapter** (~30 行):
    - 调用 `getModuleRoutes()` 返回静态路由
    - console.log 标记 `[RouteAdapter] 使用前端静态路由`
  
  - **BackendAdapter** (~40 行):
    - 调用 `getMenus()` API 获取 MenuDTO[]
    - 调用现有的 `generateRoutes()` 转换为 RouteRecordRaw[]
    - try-catch 包裹：失败时检查 `import.meta.env.DEV`
      - 开发环境: console.warn + 降级到 FrontendAdapter.fetch()
      - 生产环境: throw error (向上抛出)
  
  - **MixedAdapter** (~80 行):
    - 先调用 FrontendAdapter 获取 baseRoutes
    - try BackendAdapter 获取 overrideRoutes (失败时仅用 baseRoutes)
    - 调用私有方法 `mergeWithStrategy(baseRoutes, overrideRoutes)`
    - 实现 `buildRouteKey(route)`: 优先使用 `name`，其次 `path`
    - 实现 `deepMergeRoute(base, override)`: 递归合并路由和 children
    - 实现 `deepMergeMeta(baseMeta, overrideMeta)`: 字段级优先级策略
      - DYNAMIC_FIELDS (access/authority/roles/title/icon/hidden) → 动态优先
      - STATIC_FIELDS (keepAlive/affix/order) → 静态优先
      - 其他字段 → 动态优先
      - 权限字段标准化: 统一转换为 `access`
  - **验证**: 分别设置三种模式启动项目，均能正常加载菜单

### 2.2 实现双层缓存管理器

- [ ] **2.2.1** 创建 `src/utils/cache/MenuCacheManager.ts`
  - 定义常量: `CACHE_KEY = 'menu_data'`, `VERSION_KEY = 'cache_version'`
  - 定义内部接口 `CacheEntry<T>` (data, version, cachedAt, expiresAt)
  - 定义公开接口 `CacheResult<T>` (hit/miss + source/reason)
  
  - **构造函数**:
    - 读取 `import.meta.env.VITE_BUILD_VERSION` 作为 appVersion
    - 初始化 l1Cache = null
  
  - **initialize()**:
    - 从 storage 读取 storedVersion
    - 版本不匹配时调用 clearAll()
    - 无版本时写入当前版本
  
  - **async getMenu()**:
    - 检查 L1: isL1Valid() → { hit, L1 }
    - 检查 L2: readFromL2() → 回填 L1 → { hit, L2 }
    - 都未命中 → { miss, reason }
  
  - **isL1Valid()** 私有方法:
    - l1Cache 存在?
    - version 匹配?
    - 未过期?
  
  - **readFromL2()** 私有方法:
    - storage.get(CACHE_KEY, { namespace: 'router' })
    - version 校验
    - expiresAt 校验
    - 错误处理 (catch → return null)
  
  - **setMenu(data, source)**:
    - 构建 CacheEntry (data, version, now, now+TTL)
    - 写入 L1 (同步)
    - 写入 L2 (异步, storage.set 带 ttl 和可选 encrypt)
    - 成功/失败日志
  
  - **clearAll()**:
    - 清除 l1Cache
    - storage.remove(CACHE_KEY)
  
  - **getStats()** (调试用):
    - 返回 { l1Size, version, lastCachedAt }
  - **导出单例**: `export const menuCacheManager = new MenuCacheManager()`
  - **验证**: 
    - 写入后立即读取应返回 hit (L1)
    - 等待 TTL 后读取应返回 miss
    - 手动修改 BUILD_VERSION 后 initialize 应清除旧缓存

### 2.3 实现并发去重器

- [ ] **2.3.1** 创建 `src/utils/concurrency/PromiseDeduplicator.ts`
  - 泛型类 `PromiseDeduplicator<TResult>`
  - 私有属性 `pendingRequests = new Map<string, Promise<TResult>>()`
  
  - **execute(key, fn, options?)**:
    - 检查 pendingRequests.has(key)
      - 有: console.log + 返回已有的 Promise (复用)
      - 无: 创建新的 Promise
        - promise = fn().finally(() => map.delete(key))
        - map.set(key, promise)
        - 返回 promise
    - 可选: options.cacheTTL (N ms 内相同 key 直接返回上次结果，无需重新执行)
  
  - **cancel(key)**: map.delete(key) → boolean
  - **getPendingCount()**: map.size
  - **导出菜单专用实例**: `export const menuFetchDeduplicator = new PromiseDeduplicator<RouteRecordRaw[]>()`
  - **验证**: 快速连续调用 execute('test', asyncFn) 5 次，asyncFn 只执行 1 次

### 2.4 改造 MenuStore

- [ ] **2.4.1** 重构 `src/stores/menu.store.ts`
  - 新增 state 属性:
    - `isLoading: boolean` (默认 false)
    - `lastError: Error | null`
    - `cacheStatus: 'fresh' | 'stale' | 'error'`
  
  - **重写 fetchMenus()**:
    - if (this.isLoading) return (防并发)
    - if (this.isLoaded && this.routes.length > 0 && this.cacheStatus === 'fresh') return (已有效数据)
    
    - this.isLoading = true
    
    - try:
      - 缓存检查: routerConfig.cacheEnabled ? menuCacheManager.getMenu() : miss
      - if (hit):
        - this.routes = result.data
        - if (!this.isLoaded): await setupDynamicRoutes(router, result.data)
        - this.cacheStatus = result.source === 'L1' ? 'fresh' : 'stale'
        - 触发后台静默刷新 (triggerBackgroundRefresh)
      
      - else (miss 或缓存未启用):
        - 调用 doFetchFromNetwork()
    
    - catch (error):
      - this.lastError = error
      - this.cacheStatus = 'error'
      - ElMessage.error(error.message)
      - throw error
    
    - finally:
      - this.isLoading = false
  
  - **新增 private doFetchFromNetwork()**:
    - const routes = await RouteAdapter.fetchRoutes()
    - this.routes = routes
    - if (cacheEnabled) await menuCacheManager.setMenu(routes, mode)
    - await setupDynamicRoutes(router, routes)
    - this.isLoaded = true
    - this.cacheStatus = 'fresh'
  
  - **新增 forceRefresh()**:
    - this.isLoaded = false
    - this.cacheStatus = 'error'
    - await this.fetchMenus()
  
  - **改造 resetMenuState()**:
    - 清除缓存 (menuCacheManager.clearAll())
    - 重置所有状态为初始值
  
  - **保留原有方法不变**:
    - visibleMenus getter (filterHidden)
    - toggleCollapse / setCollapse / collapsed getter
  - **验证**: 
    - 三种模式下 fetchMenus 都能正常工作
    - 连续快速调用不触发重复请求
    - F5 刷新后从 L2 恢复 < 100ms

### 2.5 补全路由守卫 Stage 3

- [ ] **2.5.1** 修改 `src/router/guards.ts`
  - 新增 import: `useMenuStore` from '@/stores/menu.store'
  - 改造 `checkDynamicRoutes()` 签名: 增加 `router: Router` 参数
  - 实现完整逻辑:
    - if (isRoutesLoaded) return
    - console.log('[Router Guard] 首次检测到需要动态路由...')
    - try:
      - const menuStore = useMenuStore()
      - await menuStore.fetchMenus()  // 触发完整流程
      - isRoutesLoaded = true
      - console.log('[Router Guard] ✅ 动态路由加载完成')
    - catch (error):
      - isRoutesLoaded = false
      - console.error('[Router Guard] ❌ 动态路由加载失败:', error)
      - throw error  // 向上抛出
  
  - 改造 `setupRouterGuards()` 签名: 增加 `router: Router` 参数
  - Stage 3 调用处改为: `await checkDynamicRoutes(router)`
  - **验证**: 首次访问受保护页面时控制台看到完整的加载日志链

### 2.6 初始化集成

- [ ] **2.6.1** 修改 `src/main.ts`
  - 新增 import: `menuCacheManager`
  - 在 `app.use(createPinia())` 之后、`app.mount('#app')` 之前:
    ```typescript
    menuCacheManager.initialize()
      .then(() => console.log('[Main] 缓存系统就绪'))
      .catch((err) => console.warn('[Main] 缓存初始化失败:', err))
    ```
  - 可选: 开发环境输出诊断信息
    ```typescript
    if (import.meta.env.DEV) {
      console.log(`[Main] 路由模式: ${import.meta.env.VITE_ROUTER_MODE}`);
      console.log(`[Main] 缓存启用: ${import.meta.env.VITE_MENU_CACHE}`);
    }
    ```
  - **验证**: 应用启动后控制台输出 "[Main] 缓存系统就绪"

---

## Phase 2 验收标准 ☑️

- [ ] `VITE_ROUTER_MODE=frontend` 能加载静态菜单并正常跳转
- [ ] `VITE_ROUTER_MODE=backend` 行为与改造前一致（回归测试通过）
- [ ] `VITE_ROUTER_MODE=mixed` 能合并静态和动态路由（权限字段以动态为准）
- [ ] F5 刷新页面后菜单恢复时间 < 100ms (L2 命中)
- [ ] 连续快速点击菜单 10 次，网络请求仅 1 次 (去重器生效)
- [ ] 控制台无新增 Error 或 Warning（预期的日志除外）

---

## Phase 3: 预加载与增强功能（0.5 天）

**目标**: 实现悬停预加载和网络感知降级

### 3.1 实现悬停预加载器

- [ ] **3.1.1** 创建 `src/utils/prefetch/HoverPrefetcher.ts`
  - 构造函数接收 delay 参数（默认 150ms，从 routerConfig.hoverDelay 读取）
  - 私有属性 `timers = new Map<Element, setTimeout>()`
  
  - **bind(element, routePath, loader)**:
    - element.addEventListener('mouseenter', () => startTimer(element, routePath, loader))
    - element.addEventListener('mouseleave', () => cancelTimer(element))
  
  - **startTimer(element, routePath, loader)**:
    - cancelTimer(element)  // 先清除已有定时器（防抖）
    - timer = setTimeout(() => {
      console.log(`[HoverPrefetch] 预加载: ${routePath}`)
      loader().catch(err => console.warn(err))
    }, this.delay)
    - timers.set(element, timer)
  
  - **cancelTimer(element)**:
    - timer = timers.get(element)
    - if (timer) clearTimeout(timer); timers.delete(element)
  
  - **unbind(element)**: cancelTimer + removeEventListener
  - **destroy()**: 遍历 timers 全部 clearTimeout + clear()
  - **导出单例**: `export const hoverPrefetcher = new HoverPrefetcher(routerConfig.hoverDelay)`
  - **验证**: 鼠标悬停菜单项 150ms 后 Network 面板出现新的 chunk 请求

### 3.2 集成预加载到 Sidebar

- [ ] **3.2.1** 修改 `src/layouts/components/Sidebar/index.vue`
  - onMounted 生命周期:
    - 初始化 hoverPrefetcher（如果尚未初始化）
    - nextTick 后调用 bindPrefetchEvents()
  
  - **bindPrefetchEvents()** 新方法:
    - querySelectorAll('.el-menu-item[data-path]')
    - 遍历每个菜单项:
      - 读取 data-path 属性
      - router.resolve(path) 获取 matched route
      - 提取 component (matched[matched.length-1].components?.default)
      - 如果 component 是函数: hoverPrefetcher.bind(item, path, component)
  
  - onUnmounted: hoverPrefetcher.destroy()
  - **验证**: 打开 DevTools Network 面板，悬停"用户管理"后出现对应的 .vue chunk 请求

### 3.3 (可选) 网络状态感知

- [ ] **3.3.1** 创建简易的网络检测工具 `src/utils/network/NetworkHelper.ts`
  - 基于 `navigator.onLine` + `connection.effectiveType`
  - 提供 `getStatus(): { online: boolean, quality: '4g'|'3g'|'2g'|'offline' }`
  - 提供 `onChange(callback)` 监听 online/offline 事件
  - **验证**: 断开网络后 getStatus().online === false

---

## Phase 3 验收标准 ☑️

- [ ] 悬停菜单项 150ms 后触发预加载请求
- [ ] 点击已预加载的菜单项页面即时显示 (< 50ms)
- [ ] 鼠标快速滑过（不停留）不触发预加载（误触过滤生效）
- [ ] 预加载失败时不影响正常点击导航

---

## Phase 4: 测试与文档（0.5-1 天）

**目标**: 确保代码质量和可维护性

### 4.1 单元测试

- [ ] **4.1.1** 创建 `__tests__/cache/MenuCacheManager.test.ts`
  - **L1 内存缓存测试**:
    - ✅ 写入后立即读取应命中 (source: 'L1')
    - ✅ TTL 过期后应返回 miss (reason: 'expired')
    - ✅ 版本不匹配时应失效
    - ✅ 并发写入不应抛错
  
  - **L2 Storage 缓存测试**:
    - ✅ L1 未命中时应尝试 L2
    - ✅ L2 命中应回填 L1 (source: 'L2')
    - ✅ L2 版本不匹配应清除并返回 miss
    - ✅ Storage 读取失败应返回 miss (不抛错)

- [ ] **4.1.2** 创建 `__tests__/adapters/RouteAdapter.test.ts`
  - **backend 模式测试**:
    - ✅ 应调用 getMenus API
    - ✅ 应调用 generateRoutes 转换
    - ✅ API 失败时生产环境应抛错
    - ✅ API 失败时开发环境应降级到 frontend
  
  - **mixed 模式测试**:
    - ✅ 相同路径应执行深度合并
    - ✅ 权限字段应以动态为准
    - ✅ 仅存在于动态的新路由应追加

- [ ] **4.1.3** 创建 `__tests__/concurrency/PromiseDeduplicator.test.ts`
  - ✅ 相同 key 并发调用应只执行一次
  - ✅ 不同 key 应独立执行
  - ✅ 完成 (resolve/reject) 后应自动清理 Map 条目
  - ✅ cancel() 应阻止未开始的请求

- [ ] **运行测试**: `pnpm vitest run --reporter=verbose`
  - **验收**: 所有用例通过，覆盖率 > 80%（核心模块）

### 4.2 关键代码注释

- [ ] **4.2.1** 为以下关键函数添加中文注释（每行超过 20 行时必须注释）:
  - [ ] `RouteAdapter.fetchRoutes()` — 解释三种模式的分发逻辑
  - [ ] `MixedAdapter.mergeWithStrategy()` — 解释合并算法的核心思路
  - [ ] `MenuCacheManager.getMenu()` — 解释 L1 → L2 → miss 的查找顺序
  - [ ] `HoverPrefetcher.startTimer()` — 解释 150ms 延迟的设计理由
  - [ ] `PromiseDeduplicator.execute()` — 解释如何实现去重

### 4.3 类型检查与 Lint

- [ ] **4.3.1** 运行完整类型检查: `pnpm --filter @uni-admin/web typecheck`
  - **验收**: 无新增 TypeErrors 或 warnings

- [ ] **4.3.2** 运行 ESLint: `pnpm --filter @uni-admin/web lint`
  - **验收**: 无新增 errors 或 warnings（忽略已有的格式问题）

---

## Phase 4 验收标准 ☑️

- [ ] 单元测试全部通过 (`pnpm vitest run`)
- [ ] TypeScript 类型检查通过 (`pnpm typecheck`)
- [ ] ESLint 检查通过 (`pnpm lint`)
- [ ] 关键算法有清晰的中文注释
- [ ] 代码符合现有项目的编码规范（参考 enterprise-admin-layout-framework 的代码风格）

---

## 最终交付物清单

### 新增文件 (11 个)

| 文件路径 | 行数估算 | 职责 |
|---------|---------|------|
| `config/router.config.ts` | ~60 | 配置中心 |
| `router/routes/types.ts` | ~100 | 类型定义 |
| `router/routes/core/index.ts` | ~40 | 核心路由 |
| `router/routes/modules/_index.ts` | ~80 | 自动聚合 |
| `router/routes/modules/dashboard.ts` | ~25 | 示例路由 |
| `router/routes/modules/system.ts` | ~70 | 示例路由 |
| `router/adapters/RouteAdapter.ts` | ~180 | 三模式适配器 |
| `utils/cache/MenuCacheManager.ts` | ~220 | 双层缓存 |
| `utils/concurrency/PromiseDeduplicator.ts` | ~90 | 并发去重 |
| `utils/prefetch/HoverPrefetcher.ts` | ~85 | 悬停预加载 |
| `.env.development` + `.env.production` | ~16 | 环境变量 |

**总计**: ~1,086 行代码

### 修改文件 (4 个)

| 文件路径 | 改动量 | 说明 |
|---------|-------|------|
| `stores/menu.store.ts` | 重写核心逻辑 | 集成适配器+缓存+去重 |
| `router/guards.ts` | 补全 Stage 3 | ~20 行新增 |
| `main.ts` | 初始化缓存 | ~10 行新增 |
| `layouts/Sidebar/index.vue` | 绑定预加载事件 | ~25 行新增 |

### 测试文件 (3+ 个)

| 文件路径 | 覆盖范围 |
|---------|---------|
| `__tests__/cache/MenuCacheManager.test.ts` | L1/L2 命中、TTL、版本、并发 |
| `__tests__/adapters/RouteAdapter.test.ts` | 三模式切换、混合合并 |
| `__tests__/concurrency/PromiseDeduplicator.test.ts` | 去重、并发、错误 |

---

## 回滚预案

如果某个阶段引入严重 Bug：

```bash
# 查看最近的 git tags
git tag -l "v1.0.0-router-*"

# 回滚到阶段 1 完成（仅基础设施）
git reset --hard v1.0.0-router-phase1

# 或仅回退特定文件（保留其他阶段的改动）
git checkout phase1-start -- src/stores/menu.store.ts src/router/guards.ts
```

**紧急特性开关** (在 `router.config.ts` 中预留):
```typescript
# .env 中添加
VITE_LEGACY_ROUTER=true

# 代码中检查
if (import.meta.env.VITE_LEGACY_ROUTER === 'true') {
  // 跳过所有新逻辑，直接调用旧的 getMenus()
}
```

---

## Open Questions 待确认

> *以下问题需要在实施前或实施中解决*

1. **静态路由文件的维护责任**: 是前端团队还是后端团队负责更新 `modules/*.ts`？建议：前端团队维护，后端团队提供 API 文档作为参考
2. **生产环境 TTL 最佳值**: 建议 30 分钟（可后续根据监控数据调整）
3. **权限轮询接口**: 建议先复用现有 `/system/menus` 接口但仅返回 `{ version: string }` 字段（轻量），后续再考虑独立接口
4. **预加载颗粒度**: 当前方案是整个组件（已足够），暂不需要细化到 SplitChunks
