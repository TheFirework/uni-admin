# Server Response Format

服务端统一响应格式与自动包装机制。

## Purpose

建立全局统一的 API JSON 响应结构，通过 ResponseInterceptor 自动包装 Controller 返回值，通过 HttpExceptionFilter 统一处理异常响应，消除各接口手动构建响应的不一致问题。

## ADDED Requirements

### Requirement: 统一响应结构

所有 API 接口的 JSON 响应 SHALL 遵循统一的数据结构。成功响应 SHALL 包含 `success`、`code`、`message`、`data`、`timestamp` 字段。失败响应 SHALL 包含 `success`、`code`、`message`、`timestamp`、`path` 字段，可选 `details` 字段。

#### Scenario: 接口返回成功数据

- **WHEN** 客户端请求任意 API 接口且业务处理成功
- **THEN** 响应体 JSON 包含 `success: true`
- **AND** `code` 字段值为 `200`
- **AND** `message` 字段值为 `'ok'`
- **AND** `data` 字段为接口实际返回的业务数据
- **AND** `timestamp` 字段为 ISO 8601 格式的当前时间戳

#### Scenario: 接口返回校验失败

- **WHEN** 客户端提交的数据未通过 DTO 校验（如缺少必填字段）
- **THEN** 响应体 JSON 包含 `success: false`
- **AND** `code` 字段值为 `422`
- **AND** `message` 字段为校验错误描述
- **AND** `details` 字段为校验详情数组，每项包含 `field` 和 `message`
- **AND** `path` 字段为请求路径

#### Scenario: 接口返回未授权

- **WHEN** 客户端请求需要认证的接口但未提供有效 Token
- **THEN** HTTP 状态码为 `401`
- **AND** 响应体 JSON 包含 `success: false`
- **AND** `code` 字段值为 `401`
- **AND** `message` 字段为"缺少访问令牌"或"令牌已过期"

### Requirement: ResponseInterceptor 自动包装

系统 SHALL 通过全局 ResponseInterceptor 自动将所有 Controller 的返回值包装为统一成功响应格式，无需 Controller 手动构建响应对象。

#### Scenario: Controller 返回纯数据对象

- **WHEN** Controller 方法返回 `{ id: 1, name: 'test' }`
- **THEN** ResponseInterceptor 自动包装为 `{ success: true, code: 200, message: 'ok', data: { id: 1, name: 'test' }, timestamp: '...' }`

#### Scenario: Controller 返回 Result.success

- **WHEN** Controller 方法返回 `Result.success({ id: 1, name: 'test' })`
- **THEN** ResponseInterceptor 识别 Result 类型，提取 `.data` 后包装为 `{ success: true, code: 200, message: 'ok', data: { id: 1, name: 'test' }, timestamp: '...' }`

#### Scenario: Controller 返回 Result.fail

- **WHEN** Controller 方法返回 `Result.fail(40001, '用户名已存在')`
- **THEN** ResponseInterceptor 将该 Result 转为抛出 `BusinessException(40001, '用户名已存在')`
- **AND** 由 HttpExceptionFilter 捕获并返回 `{ success: false, code: 40001, message: '用户名已存在', timestamp: '...', path: '...' }`

#### Scenario: Controller 直接抛出异常

- **WHEN** Controller 方法抛出 `NotFoundException('用户不存在')`
- **THEN** 异常绕过 ResponseInterceptor，由 HttpExceptionFilter 捕获
- **AND** 返回 `{ success: false, code: 404, message: '用户不存在', timestamp: '...', path: '...' }`

### Requirement: API 路径无版本号前缀

全局 API 路由前缀 SHALL 为 `/api`，不包含版本号（如 `/v1`）。

#### Scenario: 健康检查接口路径

- **WHEN** 客户端请求 `GET /api/health`
- **THEN** 服务端正确响应健康检查结果

#### Scenario: 登录接口路径

- **WHEN** 客户端请求 `POST /api/auth/login`
- **THEN** 服务端正确处理登录请求

### Requirement: HttpExceptionFilter 统一错误格式

HttpExceptionFilter SHALL 对所有异常返回包含 `success: false` 的统一错误响应格式。

#### Scenario: 业务异常处理

- **WHEN** Service 层抛出 `HttpException` 或其子类异常
- **THEN** HttpExceptionFilter 返回包含 `success: false` 的 JSON 响应
- **AND** `code` 字段根据异常类型映射为对应 HTTP 状态码
- **AND** `message` 字段为异常的响应消息
- **AND** `timestamp` 和 `path` 字段自动填充

#### Scenario: 未知异常处理

- **WHEN** 发生未预期的运行时错误
- **THEN** HttpExceptionFilter 返回 `{ success: false, code: 500, message: '服务器内部错误', timestamp: '...', path: '...' }`
- **AND** 错误详情记录到日志系统

### Requirement: 分页响应标准化

分页接口的 `data` 字段 SHALL 采用 `{ list: T[], pagination: { total, page, pageSize, totalPages } }` 结构。`pagination` 仅在分页接口中出现，非分页接口的 `data` 直接为业务数据。

#### Scenario: 分页接口返回成功

- **WHEN** 客户端请求分页列表接口（如用户列表）且处理成功
- **THEN** 响应体中 `success` 为 `true`，`code` 为 `200`
- **AND** `data.list` 为当前页数据数组
- **AND** `data.pagination` 包含 `total`（总记录数）、`page`（当前页码）、`pageSize`（每页大小）、`totalPages`（总页数）

#### Scenario: 分页接口返回空列表

- **WHEN** 客户端请求分页列表接口且查询结果为空
- **THEN** `data.list` 为空数组 `[]`
- **AND** `data.pagination.total` 为 `0`
- **AND** `data.pagination.totalPages` 为 `0`
