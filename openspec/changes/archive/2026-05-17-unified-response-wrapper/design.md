## Context

当前 uni-admin 服务端基于 NestJS + Express 架构，仅有一个完整的 Auth 业务模块。API 响应格式存在以下问题：

1. **成功响应格式不统一**：AppController 手动构建 `{ code, message, data, timestamp }`，AuthController 使用 `@Res()` 返回 `{ code, message, data }`，二者 `timestamp` 字段不一致
2. **Controller 绕过拦截器链**：AuthController 通过 `@Res() response: Response` 直接调用 `response.status().json()`，导致任何全局拦截器无法触及
3. **成功与错误响应结构不对齐**：成功响应缺少 `success` 字段标记，错误响应（HttpExceptionFilter）有 `path` 字段但成功响应没有
4. **shared-types 命名冲突**：`api.types.ts` 和 `common.schema.ts` 各自定义了不同的 `ApiResponse` 类型，通过 `export *` 同时暴露
5. **API 路径冗余版本号**：前缀 `/api/v1` 在当前阶段无必要

### 约束

- 不能破坏现有前端 API 调用逻辑（需同步适配）
- Service 层改动需保持向后兼容
- NestJS 拦截器、过滤器、守卫的执行顺序必须正确处理

## Goals / Non-Goals

**Goals:**

- 实现服务端全局统一的 JSON 响应格式：`{ success, code, message, data?, timestamp, path?, details? }`
- 通过 ResponseInterceptor 自动包裹所有 Controller 成功返回值，无需手动构建
- 通过 HttpExceptionFilter 统一处理所有异常并返回一致的错误格式
- 提供 `Result<T>` 类和 `BusinessException` 作为 Service 层的标准化成功/失败表达
- 统一 shared-types 中的 `ApiResponse<T>` 类型定义
- 移除 API 路径中的 `/v1` 版本前缀
- 前端请求中间件同步适配新响应格式

**Non-Goals:**

- 不改变 JWT 认证、签名验证、缓存等现有中间件逻辑
- 不引入第三方响应包装库（如 `@nestjs/common/serializer`）
- 不改变现有 Logger、Swagger 的工作方式

## Decisions

### D1：采用 Result 模式（Route C）而非纯拦截器方案（Route A）

**选择**：Service 返回 `Result<T>` → Controller 返回 raw `Result<T>` → ResponseInterceptor 识别并自动拆包包装。

**理由**：
- Service 层可以明确表达"此操作可能成功或失败"的语义，而不是通过 throw 异常来处理所有失败
- 对于业务逻辑失败（如"用户名已存在"、"余额不足"），`Result.fail(code, msg)` 比 `throw new BusinessException(...)` 更显式
- Controller 层保持薄薄一层：仅负责路由和参数提取，不为每个 return 写 `{ code: 200, data: ... }`

**替代方案**：
- Route A（纯拦截器）：拦截器自动包裹所有返回值，Service 失败通过 throw 表达。缺点：所有失败必须走异常机制，Service 层语义不清晰。
- Route B（ResponseHelper 工具类）：每个 Controller 显式调用 `ResponseHelper.success(data)`。缺点：重复代码多，没有全局统一保证。

### D2：ResponseInterceptor 识别 Result 类型自动拆包

**选择**：拦截器检测返回值是否为 `Result` 实例。如果是 `Result.success`，拆出 `data` 包装为成功响应；如果是 `Result.fail`，转为抛出 `BusinessException` 由异常过滤器处理。

```
Controller 返回 Result.success(data)
  → Interceptor 拆包 → { success: true, code: 200, message: 'ok', data, timestamp }

Controller 返回 Result.fail(40001, '用户名已存在')
  → Interceptor 转为 throw BusinessException
  → ExceptionFilter 捕获 → { success: false, code: 40001, message: '用户名已存在', ... }
```

**理由**：保持 Controller 返回值类型简单（`Result<T>`），拦截器统一处理包装逻辑。

### D3：统一响应格式

