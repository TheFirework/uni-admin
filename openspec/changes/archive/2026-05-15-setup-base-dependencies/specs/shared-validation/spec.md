## ADDED Requirements

### Requirement: Zod Schema 定义规范
系统 MUST 在 shared-types 包中定义 Zod schema，供 Web 和 Server 两端复用，确保前后端数据校验规则一致。

**Schema 存储位置**: `packages/shared-types/src/schemas/`
**命名规范**: `{entity}.schema.ts`（如 `user.schema.ts`, `login.schema.ts`）

**设计原则**:
- 每个 DTO 对应一个 Zod schema（如 LoginDto ↔ loginSchema）
- Schema MUST 包含完整的验证规则（类型、长度、正则、枚举等）
- 使用 `z.infer<>` 自动推导 TypeScript 类型（避免重复定义）

#### Scenario: 前后端共享用户创建 Schema
```typescript
// packages/shared-types/src/schemas/user.schema.ts
export const createUserSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
});

// 自动推导 TypeScript 类型
export type CreateUserInput = z.infer<typeof createUserSchema>;
```

- **WHEN** Web 端使用 vee-validate 集成 Zod schema 进行表单验证
- **AND** Server 端使用相同 schema 在 Service 层进行二次验证
- **THEN** 两端的验证规则 MUST 保持同步（修改一处即生效）

---

### Requirement: Class-Validator DTO 标准化
系统 MUST 在 Server 端 Controller 层使用 class-validator 装饰器定义 DTO，配合 ValidationPipe 自动验证请求参数。

**DTO 存储位置**: `apps/server/src/modules/{module}/dto/`
**命名规范**: `{action}.dto.ts`（如 `login.dto.ts`, `create-user.dto.ts`）

**常用装饰器**:
- 类型验证: `@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsEmail()`, `@IsEnum()`
- 长度限制: `@MinLength()`, `@MaxLength()`, `@Min()`, `@Max()`
- 格式验证: `@Matches()` (正则), `@IsISO8601()` (日期), `@IsUUID()`
- 条件验证: `@IsOptional()`, `@ValidateIf()`
- 数组验证: `@ArrayMinSize()`, `@ArrayMaxSize()`

#### Scenario: 登录请求参数验证
```typescript
// apps/server/src/modules/auth/dto/login.dto.ts
export class LoginDto {
  @IsString()
  @Message('用户名不能为空')
  username: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password: string;
}
```

- **WHEN** 用户提交登录请求缺少 username 字段
- **THEN** ValidationPipe MUST 返回 HTTP 400 Bad Request
- **AND** 错误详情 MUST 包含自定义中文消息 "用户名不能为空"

#### Scenario: 白名单模式过滤未知字段
- **WHEN** 用户提交的请求体包含未定义的字段（如 `{username, password, isAdmin: true}`）
- **AND** ValidationPipe 配置 `whitelist: true, forbidNonWhitelisted: true`
- **THEN** 系统 MUST 自动剥离 `isAdmin` 字段
- **AND** 返回 HTTP 400 Bad Request
- **AND** 错误消息为 "属性 isAdmin 不应存在"

---

### Requirement: VeeValidate + Zod 前端集成
系统 MUST 在 Web 端使用 vee-validate 集成 Zod schema，提供声明式的 Vue 表单验证体验。

**组件绑定**:
- 使用 `<Form>` + `<Field>` + `<ErrorMessage>` 组件
- 或使用 `useForm` + `useField` 组合式函数
- 验证时机: blur（失焦）、input（输入中）、submit（提交时，默认）

**错误展示**:
- 字段级错误: 输入框下方红色文字（支持 i18n）
- 表单级错误: 弹窗提示（如网络错误、服务器异常）

#### Scenario: 登录表单实时验证
<template>
  <Form :validation-schema="loginSchema" @submit="onSubmit">
    <Field name="username" v-slot="{ field, errors }">
      <input v-bind="field" placeholder="用户名" />
      <ErrorMessage name="username" as="span" class="error" />
    </Field>
    <Field name="password" v-slot="{ field, errors }">
      <input v-bind="field" type="password" placeholder="密码" />
      <ErrorMessage name="password" as="span" class="error" />
    </Field>
    <button type="submit">登录</button>
  </Form>
</template>

- **WHEN** 用户在用户名输入框输入少于 3 个字符并移开焦点
- **THEN** 输入框下方 MUST 立即显示红色错误提示 "用户名至少 3 个字符"
- **AND** 登录按钮 MUST 保持禁用状态（直到所有验证通过）

#### Scenario: 表单提交前的全量验证
- **WHEN** 用户点击登录按钮（触发 submit 事件）
- **AND** 表单存在未修正的验证错误
- **THEN** vee-validate MUST 阻止表单提交
- **AND** 自动滚动到第一个错误字段并聚焦
- **AND** 不发送 HTTP 请求到后端
