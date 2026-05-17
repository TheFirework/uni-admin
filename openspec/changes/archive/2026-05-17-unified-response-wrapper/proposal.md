## Why

当前服务端应用层缺乏统一的响应包装机制。成功响应由各 Controller 手动构建，格式不一致（AppController 有 `timestamp` 但 AuthController 没有），且 Controller 直接使用 `@Res()` 操作原生 Express Response 对象绕过了 NestJS 拦截器链。错误响应由 HttpExceptionFilter 处理，其结构与成功响应不统一（缺少 `success` 字段）。同时 shared-types 包中两个同名 `ApiResponse` 类型存在命名冲突，前端/后端代码缺乏统一的契约。随着业务模块增加，这种不一致将导致维护成本上升和潜在的前后端对接问题。

## What Changes

- **新增** 统一 `Result<T>` 类作为 Service 层返回值类型，提供 `Result.success(data)` 和 `Result.fail(code, message)` 工具方法
- **新增** `BusinessException` 异常类用于 Service 层抛出自定义业务失败（对应 Result.fail）
- **新增** 全局 `ResponseInterceptor` 自动包裹 Controller 成功返回值，统一注入 `success: true`、`timestamp` 等字段
- **修改** `HttpExceptionFilter` 为错误响应增加 `success: false` 字段，与成功响应格式对齐
- **新增** 统一响应格式：`{ success, code, message, data?, timestamp, path?, details? }`
- **修改** 移除全局路由前缀中的 `v1` 版本号，API 路径从 `/api/v1/*` 变为 `/api/*`
- **修改** `AuthController` 去掉 `@Res()` 手动响应，改用返回值 + Result 模式
- **修改** `AppController` 去掉手动构建响应，改为由拦截器自动包装
- **修改** `shared-types` 统一 `ApiResponse` 类型定义，修复两个同名类型冲突，新增 `success` 字段
- **修改** 前端 `unpack.ts` 中间件：从基于 `code` 判断改为基于 `success` 判断业务成功/失败
- **修改** 前端 `default.ts`：`baseURL` 从 `/api/v1` 改为 `/api`，移除 `successCodes` 配置
- **新增** 业务错误码体系：`BusinessException.code` 独立区间（40001-49999），与 HTTP 状态码严格区分
- **新增** 分页响应标准化：`{ data: { list, pagination } }`，复用 shared-types 现有类型
- **删除** 旧版 `apps/web/src/api/index.ts`（deprecated axios 拦截器方式封装）
- **BREAKING**: API 响应格式变更（`success` 字段 + 移除 `v1` 路径前缀），前后端需同步升级

## Capabilities

### New Capabilities

- `server-response-format`: 服务端统一响应格式与自动包装机制
- `result-pattern`: Result 模式在 Service 层的应用（`Result<T>` 类 + `BusinessException`）

### Modified Capabilities

无现有 spec 需要修改。

## Impact

- **Server**: `main.ts`（路由前缀）、`filters/http-exception.filter.ts`（错误格式 + 修复 SignAuthGuard code 覆盖 bug）、`auth/auth.controller.ts`（@Res passthrough）、`app.controller.ts`（移除手动响应）、新建 `interceptors/response.interceptor.ts`、新建 `common/result.ts`、新建 `common/exceptions/business.exception.ts`、新建 `common/error-codes.ts`
- **shared-types**: `api.types.ts`（统一类型定义，修复命名冲突）、复用 `PaginatedResponse<T>` 和 `PaginationSchema`
- **Frontend (request package)**: `instances/default.ts`（baseURL）、`middlewares/unpack.ts`（success 判断）、`middlewares/error.ts`（适配新格式）
- **Frontend (app)**: 删除 `apps/web/src/api/index.ts`（旧版 deprecated API 封装）
- **环境变量**: 前端 `.env*` 文件中 `VITE_API_BASE_URL` 默认值
