/**
 * Zod Schema 共享验证层 - 统一导出入口
 *
 * 本文件统一导出所有 Zod schema 和对应的 TypeScript 类型推导，
 * 便于在前后端之间共享验证逻辑。
 *
 * 使用示例：
 * ```typescript
 * import { Schemas, CreateUserInput } from '@uni-admin/shared-types/schemas';
 *
 * // 验证用户输入
 * const result = Schemas.user.create.safeParse(userData);
 * if (result.success) {
 *   // 类型安全的已验证数据
 *   const user: CreateUserInput = result.data;
 * }
 * ```
 */

// ==================== 通用 Schema 导出 ====================
export {
  PaginationSchema,
  IdSchema,
  UuidSchema,
  DateRangeSchema,
  SortSchema,
  QueryParamsSchema,
} from './common.schema.js';

export type {
  PaginationInput,
  IdInput,
  UuidInput,
  DateRangeInput,
  SortInput,
  QueryParamsInput,
} from './common.schema.js';

// ==================== 用户相关 Schema 导出 ====================
export {
  UserRoleEnum,
  CreateUserSchema,
  UpdateUserSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  UserQuerySchema,
} from './user.schema.js';

export type {
  UserRole,
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  ResetPasswordInput,
  UserQueryInput,
} from './user.schema.js';

// ==================== 认证相关 Schema 导出 ====================
export {
  LoginSchema,
  RefreshTokenSchema,
  LogoutSchema,
  VerifyCodeSchema,
  LoginWithCodeSchema,
  ForgotPasswordSchema,
  TokenResponseSchema,
} from './login.schema.js';

export type {
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  VerifyCodeInput,
  LoginWithCodeInput,
  ForgotPasswordInput,
  TokenResponse,
} from './login.schema.js';

// ==================== 聚合对象导出 ====================
/**
 * Schemas 聚合对象
 *
 * 按业务域分组组织所有 schema，提供结构化的访问方式。
 * 推荐使用此对象进行 schema 导入，便于代码补全和维护。
 */
export const Schemas = {
  /** 通用 schema（分页、ID、排序等） */
  common: {
    pagination: /* @__PURE__ */ (() => {
      const { PaginationSchema } = require('./common.schema.js');
      return PaginationSchema;
    })(),
    id: /* @__PURE__ */ (() => {
      const { IdSchema } = require('./common.schema.js');
      return IdSchema;
    })(),
    uuid: /* @__PURE__ */ (() => {
      const { UuidSchema } = require('./common.schema.js');
      return UuidSchema;
    })(),
    dateRange: /* @__PURE__ */ (() => {
      const { DateRangeSchema } = require('./common.schema.js');
      return DateRangeSchema;
    })(),
    sort: /* @__PURE__ */ (() => {
      const { SortSchema } = require('./common.schema.js');
      return SortSchema;
    })(),
    queryParams: /* @__PURE__ */ (() => {
      const { QueryParamsSchema } = require('./common.schema.js');
      return QueryParamsSchema;
    })(),
  },

  /** 用户相关 schema */
  user: {
    create: /* @__PURE__ */ (() => {
      const { CreateUserSchema } = require('./user.schema.js');
      return CreateUserSchema;
    })(),
    update: /* @__PURE__ */ (() => {
      const { UpdateUserSchema } = require('./user.schema.js');
      return UpdateUserSchema;
    })(),
    changePassword: /* @__PURE__ */ (() => {
      const { ChangePasswordSchema } = require('./user.schema.js');
      return ChangePasswordSchema;
    })(),
    resetPassword: /* @__PURE__ */ (() => {
      const { ResetPasswordSchema } = require('./user.schema.js');
      return ResetPasswordSchema;
    })(),
    query: /* @__PURE__ */ (() => {
      const { UserQuerySchema } = require('./user.schema.js');
      return UserQuerySchema;
    })(),
  },

  /** 认证相关 schema */
  auth: {
    login: /* @__PURE__ */ (() => {
      const { LoginSchema } = require('./login.schema.js');
      return LoginSchema;
    })(),
    loginWithCode: /* @__PURE__ */ (() => {
      const { LoginWithCodeSchema } = require('./login.schema.js');
      return LoginWithCodeSchema;
    })(),
    refreshToken: /* @__PURE__ */ (() => {
      const { RefreshTokenSchema } = require('./login.schema.js');
      return RefreshTokenSchema;
    })(),
    logout: /* @__PURE__ */ (() => {
      const { LogoutSchema } = require('./login.schema.js');
      return LogoutSchema;
    })(),
    verifyCode: /* @__PURE__ */ (() => {
      const { VerifyCodeSchema } = require('./login.schema.js');
      return VerifyCodeSchema;
    })(),
    forgotPassword: /* @__PURE__ */ (() => {
      const { ForgotPasswordSchema } = require('./login.schema.js');
      return ForgotPasswordSchema;
    })(),
    tokenResponse: /* @__PURE__ */ (() => {
      const { TokenResponseSchema } = require('./login.schema.js');
      return TokenResponseSchema;
    })(),
  },
} as const;

/**
 * Schema 名称到实际 Schema 对象的映射类型
 * 用于需要动态选择 schema 的场景
 */
export type SchemaMap = typeof Schemas;
