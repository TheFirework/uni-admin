## Context

### 当前状态

Server 端配置管理存在 **三套并行读取方式**，约 50 处散落在 16 个文件中：

| 读取方式 | 调用点数 | 代表文件 | 问题 |
|----------|---------|----------|------|
| `process.env.*` 直读 | ~36 处 | jwt.config.ts, knex.config.ts, winston.config.ts, crypto.util.ts 等 | 无类型、无校验、无默认值管理 |
| `getEnv()` 手写校验函数 | 11 处 | env.config.ts → main.ts, guard, filter, logger, redis.config, knex.config | 与 process.env 并存，两套体系 |
| `ConfigService` DI 注入 | ~12 处 | auth.service, auth.module, jwt.strategy, refresh-token.strategy | 仅 auth 模块使用，未全局推广 |

此外还有 **6 个模块级常量**（JWT_CONFIG, redisConfig, knexConfig, winstonConfig, bullConfig, knife4jConfig）在 import 时即求值，无法参与 DI。

### 约束条件

- 项目已安装 `@nestjs/config ^3.2.0` 和 `zod ^4.4.3`（zod v4）
- `.env.*` 文件需保留多环境结构（Prisma 也依赖 `.env` 文件）
- Guard/Filter/Interceptor 在 `main.ts` 中通过 `new Xxx()` 创建，不经过 DI 容器
- `crypto.util.ts` 使用静态方法，无法接受构造器注入
- NestJS v10 + ESM (`"type": "module"`)

## Goals / Non-Goals

**Goals:**

1. 所有环境变量通过 **Zod Schema 声明式定义**，启动时自动完成类型转换与校验
2. 配置消费统一为两种模式：**ConfigService DI 注入**（Service/Strategy/Module）或 **`getConfig()` 同步访问**（Guard/Filter/纯函数/模块级配置）
3. 合并 JWT 密钥为单一 `JWT_SECRET`，纳入加密密钥 `ENCRYPTION_KEY` / `HMAC_SECRET` 到统一 Schema
4. 删除手写的 `buildAndValidate()` ~70 行校验逻辑，由 Zod 接管
5. 保留 `.env.*` 多环境文件结构，加载策略不变

**Non-Goals:**

- 不引入新的运行时配置中心（如 Consul/etcd/Nacos）
- 不改变 `.env.*` 文件的变量命名规范（保持 UPPER_SNAKE_CASE）
- 不重构 Prisma 的数据库连接方式
- 不将 Guard/Filter 全部强制改为 DI（main.ts 中手动创建的模式保留，但改用 `getConfig()`）

## Decisions

### D1: Zod 集成方式 — 手动 `parseAsync` 而非 `zod-to-json-schema`

**选择**: 在 `app.module.ts` 中手动调用 `schema.parseAsync(process.env)` 后传入 ConfigModule

**备选方案**:

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| A) `zod-to-json-schema` | 将 Zod schema 转为 JSON Schema 传给 `validationSchema` | @nestjs/config 原生支持 | zod v4 兼容性不确定；丢失 Zod 的 .transform() 能力；错误信息不够精准 |
| B) **手动 parseAsync ✅** | 自行 parse 后用 `load` 参数注入已验证值 | 完整保留 Zod transform/refine；错误信息精确到字段级；zod v4 原生支持 | 需写 ~10 行胶水代码 |

**理由**: `@nestjs/config` 的 `validationSchema` 基于 Joi 设计，对 Zod 的支持通过 `zod-to-json-schema` 桥接，会丢失 `.transform()` 等核心能力。手动 parse 更直接且可控。

### D2: `getConfig()` 函数设计 — 缓存只读代理

**选择**: 保留一个 `getConfig(): Readonly<ValidatedConfig>` 同步函数，内部从已初始化的 ConfigModule 内部状态构建

```
getConfig()
    │
    ├─ 首次调用: 从 ConfigModule 已验证的 internalConfig 构建 Readonly 对象 + Object.freeze
    ├─ 后续调用: 返回缓存（同现有 getEnv 行为）
    └─ 类型: ValidatedConfig (由 Zod infer 出来)
```

**备选方案**:

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| A) **getConfig() 缓存 ✅** | 模块级缓存 + Readonly | 改动最小；非 DI 场景无侵入 | 需确保在 ConfigModule 加载后调用 |
| B) 纯 DI + APP_INITIALIZER | 所有消费方都走 DI | 理论最纯粹 | winston.config 等声明式对象难以改造；Guard/Filter 在 main.ts new 出来 |