**选择**：

```typescript
// 成功
{
  success: true,
  code: 200,
  message: 'ok',
  data: T,
  timestamp: '2026-05-16T...'  // ISO 8601
}

// 失败
{
  success: false,
  code: number,        // HTTP 状态码或业务错误码
  message: string,
  timestamp: '...',
  path: '/api/auth/login',
  details?: [...]
}
```

**理由**：
- `success: boolean` 作为最顶层的真假标记，前端 `unpack` 中间件可直接判断，无需理解 code 语义
- `code` 在成功时固定为 200，在失败时为 HTTP 状态码或自定义业务错误码
- `timestamp` 统一出现在所有响应中
- `path` 仅在错误响应中出现（成功时 path 无实际价值）
- `details` 仅在校验错误时出现

### D4：移除 /api/v1 前缀

**选择**：`main.ts` 中 `app.setGlobalPrefix('api/v1')` 改为 `app.setGlobalPrefix('api')`。同时更新前端 `baseURL`。

**理由**：
- 项目处于早期阶段，无外部 API 消费者需要兼容
- 未来如需版本管理，可通过 Header（`Accept-Version`）或独立部署实现，不必在路径上体现

### D5：shared-types ApiResponse 统一

**选择**：删除 `common.schema.ts` 中的 `ApiResponseSchema` 和 `ApiResponse` 类型别名（当前无人使用），仅保留 `api.types.ts` 中的 interface 版本并更新结构。Zod schema 如需验证，新建 `response.schema.ts`。

**理由**：消除命名冲突，统一类型来源。

### D6：BusinessException 固定 HTTP 200 状态码

**选择**：`BusinessException` 的 HTTP 状态码固定为 **200 OK**，业务级失败仅通过响应体中 `success: false` + `code` 表达。

**理由**（关键设计决策）：
前端 unpack 中间件执行双层校验，**第1层 HTTP 状态码检查先于第2层业务 success 检查**：

```
unpack.ts 执行顺序:
  第1层: if (response.status >= 300) → throw HttpError  ← 阻塞，不到第2层
  第2层: if (responseData.success === false) → throw BusinessError  ← 业务码在此
```

如果 BusinessException 抛出时 HTTP 状态码为 4xx/5xx，unpack 在第1层就被 `HttpError` 拦截，**响应体中的业务错误码完全丢失**。只有 HTTP 200 才能使请求穿透到第2层校验，正确提取 `responseData.code` 构造 `BusinessError`。

这与 HTTP 协议不矛盾——HTTP 200 表示"请求成功到达并被正确处理"，业务层面的成功/失败由 body 内的 `success` 字段表达。

**替代方案**：
- 修改 unpack.ts 调整校验顺序（先 success 再 status）：会破坏网络错误、超时等场景的正确处理，因为 HTTP 4xx/5xx 错误体可能不包含 `success` 字段。
- 本方案修改量最小，且语义正确。

### D7：AuthController 使用 @Res({ passthrough: true }) 保留 Cookie 能力

**问题**：AuthController 的 login、refreshTokens、logout 三个接口需要 `response.cookie()` 操作 HttpOnly RefreshToken Cookie，不能完全移除 Response 对象。

**选择**：`@Res()` 改为 `@Res({ passthrough: true })`，继续向 AuthService 传递 response 以设置/清除 Cookie，但返回值走 NestJS 自动发送 + 拦截器链。

```
之前: @Res() response → response.status(200).json(...)  ← 绕过拦截器
之后: @Res({ passthrough: true }) response → response.cookie(...)  ← 仍可用
      return Result.success(data)  ← 走拦截器自动包装
```

### D8：AppController timestamp 去重

AppController 健康检查返回 `data: { status, timestamp, service }`，包含自己的 `timestamp`。ResponseInterceptor 会在外层再加 `timestamp`，导致重复。

**选择**：从 `data` 中移除 `timestamp` 字段，由外层统一注入。

### D9：业务错误码与 HTTP 状态码严格区分

