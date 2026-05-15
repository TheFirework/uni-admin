## 1. Zod Schema 基础设施

- [ ] 1.1 创建 `config/env.validation.ts`，定义 `envSchema`（Zod v4 对象），覆盖全部 16 个环境变量：NODE_ENV(enum)、PORT(number 1-65535)、DATABASE_URL(必填 string)、REDIS_HOST、REDIS_PORT、REDIS_PASSWORD、REDIS_DB、JWT_SECRET(必填, ≥32字符 warn)、JWT_EXPIRES_IN、ENCRYPTION_KEY、HMAC_SECRET、CORS_ORIGINS(逗号→数组 transform)、ENABLE_SWAGGER(boolean)、ENABLE_BULL_DASHBOARD(boolean)、ENABLE_KNIFE4J(boolean)
- [ ] 1.2 在 Schema 中使用 `.transform()` 实现类型自动转换（string→number、string→boolean、string→string[]），使用 `.refine()` 实现 JWT_SECRET 弱密钥 warn 和生产环境强制关闭 Swagger
- [ ] 1.3 从 Zod schema `infer` 出 `ValidatedConfig` 类型导出

## 2. getConfig() 统一访问层

- [ ] 2.1 重写 `config/env.config.ts`：删除 ~150 行手写 `buildAndValidate()` / `parseBoolean()` / `parseNumber()` 等函数；实现新的 `getConfig(): Readonly<ValidatedConfig>` 函数，内部从 ConfigModule 已验证的 internalConfig 构建冻结对象并缓存
- [ ] 2.2 确保 `getConfig()` 在首次调用时读取已校验的配置值（通过 `@nestjs/config` 的内部存储或重新 parse），返回 `Object.freeze()` 包装的只读对象
- [ ] 2.3 导出 `ValidatedConfig` 类型供外部使用

## 3. ConfigModule 接入校验

- [ ] 3.1 修改 `app.module.ts`：在 `ConfigModule.forRoot()` 中加入自定义验证逻辑——先调用 `envSchema.parseAsync(process.env)` 校验，将结果通过 `load` 参数注入 ConfigModule
- [ ] 3.2 验证启动行为：缺失必填变量时立即终止并输出明确错误信息；弱 JWT_SECRET 时输出 warn 但继续启动

## 4. 配置模块改造（工厂函数模式）

- [ ] 4.1 重写 `config/jwt.config.ts`：删除 `JWT_CONFIG` 常量和 `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` 变量；创建 `createJwtConfig(config: ValidatedConfig): JwtConfig` 工厂函数，accessTokenSecret 和 refreshTokenSecret 统一源自 config.jwtSecret
- [ ] 4.2 重写 `config/redis.config.ts`：删除 top-level `redisConfig` 常量；创建 `createRedisConfig(config: ValidatedConfig): RedisConfig` 工厂函数，消除内部的 `process.env.REDIS_DB` 直读
- [ ] 4.3 重写 `config/knex.config.ts`：删除 top-level `knexConfig` 常量；创建 `createKnexConfig(config: ValidatedConfig): Knex.Config` 工厂函数，消除内部的 `process.env.DB_*` 直读和 `getEnv().isProduction`
- [ ] 4.4 修改 `config/winston.config.ts`：将 `const isProduction = process.env.NODE_ENV === 'production'` 改为在 `buildLogFormat()` 内部调用 `getConfig().appEnv === 'production'`
- [ ] 4.5 修改 `config/bull.config.ts`：将 `process.env.ENABLE_BULL_DASHBOARD === 'true'` 改为读取 `getConfig().enableBullDashboard`
- [ ] 4.6 修改 `config/knife4j.config.ts`：将 `process.env.ENABLE_KNIFE4J !== 'false'` 和 `process.env.npm_package_version` 改为读取 `getConfig()`

## 5. 业务消费方迁移 — main.ts 与全局组件

- [ ] 5.1 修改 `main.ts`：删除 `const { getEnv } = await import('./config/env.config.js')` 动态 import；改为顶层 `import { getConfig } from './config/env.config.js'` + `const config = getConfig()`
- [ ] 5.2 修改 `main.ts` 中所有 `env.xxx` 引用为 `config.xxx`（port、corsOrigins、enableSwagger、buildVersion、appEnv）
- [ ] 5.3 修改 `common/guards/sign-auth.guard.ts`：将 `getEnv()` 替换为 `getConfig()`，更新 `env.jwtSecret` → `config.jwtSecret`
- [ ] 5.4 修改 `common/filters/http-exception.filter.ts`：将 `getEnv()` 替换为 `getConfig()`
- [ ] 5.5 修改 `common/interceptors/logging.interceptor.ts`：如有配置读取则同步迁移至 `getConfig()`

## 6. 业务消费方迁移 — Service 与 Strategy

- [ ] 6.1 修改 `common/logger/logger.service.ts`：将两处 `getEnv()` 调用改为构造器注入 `ConfigService` 或 `getConfig()`（根据 DI 可行性选择）
- [ ] 6.2 清理 `modules/auth/auth.service.ts`：移除所有 `configService.get<string>('XXX') || 'fallback-default'` 中的 fallback 默认值（Zod schema 已保证类型和默认值）
- [ ] 6.3 清理 `modules/auth/strategies/jwt.strategy.ts`：移除 `|| 'your-super-secret-jwt-key-change-in-production'` fallback
- [ ] 6.4 清理 `modules/auth/strategies/refresh-token.strategy.ts`：同上
- [ ] 6.5 修改 `modules/auth/auth.module.ts`：清理 useFactory 中的 fallback 默认值

## 7. 工具函数迁移

- [ ] 7.1 修改 `shared/utils/crypto.util.ts`：将 `process.env.ENCRYPTION_KEY` 和 `process.env.HMAC_SECRET` 直读替换为 `getConfig().encryptionKey` 和 `getConfig().hmacSecret`

## 8. .env 文件更新与收尾

- [ ] 8.1 更新 `.env.example`：添加 `ENCRYPTION_KEY`、`HMAC_SECRET`、`REDIS_DB`、`ENABLE_BULL_DASHBOARD`、`ENABLE_KNIFE4J` 变量说明；移除 `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` 相关说明
- [ ] 8.2 更新 `.env.development`：添加 `ENCRYPTION_KEY` 和 `HMAC_SECRET` 占位符
- [ ] 8.3 更新 `.env.test`：同上
- [ ] 8.4 更新 `.env.production`：添加新变量占位符
- [ ] 8.5 更新 `.env`（Prisma 读取用）：保持与 `.env.development` 一致

## 9. 验证与清理

- [ ] 9.1 运行 `pnpm typecheck`（tsc --noEmit）确认无类型错误
- [ ] 9.2 运行 `pnpm dev` 确认应用正常启动，环境变量加载正确
- [ ] 9.3 全局搜索确认无残留的 `process.env.` 直读（除 app.module.ts 中 ConfigModule.forRoot 必要引用外）和无残留的旧 `getEnv()` 调用
- [ ] 9.4 删除 `env.config.ts` 中废弃的 `ServerEnvConfig` 接口（已被 `ValidatedConfig` 替代）和旧的 `getEnv` 导出名
