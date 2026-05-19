# Route Guard Delta Specification

本规范文档描述对现有 **route-guard** 能力的修改需求。这些修改不会改变路由守卫的核心校验逻辑（白名单、Token、权限检查），仅在 Stage 3（动态路由就绪检查）前后增加对 App Store 状态的读写操作。

## MODIFIED Requirements

### Requirement: Dynamic Routes Readiness Check (Stage 3)

原有的 Stage 3 守卫负责在动态路由未加载时调用 `menuStore.fetchMenus()` 并注册路由。**修改后**，该守卫 SHALL 在开始加载前设置 App Store 的 loading 状态，并在加载完成后（无论成功或失败）清除 loading 状态。

#### Scenario: Stage 3 开始前设置 Loading 状态
- **WHEN** 路由守卫进入 Stage 3 检测（`checkDynamicRoutes` 被调用）
- **AND** `isRoutesLoaded === false`（动态路由尚未加载）
- **THEN** 守卫 SHALL 在调用 `fetchMenus()` **之前** 执行:
  - `appStore.setFullLoading(true)` — 开启全屏 Loading
  - `appStore.setRouteLoading(true)` — 开启路由切换骨架屏
- **AND** 这些状态设置操作 SHALL 同步完成（不阻塞后续异步流程）

#### Scenario: Stage 3 成功完成清除 Loading 状态
- **WHEN** `menuStore.fetchMenus()` 成功返回
- **AND** 所有动态路由已通过 `addRoute()` 注册
- **AND** `isRoutesLoaded` 被设置为 `true`
- **THEN** 守卫 SHALL 在返回 `true`（表示需要重新导航）**之前** 执行:
  - `appStore.setFullLoading(false)` — 关闭全屏 Loading
  - `appStore.setRouteLoading(false)` — 关闭路由切换骨架屏

#### Scenario: Stage 3 失败时清除 Loading 状态并重定向
- **WHEN** `menuStore.fetchMenus()` 抛出异常（网络错误、API 500 等）
- **OR** 动态路由注册过程中发生错误
- **THEN** 守卫 SHALL 在 catch 块中首先执行:
  - `appStore.setFullLoading(false)` — 确保关闭全屏 Loading
  - `appStore.setRouteLoading(false)` — 确保关闭骨架屏
- **AND** THEN 执行原有逻辑：重定向到 `/login` 页面并携带 redirect 参数
- **AND** 用户 SHALL NOT 被卡在永久 Loading 状态

#### Scenario: 动态路由已加载时跳过 Loading 控制
- **WHEN** 路由守卫进入 Stage 3 检测
- **AND** `isRoutesLoaded === true`（动态路由已经加载过）
- **THEN** 守卫 SHALL NOT 修改 App Store 的任何 loading 状态
- **AND** 直接返回 `false`（表示无需重新导航）
- **AND** 正常进入后续的 Stage 4 权限校验
