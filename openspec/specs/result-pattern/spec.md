# Result Pattern

Result 模式在 Service 层的应用，提供类型安全的成功与失败表达。

## Purpose

为 Service 层提供标准化的返回值类型 `Result<T>`，使业务逻辑能够显式表达操作的成功或失败结果。配合全局 ResponseInterceptor 和 HttpExceptionFilter，实现 Controller 层的统一响应包装。

## ADDED Requirements

### Requirement: Result 类提供标准化的成功与失败表达

系统 SHALL 提供 `Result<T>` 泛型类，用于 Service 层方法的返回值类型。Result 类 SHALL 提供静态工厂方法 `Result.success(data)` 创建成功实例和 `Result.fail(code, message)` 创建失败实例。

#### Scenario: Service 方法返回成功结果

- **WHEN** Service 方法执行成功并返回 `Result.success({ id: 1, name: 'admin' })`
- **THEN** 返回的 Result 实例 `.isSuccess` 为 `true`
- **AND** `.data` 为 `{ id: 1, name: 'admin' }`

#### Scenario: Service 方法返回失败结果

- **WHEN** Service 方法执行业务校验失败并返回 `Result.fail(40001, '用户名已存在')`
- **THEN** 返回的 Result 实例 `.isSuccess` 为 `false`
- **AND** `.error.code` 为 `40001`
- **AND** `.error.message` 为 `'用户名已存在'`

### Requirement: BusinessException 承载业务失败

系统 SHALL 提供 `BusinessException` 类继承自 `HttpException`，用于将 `Result.fail` 转换为 NestJS 异常机制。`BusinessException` 的构造函数 SHALL 接受业务错误码和错误消息。

#### Scenario: Result.fail 转换为 BusinessException

- **WHEN** ResponseInterceptor 检测到 Controller 返回 `Result.fail(40001, '操作失败')`
- **THEN** 抛出 `new BusinessException(40001, '操作失败')`
- **AND** HttpExceptionFilter 捕获后返回 `{ success: false, code: 40001, message: '操作失败', ... }`

#### Scenario: Service 层直接抛出 BusinessException

- **WHEN** Service 方法直接 `throw new BusinessException(40002, '余额不足')`
- **THEN** 异常被 HttpExceptionFilter 捕获
- **AND** 返回 `{ success: false, code: 40002, message: '余额不足', ... }`

### Requirement: Result 类型守卫

`Result` 类 SHALL 提供类型守卫方法，使 TypeScript 编译器能在条件分支中正确推断类型。

#### Scenario: 通过 isSuccess 进行类型收窄

- **WHEN** 调用方使用 `if (result.isSuccess) { }` 判断
- **THEN** 在 if 分支内 TypeScript 将 `result.data` 推断为非 undefined
- **AND** 在 else 分支内 `result.error` 被推断为非 undefined
