## ADDED Requirements

### Requirement: JWT 双 Token 认证机制
系统 MUST 实现基于 JWT 的双 Token（Access Token + Refresh Token）认证鉴权机制，用于保护需要身份验证的 API 接口。

**Token 规范**:
- Access Token:
  - 有效期: 15 分钟（可配置）
  - 存储位置: HTTP-only Cookie + 前端内存（Pinia Store）
  - Payload 结构: `{ sub: userId, username, roles, iat, exp }`
  - 签名算法: HS256

- Refresh Token:
  - 有效期: 7 天（可配置）
  - 存储位置: 仅 HTTP-only Cookie + Redis/数据库
  - 格式: 64 字节随机字符串（非 JWT，避免 Payload 膨胀）
  - 绑定信息: 用户 ID + 设备指纹（User-Agent + IP）

#### Scenario: 用户成功登录获取双 Token
- **WHEN** 用户使用正确的用户名和密码调用 `POST /api/v1/auth/login`
- **THEN** 系统 MUST 返回 HTTP 201 Created
- **AND** 响应体包含用户基本信息（不含敏感字段）
- **AND** Set-Cookie 头包含 `accessToken` 和 `refreshToken`（HttpOnly、Secure、SameSite=Strict）
- **AND** Refresh Token MUST 存储到 Redis（Key: `refresh:{userId}:{deviceId}`, TTL: 7天）

#### Scenario: 使用 Access Token 访问受保护接口
- **WHEN** 用户在 Header 中携带有效的 `Authorization: Bearer <accessToken>` 调用受保护接口
- **THEN** JwtAuthGuard MUST 成功验证 Token
- **AND** 通过 `@CurrentUser()` 装饰器注入当前用户信息到 Request 对象
- **AND** 接口正常返回业务数据

#### Scenario: Access Token 过期自动刷新
- **WHEN** 用户使用过期的 Access Token 调用接口
- **AND** 前端自动携带 Refresh Token 调用 `POST /api/v1/auth/refresh`
- **AND** Refresh Token 有效且未过期
- **THEN** 系统 MUST 返回新的双 Token（旧的 Refresh Token 立即失效）
- **AND** 前端自动重试原请求（使用新的 Access Token）

#### Scenario: Refresh Token 也已过期或无效
- **WHEN** Refresh Token 过期、被注销或在黑名单中
- **THEN** 系统 MUST 返回 HTTP 401 Unauthorized
- **AND** 错误码为 `TOKEN_EXPIRED` 或 `TOKEN_INVALID`
- **AND** 前端 MUST 清除本地存储并跳转到登录页

---

### Requirement: Passport 策略集成
系统 MUST 使用 @nestjs/passport 集成 Passport.js 认证中间件，实现标准化的认证流程。

**策略定义**:
- JwtStrategy: 验证 Bearer Token（从 Authorization 头提取）
- RefreshTokenStrategy: 验证 Refresh Token（从 Cookie 提取）

**守卫与装饰器**:
- @UseGuards(JwtAuthGuard): 路由级守卫，标记需要认证的接口
- @CurrentUser(): 自定义装饰器，从 Request 注入当前用户对象
- @Public(): 自定义装饰器，标记公开接口（跳过认证）

#### Scenario: 未携带 Token 访问受保护接口
- **WHEN** 用户未提供 Authorization 头调用受保护接口
- **THEN** JwtAuthGuard MUST 返回 HTTP 401 Unauthorized
- **AND** 错误消息为 `"Missing authentication token"`

#### Scenario: Token 被篡改
- **WHEN** 用户提供的 Token 签名不合法（被篡改）
- **THEN** jwtService.verify() MUST 抛出 JsonWebTokenError
- **AND** 全局异常过滤器 MUST 返回 HTTP 401 Unauthorized
- **AND** 错误码为 `INVALID_TOKEN`

---

### Requirement: 登出与 Token 注销
系统 MUST 支持安全登出功能，确保 Token 立即失效。

#### Scenario: 用户主动登出
- **WHEN** 用户调用 `POST /api/v1/auth/logout`
- **AND** 提供 Refresh Token
- **THEN** 系统 MUST 从 Redis 删除对应的 Refresh Token
- **AND** 清除浏览器的 accessToken 和 refreshToken Cookie
- **AND** 返回 HTTP 200 OK

#### Scenario: 修改密码后强制重新登录
- **WHEN** 用户修改密码成功
- **THEN** 系统 MUST 删除该用户所有活跃的 Refresh Token（Redis 批量删除）
- **AND** 所有旧 Token 立即失效
- **AND** 用户 MUST 使用新密码重新登录

---

### Requirement: 密码安全存储
系统 MUST 使用 bcrypt 算法对用户密码进行哈希存储，禁止明文存储。

**bcrypt 配置**:
- Salt Rounds: 10（平衡安全性与性能）
- 哈希长度: 60 字符（$2b$10$...）

#### Scenario: 注册时密码加密
- **WHEN** 新用户注册并提供密码
- **THEN** 系统 MUST 使用 bcrypt.hash() 异步生成密码哈希
- **AND** 仅将哈希值存储到数据库（不存储原始密码）

#### Scenario: 登录时密码验证
- **WHEN** 用户登录并提供密码
- **THEN** 系统 MUST 使用 bcrypt.compare() 验证密码
- **AND** 验证时间 MUST > 100ms（防止时序攻击）
