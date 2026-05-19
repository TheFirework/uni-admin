# Route Middleware Delta Spec

> **注意**: 此 delta spec 修改现有的 `route-guard` capability
>
> **变更类型**: 架构升级 - 从线性四级守卫链升级为洋葱模型中间件系统

---

## MODIFIED Requirements

### Requirement: 四级守卫链执行流程

**原实现**: 硬编码的线性 Stage 1-4 检查
**新实现**: 可组合、可扩展的洋葱模型中间件系统

#### Scenario: 中间件链定义

- **WHEN** 应用启动调用 `setupRouterGuards(router)`
- **THEN** 系统 SHALL 定义如下中间件链（按执行顺序）:

```typescript
const middlewareChain: Middleware[] = [
  whiteListMiddleware,        // Stage 1: 白名单检查 (保持不变)
  authMiddleware,             // Stage 2: Token 校验 (保持不变)
  userSyncMiddleware,         // 🆕 新增: 用户信息同步
  dynamicRouteMiddleware,     // Stage 3: 动态路由加载 (增强)
  permissionMiddleware,       // Stage 4: 权限校验 (保持不变)
];
```

#### Scenario: 洋葱模型执行机制

- **WHEN** 路由导航触发 (beforeEach)
- **THEN** 系统 SHALL 使用 `compose()` 函数组合中间件链
- **AND** 按数组顺序依次执行每个中间件
- **AND** 每个中间件接收统一的 `RouterGuardContext`:
  ```typescript
  interface RouterGuardContext {
    to: RouteLocationNormalized;
    from: RouteLocationNormalized;
    next: NavigationGuardNext;
    router: Router;
    aborted: boolean;  // 标记是否已中断导航
  }
  ```

#### Scenario: 统一错误处理

- **WHEN** 任意中间件抛出异常
- **AND** 导航未被中断 (context.aborted === false)
- **THEN** 顶层 catch SHALL 重定向到登录页
- **AND** 携带 redirect 和 error 参数

---

## ADDED Requirements

### Requirement: 用户信息同步中间件 (userSyncMiddleware)

新增的中间件层，用于在 Token 校验通过后、动态路由加载前同步用户信息。

#### Scenario: Token 有效时同步用户信息

- **WHEN** authMiddleware 通过（Token 有效）
- **AND** 进入 userSyncMiddleware
- **THEN** 检查用户信息是否已在 Pinia store 中
- **AND** 如果未加载，从 Storage 或 API 获取用户信息
- **AND** 确保后续中间件可访问到完整的用户上下文

#### Scenario: 用户信息已存在则跳过

- **WHEN** 用户信息已在 store 中且未过期
- **THEN** 直接进入下一中间件（dynamicRouteMiddleware）
- **AND** 避免重复请求

---

### Requirement: 动态路由加载增强 (dynamicRouteMiddleware 升级)

Stage 3 从简单的懒加载升级为集成缓存和适配器的完整流程。

#### Scenario: 动态路由未加载时的完整获取流程

- **WHEN** isRoutesLoaded === false
- **AND** 进入 dynamicRouteMiddleware
- **THEN** 调用 `menuStore.fetchMenus()` 触发完整流程:
  1. 防并发检查 (isLoading?)
  2. 缓存检查 (L1 → L2 → miss)
  3. 缓存命中: 更新状态 + 触发后台静默刷新
  4. 缓存未命中: 通过 RouteAdapter 从网络获取
  5. 注册动态路由到 Vue Router (registerDynamicRoutes)
  6. 设置 isRoutesLoaded = true

#### Scenario: 强制刷新支持

- **WHEN** 需要强制刷新菜单（如权限变更后）
- **THEN** 支持 `fetchMenus({ force: true })` 模式
- **AND** 跳过所有缓存和 isLoading 检查
- **AND** 直接从网络获取最新数据

---

### Requirement: 中间件可扩展性架构

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

### Requirement: afterEach 增强功能

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

## RENAMED Requirements

无重命名需求。原有 Requirement 名称保持兼容。

---

## 技术决策记录

| 决策项 | 原方案 | 新方案 | 变更原因 |
|--------|-------|-------|---------|
| **守卫架构** | 线性四级检查函数 | 洋葱模型中间件系统 | 大幅提升可扩展性和可维护性 |
| **Stage 3 实现** | 内联的 TODO 占位逻辑 | 独立的 dynamicRouteMiddleware | 集成缓存、适配器、去重器等完整流程 |
| **错误处理** | 各 Stage 独立 try-catch | 顶层统一 catch + context.aborted | 减少重复代码，统一错误处理策略 |
| **用户信息同步** | 无（在 Stage 2 内隐式处理） | 独立的 userSyncMiddleware | 关注点分离，更清晰的职责划分 |
