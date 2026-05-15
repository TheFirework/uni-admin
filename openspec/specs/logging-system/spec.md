# Logging System Specification

## Purpose

定义 uni-admin 系统的日志管理规范，包括 Winston 日志集成、全局异常过滤器和请求日志拦截器，确保日志的结构化、可追溯性和生产环境的可观测性。

**Scope**: 覆盖日志格式、级别、传输目标、异常处理和请求拦截。

---

## Requirements

### Requirement: Winston 日志系统集成
系统 MUST 集成 winston 日志框架，提供结构化、多级别的日志记录能力。

**日志级别** (由低到高):
- debug: 调试信息（仅开发环境）
- info: 一般信息（如请求日志、业务操作）
- warn: 警告信息（如性能下降、配置缺失）
- error: 错误信息（如未捕获异常、数据库连接失败）

**日志格式** (JSON 结构):
```json
{
  "timestamp": "2026-05-15T10:30:00.000Z",
  "level": "info",
  "message": "User login success",
  "context": "AuthService",
  "traceId": "abc123",
  "userId": "user_001",
  "meta": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "method": "POST",
    "url": "/api/v1/auth/login",
    "statusCode": 201,
    "responseTime": 120
  }
}
```

**传输目标**:
- 开发环境: Console（彩色格式）+ File（debug 级别）
- 生产环境: File（info 级别）+ 可选 ELK Stack

#### Scenario: 记录用户操作日志
- **WHEN** 用户执行关键操作（登录、修改数据、删除资源）
- **THEN** Service 层 MUST 使用 Logger.info() 记录操作日志
- **AND** 日志 MUST 包含 userId、操作类型、操作对象、时间戳

#### Scenario: 记录错误堆栈
- **WHEN** 系统捕获到未处理异常（如数据库查询失败）
- **THEN** 全局异常过滤器 MUST 使用 Logger.error() 记录错误
- **AND** 日志 MUST 包含完整的错误堆栈（stack trace）
- **AND** 日志 MUST 包含请求上下文（URL、Headers、Body）

#### Scenario: 日志文件轮转
- **WHEN** 日志文件大小超过 20MB（可配置）
- **THEN** winston-daily-rotate-file MUST 自动创建新文件
- **AND** 旧文件名格式: `app-2026-05-15.log`
- **AND** 保留最近 30 天的日志文件（可配置）

---

### Requirement: 全局异常过滤器
系统 MUST 实现全局异常过滤器（Exception Filter），统一错误响应格式，避免泄露敏感信息。

**统一错误响应格式**:
```json
{
  "code": "USER_NOT_FOUND",
  "message": "用户不存在",
  "details": [
    {
      "field": "userId",
      "message": "ID 格式不正确"
    }
  ],
  "timestamp": "2026-05-15T10:30:00.000Z",
  "path": "/api/v1/users/invalid-id"
}
```

**异常映射规则**:
- HttpException → 返回原始状态码和消息
- ValidationError (class-validator) → 400 Bad Request + 字段级错误详情
- UnauthorizedError → 401 Unauthorized + 提示重新登录
- ForbiddenError → 403 Forbidden + 权限不足提示
- 未知异常 → 500 Internal Server Error + 通用错误消息（不暴露堆栈）

#### Scenario: 参数验证失败
- **WHEN** 用户提交的请求参数不符合 DTO 定义的规则（如缺少必填字段）
- **THEN** ValidationPipe MUST 抛出 ValidationError
- **AND** 异常过滤器 MUST 返回 HTTP 400 Bad Request
- **AND** 响应体 MUST 包含每个字段的错误原因（数组格式）

#### Scenario: 业务逻辑异常
- **WHEN** Service 层抛出自定义业务异常（如 `throw new NotFoundException('用户不存在')`）
- **THEN** 异常过滤器 MUST 捕获并返回对应的状态码（404）
- **AND** 错误码 MUST 为 `USER_NOT_FOUND`（语义化的英文大写+下划线格式）

#### Scenario: 未预期的服务器错误
- **WHEN** 发生未处理的异常（如数据库连接断开）
- **THEN** 异常过滤器 MUST 返回 HTTP 500 Internal Server Error
- **AND** 错误消息 MUST 为通用提示："服务器内部错误，请稍后重试"
- **AND** 响应体 MUST 不包含详细的堆栈信息（防止信息泄露）
- **AND** 详细错误 MUST 记录到 Winston 日志文件中

---

### Requirement: 请求日志拦截器
系统 MUST 实现日志拦截器（Interceptor），自动记录所有 HTTP 请求的元数据。

**记录内容**:
- 请求方法 (GET/POST/PUT/DELETE)
- 请求 URL 和路由路径
- 请求 IP 地址
- User-Agent
- 响应状态码
- 响应耗时（毫秒）
- 当前用户 ID（如果已认证）

#### Scenario: 自动记录请求日志
- **WHEN** 任何 HTTP 请求到达服务器
- **THEN** LoggingInterceptor MUST 在请求前记录开始时间
- **AND** 在响应后计算耗时并输出完整日志
- **AND** 日志级别根据状态码动态调整：
  - 5xx → error
  - 4xx → warn
  - 其他 → info
