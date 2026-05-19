# Route Guard Spec

## Purpose

定义**洋葱模型中间件式**路由守卫规范，实现可组合、可扩展的中间件链（白名单检查 → Token 校验 → 用户信息同步 → 动态路由加载 → 权限校验），确保路由安全性和动态路由加载机制。

> **架构升级说明**: 从线性四级守卫链升级为洋葱模型中间件系统 (2026-05-19)
>
> **核心优势**:
> - ✅ **可扩展性**: 新增中间件只需在数组添加一项
> - ✅ **可测试性**: 每个中间件可独立单元测试
> - ✅ **可禁用**: 支持运行时动态禁用某个中间件
> - ✅ **统一错误处理**: 中间件异常由顶层统一捕获

---

## Requirements

### Requirement: 四级守卫链执行流程 (升级为洋葱模型)

路由守卫 SHALL 按照「白名单检查 → Token 校验 → 用户信息同步 → 动态路由就绪 → 权限校验」的顺序依次执行。每一级通过后才进入下一级，任一级失败则中断导航并执行对应处理逻辑。

**实现方式**: 使用 `compose()` 函数组合中间件链，每个中间件为独立的 Middleware 对象。

#### 中间件链定义

```typescript
const middlewareChain: Middleware[] = [
  whiteListMiddleware,        // Stage 1: 白名单检查
  authMiddleware,             // Stage 2: Token 校验
  userSyncMiddleware,         // 🆕 Stage 2.5: 用户信息同步
  dynamicRouteMiddleware,     // Stage 3: 动态路由加载 (增强版)
  permissionMiddleware,       // Stage 4: 权限校验
];
```

#### Scenario: 统一上下文传递

- **WHEN** 路由导航触发 (beforeEach)
- **THEN** 系统 SHALL 创建统一的 `RouterGuardContext`:
  ```typescript
  interface RouterGuardContext {
    to: RouteLocationNormalized;
    from: RouteLocationNormalized;
    next: NavigationGuardNext;
    router: Router;
    aborted: boolean;  // 标记是否已中断导航
  }
  ```
- **AND** 所有中间件共享此 context 对象

#### Scenario: 统一错误处理

- **WHEN** 任意中间件抛出异常
- **AND** 导航未被中断 (context.aborted === false)
- **THEN** 顶层 catch SHALL 重定向到登录页
- **AND** 携带 redirect 和 error 参数

#### Stage 1 - 白名单检查

##### Scenario: 白名单路由直接放行

- **WHEN** 目标路由 to.path 在 WHITE_LIST 配置中（如 `/login`, `/404`）
- **THEN** 守卫 SHALL 立即调用 next() 放行，不再执行后续阶段

##### Scenario: 非白名单路由进入 Token 校验

- **WHEN** 目标路由不在白名单中
- **THEN** 守卫 SHALL 进入 Stage 2 进行 Token 校验

#### Stage 2 - Token 校验

##### Scenario: 有有效 Token 且路由已就绪

- **WHEN** Storage 中存在有效的 Token (auth 命名空间，未过期)
- **THEN** 进入 userSyncMiddleware (Stage 2.5)

##### Scenario: 无 Token 跳转登录

- **WHEN** Storage 中无 Token 或 Token 已过期
- **THEN** 守卫 SHALL 中断当前导航
- **AND** 重定向到 `/login?redirect={当前路径}`
- **AND** 以便登录成功后跳回原目标页面

#### Stage 2.5 - 用户信息同步 (🆕 新增)

##### Scenario: Token 有效时同步用户信息

- **WHEN** authMiddleware 通过（Token 有效）
- **AND** 进入 userSyncMiddleware
- **THEN** 检查用户信息是否已在 Pinia store 中
- **AND** 如果未加载，从 Storage 或 API 获取用户信息
- **AND** 确保后续中间件可访问到完整的用户上下文

##### Scenario: 用户信息已存在则跳过

- **WHEN** 用户信息已在 store 中且未过期
- **THEN** 直接进入 dynamicRouteMiddleware (Stage 3)
- **AND** 避免重复请求

#### Stage 3 - 动态路由就绪检查 (增强版)

##### Scenario: 动态路由已加载，继续权限校验

- **WHEN** 全局标志 isRoutesLoaded = true
- **THEN** 进入 permissionMiddleware (Stage 4)

