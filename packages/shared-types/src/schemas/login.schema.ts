import { z } from 'zod';

// ==================== 登录 Schema ====================
// 用于用户登录认证的场景
export const LoginSchema = z.object({
  // 用户名（可以是用户名或邮箱）
  username: z
    .string()
    .min(1, '用户名不能为空')
    .trim(), // 自动去除首尾空格

  // 密码
  password: z
    .string()
    .min(1, '密码不能为空'),
});

// 登录输入类型
export type LoginInput = z.infer<typeof LoginSchema>;

// ==================== 刷新令牌 Schema ====================
// 用于刷新访问令牌的场景
export const RefreshTokenSchema = z.object({
  // 刷新令牌（可选，某些场景可能从 cookie 获取）
  refreshToken: z
    .string()
    .min(1, 'RefreshToken 不能为空')
    .optional(),
});

// 刷新令牌输入类型
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// ==================== 登出 Schema ====================
// 用于用户登出的场景（可携带要注销的令牌）
export const LogoutSchema = z.object({
  // 可选：指定要注销的刷新令牌
  refreshToken: z.string().optional(),
});

// 登出输入类型
export type LogoutInput = z.infer<typeof LogoutSchema>;

// ==================== 验证码相关 Schema ====================
// 图形验证码/短信验证码验证
export const VerifyCodeSchema = z.object({
  // 验证码值
  code: z
    .string()
    .min(1, '验证码不能为空')
    .min(4, '验证码至少4位')
    .max(6, '验证码最多6位')
    .regex(/^\d+$/, '验证码必须为数字'),

  // 验证码标识（用于服务端校验）
  codeId: z
    .string()
    .min(1, '验证码标识不能为空'),
});

// 验证码输入类型
export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>;

// ==================== 带验证码的登录 Schema ====================
// 用于需要图形验证码的登录场景（如多次失败后）
export const LoginWithCodeSchema = LoginSchema.extend({
  // 图形验证码
  verifyCode: VerifyCodeSchema,
});

// 带验证码的登录输入类型
export type LoginWithCodeInput = z.infer<typeof LoginWithCodeSchema>;

// ==================== 忘记密码/重置密码请求 Schema ====================
// 用于发起密码重置流程
export const ForgotPasswordSchema = z.object({
  // 用户邮箱或用户名
  account: z
    .string()
    .min(1, '账号不能为空'),

  // 验证码（如果启用了验证码）
  verifyCode: VerifyCodeSchema.optional(),
});

// 忘记密码输入类型
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// ==================== Token 响应结构 Schema ====================
// 认证成功后返回的令牌信息结构
export const TokenResponseSchema = z.object({
  // 访问令牌（用于API调用认证）
  accessToken: z.string().min(1, 'accessToken 不能为空'),

  // 刷新令牌（用于获取新的访问令牌）
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),

  // 令牌类型（通常为 Bearer）
  tokenType: z.string().default('Bearer'),

  // 访问令牌过期时间（秒）
  expiresIn: z.number().positive('过期时间必须大于0'),
});

// Token 响应类型
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