**理由**: 务实平衡。DI 是主力路径，`getConfig()` 作为必要的 fallback 给无法参与 DI 的上下文使用。

### D3: 模块级配置常量改造 — 工厂函数模式

**选择**: 将 `redisConfig` / `JWT_CONFIG` / `knexConfig` 等 top-level const 改为 **工厂函数**

```typescript
// Before (import 时求值，无法获取运行时配置)
export const redisConfig: RedisConfig = { host: getEnv().redisHost, ... };

// After (延迟求值，调用时才读取配置)
export function createRedisConfig(config: ValidatedConfig): RedisConfig {
  return { host: config.redisHost, ... };
}
```

**理由**: 保持配置的声明式特性，同时解决循环依赖和时序问题。调用方在 Module 的 `useFactory` 或 Service 构造器中调用。

### D4: JWT 密钥合并策略

**选择**: 统一使用 `JWT_SECRET` 一个密钥同时签名 Access Token 和 Refresh Token

```typescript
// Before: 两套独立密钥（jwt.config.ts）
JWT_ACCESS_SECRET     → accessTokenSecret
JWT_REFRESH_SECRET   → refreshTokenSecret

// After: 统一密钥（从 env.config.ts 的 JWT_SECRET 派生）
JWT_SECRET           → 同时用于 access + refresh token 签名
```

**安全说明**: 分离 access/refresh 密钥的理论优势是 refresh 泄露不影响 access，但在当前架构中两者存储于同一进程内存，分离的实际安全收益有限。如未来需要可轻松拆分。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **Zod v4 API 变更** | zod 4 的 `.transform()` / `.refine()` 语法可能与示例代码不同 | 实施时查阅 zod 4 文档；编写后立即 `pnpm dev` 启动验证 |
| **winston.config 时序** | winstonConfig 在 LoggerService 构造前就被 import | `buildLogFormat()` 改为接收参数或内部调用 `getConfig()` |
| **crypto.util 静态方法** | `CryptoUtil.encrypt()` 是静态方法，无法注入 | `getEncryptionKey()` 内部调用 `getConfig().encryptionKey` |
| **Prisma .env 依赖** | Prisma CLI 直接读 `.env` 文件，不走 ConfigModule | 保留 `.env` 和 `.env.development` 不变；确保变量名一致 |
| **启动失败行为变化** | 当前部分缺失变量只是 warn，重构后会 fail-fast | 这是期望行为（fail-fast 原则）；在 proposal 中已明确 |

## Migration Plan

### 实施顺序（按依赖拓扑排序）

```
Phase 1: 基础设施层（不影响业务逻辑）
  1.1 创建 config/env.validation.ts (Zod Schema)
  1.2 重写 config/env.config.ts (getConfig)
  1.3 修改 app.module.ts (接入 validationSchema)

Phase 2: 配置模块改造（内部重构）
  2.1 重写 config/jwt.config.ts (合并密钥 + 工厂函数)
  2.2 重写 config/redis.config.ts (工厂函数)
  2.3 重写 config/knex.config.ts (工厂函数)
  2.4 修改 config/winston.config.ts (getConfig)
  2.5 修改 config/bull.config.ts (getConfig)
  2.6 修改 config/knife4j.config.ts (getConfig)

Phase 3: 业务消费方迁移
  3.1 修改 main.ts (getConfig 替代动态 import)
  3.2 修改 common/guards/sign-auth.guard.ts (getConfig)
  3.3 修改 common/filters/http-exception.filter.ts (getConfig)
  3.4 修改 common/logger/logger.service.ts (ConfigService DI)
  3.5 修改 shared/utils/crypto.util.ts (getConfig)
  3.6 修改 modules/auth/* (已有 ConfigService，清理 fallback 默认值)

Phase 4: 收尾验证
  4.1 更新 .env.* 文件（补齐 ENCRYPTION_KEY/HMAC_SECRET 占位符）
  4.2 删除废弃的 getEnv 导出
  4.3 pnpm dev 启动验证 + pnpm typecheck
```

### 回滚方案

```bash
git revert <commit-hash>   # 单次 revert 即可完全恢复
# .env.* 文件不受代码变更影响，无需额外操作
```
