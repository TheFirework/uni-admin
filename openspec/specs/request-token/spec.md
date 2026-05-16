# Request Token（Token 管理）

## Purpose

定义 HTTP 请求的 Token 管理能力，包括自动携带、白名单机制、401 加锁处理和动态更新等。

---

## ADDED Requirements

### Requirement: Token 自动携带
系统 MUST 在请求拦截器中自动从存储中读取 Token 并添加到请求头 `Authorization: Bearer <token>`。

#### Scenario: 正常请求携带 Token
- **WHEN** 存储中有有效 Token，发起非白名单请求
- **THEN** 请求头包含 `Authorization: Bearer <accessToken>`

#### Scenario: 无 Token 时不添加头
- **WHEN** 存储中没有 Token（未登录状态）
- **THEN** 请求头不包含 Authorization 字段
- **AND** 请求正常发出（由后端 401 拦截）

---

### Requirement: Token 白名单机制
系统 MUST 维护接口白名单列表，白名单内的接口（如登录、验证码、公开接口）自动跳过 Token 携带。

#### Scenario: 白名单接口不携带 Token
- **WHEN** 请求 URL 匹配白名单（如 `/auth/login`）
- **THEN** 无论是否有 Token 都不添加 Authorization 头

#### Scenario: 接口级强制跳过 Token
- **WHEN** 调用时传入 `{ skipToken: true }`
- **THEN** 该请求跳过 Token 携带（即使不在白名单内）

#### Scenario: 白名单配置方式
- **WHEN** 创建实例时配置 `tokenWhiteList: ['/auth/**', '/public/**', '/captcha']`
- **THEN** 匹配这些模式的请求自动跳过 Token

---

### Requirement: 401 加锁处理
系统 MUST 实现 401 响应的加锁处理机制，确保并发多个 401 时只执行一次跳转登录和缓存清除操作。

#### Scenario: 单个 401 正常处理
- **WHEN** 收到第一个 401 响应
- **THEN** 清除本地 Token 缓存
- **AND** 跳转到登录页
- **AND** 不弹出错误提示

#### Scenario: 并发 401 只处理一次
- **WHEN** 同时收到 3 个请求的 401 响应
- **THEN** 只执行一次跳转登录和清空缓存
- **AND** 后续 401 静默忽略

#### Scenario: 401 处理完成后重置锁
- **WHEN** 用户重新登录成功，发起新请求
- **THEN** 401 锁已重置，可以再次响应新的 401

---

### Requirement: Token 动态更新
系统 MUST 支持运行时动态更新 Token，后续请求自动使用新 Token。

#### Scenario: 登录后设置 Token
- **WHEN** 调用 `instance.setToken('new-token-xxx')`
- **THEN** 后续请求的 Authorization 头使用新 Token

#### Scenario: 登出后清除 Token
- **WHEN** 调用 `instance.clearToken()`
- **THEN** Token 从存储中移除
- **AND** 后续请求不再携带 Authorization 头
