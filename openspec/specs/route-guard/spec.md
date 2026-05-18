# Route Guard Spec

## Purpose

定义中间件式路由守卫规范，实现四级守卫链（白名单检查 → Token 校验 → 动态路由就绪 → 权限校验），确保路由安全性和动态路由加载机制。

---

## Requirements

### Requirement: 四级守卫链执行流程

路由守卫 SHALL 按照「白名单检查 → Token 校验 → 动态路由就绪 → 权限校验」的顺序依次执行。每一级通过后才进入下一级，任一级失败则中断导航并执行对应处理逻辑。

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
- **THEN** 进入 Stage 3 检查动态路由

##### Scenario: 无 Token 跳转登录

- **WHEN** Storage 中无 Token 或 Token 已过期
- **THEN** 守卫 SHALL 中断当前导航
- **AND** 重定向到 `/login?redirect={当前路径}`
- **AND** 以便登录成功后跳回原目标页面

#### Stage 3 - 动态路由就绪检查

##### Scenario: 动态路由已加载，继续权限校验

- **WHEN** 全局标志 isRoutesLoaded = true
- **THEN** 进入 Stage 4 权限校验

##### Scenario: 动态路由未加载，懒加载后重试

- **WHEN** isRoutesLoaded = false 且用户已有有效 Token
- **THEN** 守卫 SHALL 调用菜单接口获取路由数据
- **AND** 执行 generateRoutes() + router.addRoute() 注册动态路由
- **AND** 设置 isRoutesLoaded = true
- **AND** 调用 next({ ...to, replace: true }) 重新发起导航
- **AND** BasicLayout 在此期间显示 Loading 骨架屏

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