**选择**：`BusinessException` 的 `code` 参数使用独立的业务错误码体系（前缀 `40001-49999`），与 HTTP 状态码（`400-599`）完全分离。`Result.fail(code, message)` 的 `code` 参数也统一使用业务错误码。

业务错误码区间分配：

| 区间 | 模块 | 说明 |
|------|------|------|
| `40001-40099` | Auth | 认证相关：用户名已存在、密码错误、验证码无效等 |
| `40100-40199` | User | 用户相关：用户不存在、权限不足等 |
| `40200-40999` | 预留 | 未来业务模块 |
| `50000-59999` | 系统 | 数据库错误、Redis 错误等系统级故障 |

**理由**：
- HTTP 状态码属于传输层协议（401 未认证、404 未找到），业务错误码属于领域语义（"用户名已存在"、"余额不足"）
- 前端 unpack 中间件在第2层校验提取 `responseData.code` 构造 `BusinessError`，业务错误码直接暴露给调用方，便于前端做差异化处理（如 40001 触发验证码刷新、40003 跳转密码重置页）
- 统一区间划分避免未来业务扩展时码值冲突

### D10：删除旧版 deprecated API 封装

**选择**：删除 `apps/web/src/api/index.ts`（已标记 `@deprecated` 的 axios 拦截器方式封装），业务 API 调用统一迁移到 `@/lib/request` 洋葱模型架构。

**理由**：
- 该文件使用旧版 axios 拦截器方式处理 401、错误响应等，与本次统一响应格式变更存在兼容风险
- 保持单一 API 调用方式减少维护负担，避免新老两套逻辑并存

### D11：分页响应格式标准化

**选择**：分页接口的 `data` 字段采用 `{ list: T[], pagination: { total, page, pageSize, totalPages } }` 结构。`pagination` 对象仅在分页接口中出现，普通接口的 `data` 直接为业务数据。

```typescript
// 分页接口响应
{
  success: true,
  code: 200,
  message: 'ok',
  data: {
    list: User[],                              // 当前页数据
    pagination: {
      total: 100,                              // 总记录数
      page: 1,                                 // 当前页码
      pageSize: 20,                            // 每页大小
      totalPages: 5                            // 总页数
    }
  },
  timestamp: '...'
}
```

**理由**：
- `shared-types` 已有 `PaginatedResponse<T>` 类型和 `PaginationSchema`，直接复用
- 前端可统一从 `data.list` 取列表、`data.pagination` 取分页信息，无需每个页面重复解析

### D12：修复 ExceptionFilter 覆盖 SignAuthGuard 自定义 code

**问题**：SignAuthGuard 抛出 `ForbiddenException({ code: SignErrorCode.INVALID_SIGNATURE, message, ... })`，但 HttpExceptionFilter 的 `EXCEPTION_MAP` 按异常类名 `"ForbiddenException"` 匹配后，将 `code` 字段覆盖为 `403`（HTTP 状态码数字），导致 SignAuthGuard 定义的字符串业务码丢失。

```
当前流程:
  SignAuthGuard → throw ForbiddenException({ code: 'INVALID_SIGNATURE', ... })
  ExceptionFilter → exceptionName='ForbiddenException'
                 → EXCEPTION_MAP 匹配 → mapped.code = 403
                 → errorResponse.code = 403  ← 覆盖！
```

**选择**：在 `handleHttpException` 中，当异常响应对象已包含自定义 `code` 字段时（类型为 string，非标准 HTTP 状态码数字），保留该自定义 code，不覆盖。

```typescript
// HttpExceptionFilter.handleHttpException 中的修复逻辑:
const exceptionResponse = exception.getResponse();
const customCode =
  typeof exceptionResponse === 'object' && exceptionResponse !== null
    ? (exceptionResponse as Record<string, unknown>).code
    : undefined;

// 如果异常响应自带自定义 code（如 'INVALID_SIGNATURE'），保留它
const code =
  typeof customCode === 'string' ? customCode : mapped.code;
```