##### Scenario: 动态路由未加载，完整获取流程

- **WHEN** isRoutesLoaded === false 且用户已有有效 Token
- **THEN** 调用 `menuStore.fetchMenus()` 触发完整流程:
  1. 防并发检查 (isLoading?)
  2. 缓存检查 (L1 内存 → L2 Storage → miss)
  3. 缓存命中: 更新状态 + 触发后台静默刷新 (Stale-While-Revalidate)
  4. 缓存未命中: 通过 RouteAdapter 从网络获取（支持 frontend/backend/mixed 三种模式）
  5. 使用 PromiseDeduplicator 确保请求去重
  6. 注册动态路由到 Vue Router (智能注册算法: 自动处理 NotFound、去重、HMR)
  7. 设置 isRoutesLoaded = true
  8. 调用 next({ ...to, replace: true }) 重新发起导航

##### Scenario: 强制刷新支持 (🆕 新增)

- **WHEN** 需要强制刷新菜单（如权限变更后）
- **THEN** 支持 `fetchMenus({ force: true })` 模式
- **AND** 跳过所有缓存和 isLoading 检查
- **AND** 直接从网络获取最新数据

#### Stage 4 - 权限校验

##### Scenario: 路由无特殊权限要求

- **WHEN** 目标路由的 matched 记录中没有 requiresAuth 或 roles 相关 meta
- **THEN** 守卫 SHALL 调用 next() 放行

##### Scenario: 用户拥有所需权限

- **WHEN** 路由 meta.roles 要求的角色在当前用户的角色列表中
- **THEN** 守卫 SHALL 调用 next() 放行

##### Scenario: 用户缺少权限

- **WHEN** 路由要求特定角色但当前用户不具备
- **THEN** 守卫 SHALL 重定向到 `/403` 页面或显示无权限提示

---

### Requirement: 中间件可扩展性架构 (🆕 新增)

系统 SHALL 支持运行时动态调整中间件链。

#### Scenario: 新增中间件

- **WHEN** 需要添加新的守卫逻辑（如：频率限制、审计日志）
- **THEN** 只需在 middlewareChain 数组适当位置添加新的 Middleware 对象
- **AND** 无需修改核心 compose 逻辑或现有中间件代码

#### Scenario: 禁用中间件

- **WHEN** 需要临时禁用某个中间件（如开发环境跳过权限检查）
- **THEN** 设置该中间件的 `enabled = false`
- **OR** 从 middlewareChain 数组中移除

#### Scenario: 调整中间件顺序

- **WHEN** 需要改变执行顺序（如：将权限检查提前）
- **THEN** 移动数组元素位置即可
- **AND** compose() 自动按新顺序执行

---

### Requirement: afterEach 增强功能 (🆕 新增)

路由守卫 SHALL 在导航完成后提供增强的钩子功能。

#### Scenario: 自动设置页面标题

- **WHEN** 路由导航成功完成 (afterEach)
- **AND** 目标路由的 meta.title 存在
- **THEN** 自动设置 document.title 为 `{title} - UniAdmin`

#### Scenario: 守卫注册日志输出

- **WHEN** setupRouterGuards() 执行完成
- **THEN** 控制台输出:
  - 已注册的中间件数量和名称列表
  - 每个中间件的启用/禁用状态
  - 最终确认消息 `[Router Guard] ✅ 路由守卫注册完成`

---

### Requirement: 路由守卫与 Store/Storage 联动

路由守卫 SHALL 与 AuthStore 和 Storage 封装层紧密联动。Token 读取统一通过 Storage 封装层，登出操作 SHALL 同时清理路由状态。

#### Scenario: 登录成功后标记路由就绪

- **WHEN** auth.store.login() 成功返回
- **THEN** login 方法 SHALL 触发菜单数据获取和动态路由注册
- **AND** 设置 isRoutesLoaded = true
- **AND** 执行路由跳转到目标页面

#### Scenario: 登出时重置路由状态

- **WHEN** auth.store.logout() 被调用
- **THEN** logout 方法 SHALL:
  - 清除 Storage 中 auth 命名空间
  - 清除 Storage 中 user 命名空间
  - 清除 Storage 中 tags 命名空间
  - 重置 isRoutesLoaded = false
  - 调用 router.push('/login')
