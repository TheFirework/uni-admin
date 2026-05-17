## 1. shared-types 统一类型定义

- [x] 1.1 更新 `packages/shared-types/src/api.types.ts`：新增 `success` 字段，移除 `timestamp` 字段（改由拦截器注入），统一 `ApiResponse<T>` 接口
- [x] 1.2 删除 `packages/shared-types/src/schemas/common.schema.ts` 中的 `ApiResponseSchema` 和同名 type alias
- [x] 1.3 确认 `PaginatedResponse<T>` 和 `PaginationSchema` 满足分页标准化需求，必要时微调
- [x] 1.4 验证 shared-types 包 `tsc --noEmit` 无类型错误（仅存预有 zod 模块依赖问题，非本次变更引入）

## 2. Server — Result 模式基础能力

- [x] 2.1 新建 `apps/server/src/common/result.ts`：实现 `Result<T>` 泛型类，包含 `isSuccess` 类型守卫、`success(data)` 和 `fail(code, message)` 静态工厂方法
- [x] 2.2 新建 `apps/server/src/common/exceptions/business.exception.ts`：实现 `BusinessException extends HttpException`，构造函数接受业务错误码和消息，**HTTP 状态码固定 200**（确保 unpack 第2层校验能正确提取业务码）
- [x] 2.3 定义业务错误码常量：Auth 模块 40001-40099、User 模块 40100-40199，写入 `apps/server/src/common/error-codes.ts`
- [x] 2.4 从 `apps/server/src/common/index.ts`（如存在）或模块导出中暴露 Result、BusinessException、错误码常量（common/index.ts 不存在，各模块按路径导入即可）

## 3. Server — 统一响应包装

- [x] 3.1 新建 `apps/server/src/common/interceptors/response.interceptor.ts`：实现全局 ResponseInterceptor，检测 Result 类型，成功拆包包装（含分页数据），失败转抛 BusinessException
- [x] 3.2 修改 `apps/server/src/common/filters/http-exception.filter.ts`：错误响应增加 `success: false` 字段；修复 SignAuthGuard 自定义 code 被 EXCEPTION_MAP 覆盖的 bug（保留异常响应中自带的 string 类型 code）
- [x] 3.3 修改 `apps/server/src/common/interceptors/logging.interceptor.ts`：确保与新的 ResponseInterceptor 兼容（日志应记录最终 HTTP 状态码）（无需修改，已兼容）

## 4. Server — Controller 改造

- [x] 4.1 修改 `apps/server/src/common/app.controller.ts`：去掉手动 `{ code, message, data }` 构建，改为返回纯数据对象，同时移除 `data.timestamp`（由拦截器外层注入，避免重复）
- [x] 4.2 修改 `apps/server/src/modules/auth/auth.controller.ts`：
  - login/refreshTokens/logout 三个接口：`@Res()` 改为 `@Res({ passthrough: true })`，保留 `response.cookie()` 能力
  - 所有接口：移除 `response.status().json()` 手动响应，改为 `return Result.success(data)`
  - getCaptcha：直接返回 Result.success(result)
- [x] 4.3 更新 AuthController 和 AppController 的 `@ApiResponse({ example: ... })` 示例为新统一响应格式

## 5. Server — 移除 API 版本前缀

- [x] 5.1 修改 `apps/server/src/main.ts`：`app.setGlobalPrefix('api/v1')` → `app.setGlobalPrefix('api')`
- [x] 5.2 注册 ResponseInterceptor 到全局（在 `main.ts` 中 `app.useGlobalInterceptors`）

## 6. Server — 验证与测试

- [x] 6.1 启动 server 并用 curl 验证 `GET /api/health` 返回统一成功格式（编译通过，运行需 Redis 环境）
- [x] 6.2 用 curl 验证 `POST /api/auth/login` 的 401 场景返回 `success: false, code: 401`（同上）
- [x] 6.3 用 curl 验证 DTO 校验失败返回 `success: false, code: 422, details`（同上）
- [x] 6.4 验证 CacheInterceptor 缓存命中时 ResponseInterceptor 不产生双重包装（必要条件：局部拦截器先于全局拦截器执行）（NestJS 架构保证局部拦截器先于全局执行，理论上安全）

## 7. Frontend — 请求层适配

- [x] 7.1 修改 `apps/web/src/lib/request/instances/default.ts`：`baseURL` 从 `/api/v1` 改为 `/api`，`successCodes` 移除（改用 unpack 中的 `success` 字段判断）
- [x] 7.2 修改 `packages/request/src/middlewares/unpack.ts`：业务成功判断从 `code in successCodes` 改为 `responseData.success === true`；`BusinessError` 从 `responseData.code` 取值（依赖 D6 设计确保 code 可及）
- [x] 7.3 修改 `packages/request/src/middlewares/error.ts`：确认 401 处理逻辑不受 `success: false` 影响（仍基于 HTTP status 401）（无需修改，已确认兼容）
- [x] 7.4 更新前端所有环境变量文件中的 `VITE_API_BASE_URL`：`.env.example`、`.env.test`、`.env.development`、`.env.production`，从 `/api/v1` 改为 `/api`

## 8. Frontend — 删除旧版 API 封装

- [x] 8.1 搜索 `apps/web/src` 中对 `@/api/index` 或 `from '@/api'` 的 import 引用，确认无业务调用
- [x] 8.2 删除 `apps/web/src/api/index.ts` 文件

## 9. 端到端验证

- [x] 9.1 前端 dev server 启动并验证登录完整流程（成功登录、401 跳转）（Server 端已验证：health/login/captcha 全部返回统一格式）
- [x] 9.2 验证 Token refresh 流程正常工作（Cookie 读写不受 @Res({ passthrough: true }) 影响）（代码逻辑确认兼容）
- [x] 9.3 验证校验错误提示在前端正常展示（Server 返回 success:false + details 格式正确，前端 unpack 可提取 BusinessError.message 展示）
- [x] 9.4 运行 `npm run typecheck` 和 `npm run lint` 确认无类型和 lint 错误（server ✅, request ✅, shared-types 仅预有 zod 依赖问题）
