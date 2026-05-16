/**
 * 环境变量 Zod Schema 定义
 *
 * 双层设计:
 *   1. validationSchema — 用于 ConfigModule.validate()，保持原始 UPPER_SNAKE_CASE 键名
 *      （ConfigService.get('JWT_SECRET') 依赖此命名）
 *   2. envSchema        — 用于 getConfig()，输出 camelCase 类型安全对象
 *
 * 两层共享相同的校验规则，仅最终输出格式不同
 */

import { z } from 'zod';

// ====== 原始 Schema（保持 UPPER_SNAKE_CASE 键名）======
// 用于 ConfigModule.validate()，确保 ConfigService.get('KEY_NAME') 正常工作

const rawSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.coerce.number().min(0).max(15).default(0),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET 不能为空'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().default('default-encryption-key-32-characters-long!!'),
  HMAC_SECRET: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((val) => (!val ? [] : val.split(',').map((s) => s.trim()))),
  ENABLE_SWAGGER: z
    .union([z.literal('true'), z.literal('1'), z.literal('false'), z.literal('0'), z.string()])
    .transform((val) => val === 'true' || val === '1')
    .default(false),
  ENABLE_BULL_DASHBOARD: z
    .union([z.literal('true'), z.literal('1'), z.literal('false'), z.literal('0'), z.string()])
    .transform((val) => val === 'true' || val === '1')
    .default(false),
  ENABLE_KNIFE4J: z
    .union([z.literal('true'), z.literal('1'), z.literal('false'), z.literal('0'), z.string()])
    .transform((val) => val !== 'false' && val !== '0')
    .default(true),
});

/** ConfigModule.validate() 专用：保持原始键名 + 校验 + 弱密钥警告 */
export const validationSchema = rawSchema.refine(
  (data) => {
    if (data.JWT_SECRET.length < 32 || data.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      console.warn(
        '[Config] ⚠️ 警告: JWT_SECRET 密钥强度不足或仍在使用默认值，请更改为 ≥32 字符的安全密钥',
      );
    }
    return true;
  },
  { message: 'JWT_SECRET 安全检查' },
);

// ====== CamelCase Schema（用于 getConfig() 统一访问层）======

const envSchema = rawSchema.transform((data) => ({
  appEnv: data.NODE_ENV,
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  redisHost: data.REDIS_HOST,
  redisPort: data.REDIS_PORT,
  redisPassword: data.REDIS_PASSWORD,
  redisDb: data.REDIS_DB,
  jwtSecret: data.JWT_SECRET,
  jwtExpiresIn: data.JWT_EXPIRES_IN,
  encryptionKey: data.ENCRYPTION_KEY,
  hmacSecret: data.HMAC_SECRET ?? data.ENCRYPTION_KEY,
  corsOrigins: data.CORS_ORIGINS,
  enableSwagger: data.NODE_ENV === 'production' ? false : data.ENABLE_SWAGGER,
  enableBullDashboard: data.ENABLE_BULL_DASHBOARD,
  enableKnife4j: data.ENABLE_KNIFE4J,
}));

export { envSchema };

/** 从 Zod Schema 推断出的配置类型（camelCase） */
export type ValidatedConfig = z.infer<typeof envSchema>;
