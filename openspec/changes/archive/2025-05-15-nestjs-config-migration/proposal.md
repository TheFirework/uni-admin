## Why

当前 Server 端配置管理存在 **三套并行体系**（`process.env` 直读、手写 `getEnv()`、`ConfigService` DI），导致约 50 处配置读取分散在 6 种不同模式中，缺乏统一校验机制、类型安全靠手动维护、多环境 `.env.*` 文件高度重复且容易漂移。项目已安装 `@nestjs/config` 和 `zod` 但未形成合力。本次重构将所有配置收敛到 **Zod Schema 声明式校验 + ConfigService 统一注入** 的单一架构上。

## What Changes

- **新增** `config/env.validation.ts` — Zod Schema 定义全部环境变量（含类型转换、枚举约束、自定义校验规则）
- **重写** `config/env.config.ts` — 从 ~150 行手写校验逻辑简化为 `getConfig()` 包装函数（从已校验的 ConfigService 构建类型安全对象）
- **修改** `app.module.ts` — `ConfigModule.forRoot()` 加入 `validationSchema`，启动时即对 `.env` 文件做严格校验
- **合并** JWT 密钥体系 — 将 `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`（jwt.config.ts）合并为统一的 `JWT_SECRET`（与 env.config.ts 对齐）
- **纳入** 加密密钥管理 — 将 `ENCRYPTION_KEY` / `HMAC_SECRET`（crypto.util.ts 静态默认值）纳入统一 Schema
- **改造** 全部 config 常量模块 — `jwt.config.ts`、`redis.config.ts`、`knex.config.ts`、`winston.config.ts`、`bull.config.ts`、`knife4j.config.ts` 从 top-level const 改为接受参数的工厂函数或直接使用 `getConfig()`
- **改造** 非 DI 场景 — Guard/Filter/Interceptor/CryptoUtil 统一通过 `getConfig()` 或构造器注入获取配置
- **保留** 多环境 `.env.*` 文件结构（`.env.development` / `.env.test` / `.env.production` / `.env.local` / `.env`），由 `ConfigModule.forRoot` 的 `envFilePath` 策略管理加载优先级
- **BREAKING** 删除 `getEnv()` 函数导出名改为 `getConfig()`，调用方需同步更新（共 11 处）

### Capabilities

#### New Capabilities
- `validated-config`: 基于 Zod Schema 的声明式环境变量校验与类型安全配置系统，涵盖全部 ~20 个环境变量的定义、转换、校验与统一注入

### Modified Capabilities
（无现有 spec 需要变更，本次为基础设施层重构）

## Impact

| 影响域 | 详情 |
|--------|------|
| **涉及文件** | ~16 个文件（1 新建 + 12 重构/修改 + 5 `.env.*` 微调） |
| **配置消费点** | ~50 处 `process.env`/`getEnv()`/`ConfigService` 调用点统一为 2 种模式：DI 注入 或 `getConfig()` 同步访问 |
| **依赖变化** | 无新增依赖（`@nestjs/config` ^3.2.0 和 `zod` ^4.4.3 已安装）；需确认 `zod` 与 `@nestjs/config` 的集成方式（`zod-to-json-schema` 或手动 `parseAsync`） |
| **启动行为** | 启动时若环境变量缺失/格式错误会立即抛出明确异常并终止（当前是部分 warn + 部分 error 混合） |
| **回滚方案** | Git revert 即可恢复原有 `env.config.ts` 手写校验逻辑；`.env.*` 文件不受影响 |