**理由**：
- 守卫层已经携带了精确的业务错误标识（`INVALID_SIGNATURE`、`REPLAY_ATTACK` 等），过滤层不应覆盖
- HTTP 状态码 403 仍然正确（`ForbiddenException` 的 status），但 body 中的 `code` 保留原始语义

## Risks / Trade-offs

- **[风险] 双层校验顺序导致业务码丢失**：unpack.ts 第1层 HTTP 状态码检查先于第2层 success 检查，如果 BusinessException 返回非 200 HTTP 状态码，业务错误码被 HttpError 吞没 → **缓解**：D6 决策，BusinessException 固定 HTTP 200
- **[风险] AuthController Cookie 操作依赖 Response 对象**：login/refreshTokens/logout 需要 `response.cookie()` 设置/清除 HttpOnly Cookie → **缓解**：D7 决策，使用 `@Res({ passthrough: true })` 保留 Cookie 能力同时穿透拦截器
- **[风险] 前端 unpack 中间件改动**：`BusinessError` 构造函数当前使用 `code` 字段，改用 `success` 判断后需确保 `BusinessError.code` 来源正确 → **缓解**：同步更新 `unpack.ts`，`success: false` 时提取 `responseData.code` 构造 BusinessError
- **[风险] 401 跳转逻辑**：当前前端 `error.ts` 通过 `isHttpError(error, 401)` 判断，依赖 HTTP 状态码而非响应体 `success` → **缓解**：401 场景同时触发 HTTP 401 + 响应体 `success: false, code: 401`，前端逻辑不变但增加了双重保障
- **[风险] CacheInterceptor 兼容性**：CacheInterceptor 缓存的是 Controller 原始返回值（拦截器链中局部拦截器先于全局拦截器执行），缓存命中时 ResponseInterceptor 对其二次包装可能出现问题 → **缓解**：理论安全（CacheInterceptor 缓存原始返回值，ResponseInterceptor 在之后执行单次包装），但需在 tasks 中增加验证
- **[风险] Swagger 文档示例过时**：AuthController 的 `@ApiResponse({ example: ... })` 中响应示例是老格式，改造后需同步更新 → **缓解**：新增 task 4.3 更新 Swagger 文档示例
- **[风险] AppController 内外层 timestamp 重复**：健康检查的 `data.timestamp` 与外层拦截器注入的 `timestamp` 重复 → **缓解**：D8 决策，从 data 中移除内层 timestamp
- **[风险] 前端环境变量文件不止一个**：`VITE_API_BASE_URL` 可能在 `.env`、`.env.example`、`.env.development`、`.env.production` 等多处定义 → **缓解**：tasks 中补充检查所有 `.env*` 文件
- **[风险] 旧版 API 封装 `apps/web/src/api/index.ts`**：标记 `@deprecated` 的 axios 拦截器方式仍在使用，可能受响应格式变更影响 → **缓解**：列入 tasks 进行适配，或确认是否可移除
- **[Trade-off] Result 模式增加 Service 层代码量**：每个 Service 方法需要返回 `Result<T>` 而非直接返回数据 → 换来语义清晰和类型安全
- **[Trade-off] ResponseInterceptor 增加了请求处理的一环**：对性能影响极小（纳秒级），但增加了请求生命周期复杂性

## Migration Plan

1. **Server 端先行**：实现 Result + Interceptor + Filter 更新 + 移除 v1，确保所有 API 返回新格式
2. **测试 Server 端**：通过 curl 或集成测试验证响应格式
3. **shared-types 更新**：发布新类型定义
4. **Frontend 适配**：更新 `baseURL`、`unpack.ts`、`successCodes`，确保能正确解析新格式
5. **回归测试**：登录流程端到端验证

**Rollback 策略**：
- Server：Git revert，重新部署旧版本
- Frontend：Git revert，重新构建部署

因为是一次性部署升级（非灰度），前后端需同步上线。

## Open Questions

（无）
