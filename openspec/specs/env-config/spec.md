# Purpose

定义 uni-admin 项目环境变量（.env）的企业级标准配置规范，涵盖 Web 端（Vite + Vue3）和 Server 端（NestJS）的独立配置模块架构、多环境文件体系、TypeScript 类型安全、Zod 声明式校验、ConfigService DI 注入、工厂函数模式、构建元数据注入、功能开关控制和敏感信息安全管理。

---

## Requirements

### Requirement: 各端独立环境配置模块架构

系统 SHALL 为 Web 和 Server 分别提供独立的环境变量配置模块，位于各自的 app 目录内。**不存在全局的 `config/` 目录或根目录 `.env` 文件。**

#### Scenario: Web 独立模块从 import.meta.env 读取 VITE_ 变量
- **WHEN** 在 Vite 构建的 Web 应用中导入 `{ env } from './utils/env.config'`
- **THEN** 模块从 `import.meta.env` 读取以 `VITE_` 为前缀的变量
- **THEN** 模块在 import 时立即执行校验，导出 `export const env: Readonly<WebEnvConfig>`
- **THEN** 返回的 `env` 对象包含：`appTitle`, `appEnv`, `apiBaseUrl`, `apiTimeout`, `enableMock`, `enableDevtools`, `buildVersion`, `buildTime`

#### Scenario: Server 独立模块通过 Zod Schema + getConfig() 读取
- **WHEN** 在 NestJS Server 应用中调用 `import { getConfig } from './config/env.config.js'; const config = getConfig()`
- **THEN** 模块从已校验的 ConfigModule 内部状态构建类型安全对象
- **THEN** 采用惰性初始化 + Object.freeze 缓存：首次调用时执行 Zod 校验并冻结结果
- **THEN** 返回的 `config` 对象包含 camelCase 字段：`appEnv`, `port`, `databaseUrl`, `redisHost`, `redisPort`, `redisPassword`, `redisDb`, `jwtSecret`, `jwtExpiresIn`, `encryptionKey`, `hmacSecret`, `corsOrigins`, `enableSwagger`, `enableBullDashboard`, `enableKnife4j`

#### Scenario: 两端接口完全独立
- **WHEN** 访问 Web 端的 `env.apiBaseUrl`
- **THEN** 类型为 `string`（来自 WebEnvConfig）
- **WHEN** 访问 Server 端的 `config.port`
- **THEN** 类型为 `number`（来自 ValidatedConfig）
- **WHEN** 尝试在 Web 端访问 `config.port` 或在 Server 端访问 `env.appTitle`
- **THEN** TypeScript 编译报错（属性不存在于对应接口）

---

### Requirement: 多环境文件体系（双端）

系统 SHALL 为 Web 和 Server 分别提供标准化的多环境配置文件结构。所有 `.env*` 文件位于各自 app 目录下。

#### Scenario: Web 端开发环境加载正确的配置文件
- **WHEN** 执行 `pnpm --filter @uni-admin/web dev`（等价于 `vite --mode development`）
- **THEN** 系统按顺序加载 `apps/web/.env` → `.env.development` → `.env.local` → `.env.development.local`
- **THEN** `env.config.ts` 从已加载的 `import.meta.env` 中读取并校验

#### Scenario: Web 端测试模式切换
- **WHEN** 执行 `pnpm --filter @uni-admin/web dev:test`（等价于 `vite --mode test`）
- **THEN** 系统加载 `apps/web/.env.test` 替代 development 配置

#### Scenario: Server 端开发环境加载正确的配置文件
- **WHEN** 执行 `pnpm --filter @uni-admin/server dev`
- **THEN** ConfigModule 按 `['.env.local', '.env.${NODE_ENV}', '.env']` 顺序加载 `apps/server/` 目录下的环境文件
- **THEN** 加载后立即执行 Zod validationSchema 校验，失败则终止启动
- **THEN** `getConfig()` 从已校验值构建只读对象

#### Scenario: 两端本地覆盖互不影响
- **WHEN** 开发者在 `apps/web/.env.local` 中修改 Web 配置
- **THEN** 不影响 Server 端的任何环境变量
- **WHEN** 开发者在 `apps/server/.env.local` 中修改数据库密码
- **THEN** 不影响 Web 端的任何环境变量

---

### Requirement: TypeScript 类型安全（各端独立）

系统 SHALL 为 Web 和 Server 分别提供独立的 TypeScript 接口和只读 env 对象。

#### Scenario: Web 端 IDE 完整类型补全
- **WHEN** 在 Web 代码中导入 `{ env } from './utils/env.config'` 并输入 `env.`
- **THEN** IDE 显示所有 WebEnvConfig 属性：`appTitle`, `appEnv`, `apiBaseUrl`, `apiTimeout`, `enableMock`, `enableDevtools`, `buildVersion`, `buildTime`

#### Scenario: Server 端 IDE 完整类型补全（Zod infer）
- **WHEN** 在 Server 代码中调用 `getConfig()` 后访问 `config.`
- **THEN** IDE 显示所有 ValidatedConfig 属性（由 Zod Schema 自动推断）：`appEnv`, `port`, `databaseUrl`, `redisHost`, `redisPort`, `redisPassword`, `redisDb`, `jwtSecret`, `jwtExpiresIn`, `encryptionKey`, `hmacSecret`, `corsOrigins`, `enableSwagger`, `enableBullDashboard`, `enableKnife4j`

#### Scenario: 编译期拦截拼写错误（各端独立）
- **WHEN** 输入 `env.apitBaseUrl`（拼写错误）
- **THEN** TypeScript 编译器报错：Property does not exist on type 'WebEnvConfig'
- **WHEN** 输入 `config.jwtSecert`（拼写错误）
- **THEN** TypeScript 编译器报错：Property does not exist on type 'ValidatedConfig'

---

### Requirement: 启动时严格校验（各端独立策略）

#### Scenario: Web 端缺少必填变量时终止启动
- **WHEN** 未设置 `VITE_APP_TITLE` 或其值为空字符串
- **THEN** 进程立即终止，控制台输出 `❌ 缺少必填环境变量: VITE_APP_TITLE`

#### Scenario: Server 端缺少必填变量时终止启动（Zod fail-fast）
- **WHEN** 未设置 `DATABASE_URL` 或其值为空字符串
- **THEN** 进程立即终止，控制台输出方框格式错误信息：
```
╔══════════════════════════════════════╗
║   环境变量校验失败，启动已终止       ║
╠══════════════════════════════════════╣
║  DATABASE_URL: 不能为空              ║
╚══════════════════════════════════════╝
```

#### Scenario: 枚举值非法时终止启动（两端各自校验）
- **WHEN** Web 端 `VITE_APP_ENV=staging`
- **THEN** 终止并提示 `VITE_APP_ENV 必须是: development | test | production`
- **WHEN** Server 端 `NODE_ENV=staging`
- **THEN** 终止并提示 `NODE_ENV 必须是: development | test | production`（由 Zod enum 约束）

#### Scenario: Server 端端口范围校验（Zod coerce + min/max）
- **WHEN** `PORT=0` 或 `PORT=99999`
- **THEN** 终止并提示 `PORT 必须是 1-65535 之间的整数`（由 Zod `z.coerce.number().min(1).max(65535)` 保证）

#### Scenario: Server 端弱密钥警告（不终止但告警）
- **WHEN** `JWT_SECRET` 长度小于 32 字符或使用默认占位值
- **THEN** 控制台输出 `[Config] ⚠️ 警告: JWT_SECRET 密钥强度不足或仍在使用默认值，请更改为 ≥32 字符的安全密钥`
- **THEN** 应用继续正常启动（不终止，仅 warn — 由 Zod `.refine()` 实现）

#### Scenario: 生产环境强制关闭 Swagger（Zod transform）
- **WHEN** `NODE_ENV=production`
- **THEN** 无论 `ENABLE_SWAGGER` 设置为何值，最终 `config.enableSwagger` 均为 `false`
- **AND** 此规则在 Zod Schema 的 `.transform()` 阶段自动应用

---

### Requirement: 环境变量 Schema 定义与校验（Server 端 Zod v4）

系统 SHALL 使用 Zod v4 Schema 声明式定义 Server 端所有环境变量，并在 NestJS 应用启动时自动执行校验。Schema SHALL 覆盖以下全部变量，包含类型转换、枚举约束和自定义业务规则：

| 变量名 | 类型 | 必填 | 默认值 | 校验规则 |
|--------|------|------|--------|----------|
| `NODE_ENV` | enum | 是 | - | 仅允许 `development` / `test` / `production` |
| `PORT` | number | 否 | 3000 | 范围 1-65535 |
| `DATABASE_URL` | string | 是 | - | 非空字符串（MySQL URL 格式） |
| `REDIS_HOST` | string | 否 | localhost | - |
| `REDIS_PORT` | number | 否 | 6379 | 范围 1-65535 |
| `REDIS_PASSWORD` | string | 否 | "" (空) | - |
| `REDIS_DB` | number | 否 | 0 | 范围 0-15 |
| `JWT_SECRET` | string | 是 | - | 长度 ≥ 32 字符时通过；否则 warn 但不终止 |
| `JWT_EXPIRES_IN` | string | 否 | "7d" | 如: "15m", "7d", "30d" |
| `ENCRYPTION_KEY` | string | 否 | 32字符默认值 | - |
| `HMAC_SECRET` | string | 否 | 同 ENCRYPTION_KEY | - |
| `CORS_ORIGINS` | string[] | 否 | [] | 逗号分隔字符串 → 数组 transform |
| `ENABLE_SWAGGER` | boolean | 否 | false | "true"/"1" → true |
| `ENABLE_BULL_DASHBOARD` | boolean | 否 | false | "true"/"1" → true |
| `ENABLE_KNIFE4J` | boolean | 否 | true | "false" → false |

Schema SHALL 分为两层输出：

| 层级 | 用途 | 键名格式 | 使用者 |
|------|------|---------|--------|
| `validationSchema` | ConfigModule.validate() 回调 | UPPER_SNAKE_CASE (`JWT_SECRET`) | ConfigService.get('KEY') |
| `envSchema` | getConfig() 内部 parse | camelCase (`jwtSecret`) | getConfig().field |

#### Scenario: 启动时所有必填变量存在且格式正确
- **WHEN** 应用启动且 `.env` 文件包含所有必填变量（`NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`）且值合法
- **THEN** 应用正常启动，ConfigService 可正确读取所有配置值
- **AND** 类型转换生效（如 `PORT` 为 number 类型）

#### Scenario: 缺少必填变量导致启动失败
- **WHEN** 应用启动且 `DATABASE_URL` 未设置或为空字符串
- **THEN** 应用立即终止并输出明确错误信息，指明缺失的变量名
- **AND** 错误信息包含变量期望的格式说明

#### Scenario: JWT_SECRET 使用弱密钥时发出警告但不终止
- **WHEN** 应用启动且 `JWT_SECRET` 长度小于 32 字符或使用默认占位值
- **THEN** 控制台输出警告信息提示用户更改为强密钥
- **AND** 应用继续正常启动（不终止）

#### Scenario: 生产环境强制关闭 Swagger
- **WHEN** `NODE_ENV=production`
- **THEN** 无论 `ENABLE_SWAGGER` 设置为何值，最终 `enableSwagger` 均为 `false`

---

### Requirement: 统一配置访问接口 getConfig()

系统 SHALL 提供 `getConfig(): Readonly<ValidatedConfig>` 函数作为非 DI 场景下的统一配置访问入口。该函数 SHALL 具有以下特性：

1. 惰性初始化：首次调用时从 process.env 通过 Zod envSchema 构建类型安全对象
2. 结果缓存：后续调用返回同一冻结对象（Object.freeze）
3. 类型推断：`ValidatedConfig` 类型由 Zod Schema 自动 infer
4. 只读保证：返回值不可修改（Readonly + freeze）
5. 调用时机安全：在 ConfigModule.forRoot() 完成之后调用才有效

#### Scenario: 在 Guard 中同步获取配置
- **WHEN** SignAuthGuard 的 `computeSignature()` 方法需要读取 JWT 密钥
- **THEN** 通过 `getConfig().jwtSecret` 同步获取，无需异步等待
- **AND** 返回值为 string 类型（由 Zod schema 保证）

#### Scenario: 在 Filter 中获取环境标识
- **WHEN** HttpExceptionFilter 需要判断当前是否生产环境以控制错误详情暴露
- **THEN** 通过 `getConfig().appEnv === 'production'` 获取枚举类型值
- **AND** TypeScript 编译器可推断 appEnv 的联合类型

#### Scenario: 在静态工具方法中获取加密密钥
- **WHEN** CryptoUtil 的静态方法 `getEncryptionKey()` 被调用
- **THEN** 内部通过 `getConfig().encryptionKey` 获取配置值
- **AND** 若未设置则返回安全的默认值

---

### Requirement: ConfigService DI 注入模式

对于可参与 NestJS DI 容器的类（Service、Strategy、Module 的 useFactory），SHALL 优先使用构造器注入 `ConfigService` 获取配置。注入方式 SHALL 遵循以下规范：

1. 构造器参数声明：`constructor(private readonly configService: ConfigService)`
2. 读取配置：`this.configService.get<string>('KEY')` 或 `this.configService.get('KEY')!`
3. 不再 fallback 到 `process.env.*` 直读
4. 不再使用 `|| 'fallback-default'` 模式（Zod Schema 已保证默认值）

#### Scenario: AuthStrategy 通过 DI 获取 JWT 密钥
- **WHEN** JwtStrategy 被实例化用于 Passport 认证
- **THEN** 通过构造器注入的 `configService.get<string>('JWT_SECRET')!` 获取签名密钥
- **AND** 不再存在 `process.env.JWT_SECRET || 'fallback'` 模式的代码

#### Scenario: AuthService 通过 DI 获取多配置项
- **WHEN** AuthService 需要读取 JWT_SECRET、JWT_EXPIRES_IN、NODE_ENV 等多个配置
- **THEN** 全部通过注入的 `configService` 获取
- **AND** 各处使用的 key 名称与 Zod Schema 中定义的一致（UPPER_SNAKE_CASE）

---

### Requirement: 配置模块工厂函数模式

当前作为 top-level const 导出的配置对象（redisConfig、JWT_CONFIG、knexConfig 等）SHALL 改造为工厂函数，接收 `ValidatedConfig` 参数并返回对应的配置对象。

| 工厂函数 | 输入 | 输出 | 替代的旧常量 |
|----------|------|------|-------------|
| `createJwtConfig(config)` | ValidatedConfig | JwtConfig | `JWT_CONFIG` |
| `createRedisConfig(config)` | ValidatedConfig | RedisConfig | `redisConfig` |
| `createKnexConfig(config)` | ValidatedConfig | Knex.Config | `knexConfig` |
| `getWinstonConfig()` | 内部调用 getConfig() | winston.LoggerOptions | `winstonConfig` |
| `createBullConfig(redisCfg)` | RedisConfig | BullConfig | `bullConfig` |
| `createKnife4jConfig()` | 内部调用 getConfig() | Knife4jConfig | `knife4jConfig` |

#### Scenario: Redis 配置延迟创建
- **WHEN** 某模块需要 Redis 连接配置
- **THEN** 调用 `createRedisConfig(getConfig())` 获取完整 RedisConfig 对象
- **AND** 返回对象中 host/port/password/db 等字段均从 ValidatedConfig 映射

#### Scenario: JWT 配置合并后单密钥
- **WHEN** 某模块需要 JWT 签名/验证配置
- **THEN** 调用 `createJwtConfig(getConfig())` 获取 JwtConfig 对象
- **AND** accessTokenSecret 和 refreshTokenSecret 均源自同一个 config.jwtSecret
- **AND** 不再依赖独立的 JWT_ACCESS_SECRET / JWT_REFRESH_SECRET 变量

---

### Requirement: 多环境 .env 文件加载策略

ConfigModule.forRoot() SHALL 保持现有的多环境文件加载策略不变：

```
加载优先级（后者覆盖前者）:
  .env.local > .env.${NODE_ENV} > .env
```

各环境文件的职责边界：

| 文件 | 用途 | 提交到 Git |
|------|------|-----------|
| `.env` | Prisma 读取 + 开发默认值 | ✅ 是 |
| `.env.development` | 开发环境专用覆盖 | ✅ 是 |
| `.env.test` | 测试环境专用（独立数据库） | ✅ 是 |
| `.env.production` | 生产环境模板（含 CI/CD 占位符） | ✅ 是 |
| `.env.example` | 变量说明模板 | ✅ 是 |
| `.env.local` | 本地个人覆盖（密码等敏感信息） | ❌ 否（gitignore） |

#### Scenario: 开发环境默认加载顺序
- **WHEN** `NODE_ENV=development` 且不存在 `.env.local`
- **THEN** 加载顺序：`.env` → `.env.development`（后者覆盖同名变量）
- **AND** 最终 process.env 中 development 的值优先生效

#### Scenario: 本地覆盖最高优先级
- **WHEN** 存在 `.env.local` 文件
- **THEN** `.env.local` 中的变量值覆盖所有其他环境文件中的同名变量

---

### Requirement: 构建元数据自动注入（差异化策略）

#### Scenario: Web 端构建元数据通过 Vite define 注入
- **WHEN** 执行 `vite build`
- **THEN** `VITE_BUILD_VERSION` 和 `VITE_BUILD_TIME` 由 vite.config.ts 的 define 配置注入
- **THEN** `env.buildVersion` 和 `env.buildTime` 可在 Web 端代码中访问

#### Scenario: Server 端构建元数据运行时读取
- **WHEN** Server 应用启动时调用 `getConfig()`
- **THEN** `buildVersion` 通过读取 package.json version 字段获取

---

### Requirement: 功能开关控制（双端）

#### Scenario: Web 端 Mock / DevTools 开关
- **WHEN** `VITE_ENABLE_MOCK=true`
- **THEN** `env.enableMock` 为 `true`
- **WHEN** 生产环境中 `VITE_ENABLE_DEVTOOLS=true`
- **THEN** `env.enableDevtools` 强制为 `false`

#### Scenario: Server 端 Swagger 开关（Zod transform）
- **WHEN** `ENABLE_SWAGGER=true` 且非生产环境
- **THEN** `config.enableSwagger` 为 `true`
- **WHEN** 生产环境中 `ENABLE_SWAGGER=true`
- **THEN** `config.enableSwagger` 强制为 `false`（由 Zod Schema 的 .transform() 保证）

---

### Requirement: 现有代码平滑集成

#### Scenario: Web Axios 集成
- **WHEN** `apps/web/src/api/index.ts` 导入 `{ env } from './utils/env.config'`
- **THEN** `baseURL` 取自 `env.apiBaseUrl`，`timeout` 取自 `env.apiTimeout`

#### Scenario: Web main.ts 集成
- **WHEN** `apps/web/src/main.ts` 导入 `{ env } from './utils/env.config'`
- **THEN** 触发即时校验；根据 `env.enableDevtools` 加载 DevTools；根据 `env.enableMock` 加载 MSW

#### Scenario: Server main.ts 集成（顶层 import getConfig）
- **WHEN** `apps/server/src/main.ts` 顶层导入 `import { getConfig } from './config/env.config.js'` 并调用 `const config = getConfig()`
- **THEN** 触发惰性校验；`port` 取自 `config.port`；CORS origins 取自 `config.corsOrigins`
- **THEN** Swagger 条件加载基于 `config.enableSwagger`（替代原来的 `process.env.NODE_ENV !== 'production'` 判断）

#### Scenario: Server app.module.ts 接入 Zod 校验
- **WHEN** 查看 `apps/server/src/app.module.ts`
- **THEN** `ConfigModule.forRoot()` 包含 `validate` 回调，调用 `validationSchema.safeParse(config)` 执行 Zod 校验
- **THEN** 校验失败时输出结构化错误信息并终止进程

---

### Requirement: 敏感信息安全（双端）

#### Scenario: 无全局 .env 文件残留
- **WHEN** 查看项目根目录
- **THEN** 不存在 `.env`、`.env.example`、`config/` 目录等全局配置文件

#### Scenario: 两端 .env 文件均受 Git 保护
- **WHEN** 执行 `git status`
- **THEN** `apps/web/.env*` 和 `apps/server/.env*` 中的 local 文件均不出现

#### Scenario: Web .env.example 仅含非敏感值
- **WHEN** 查看 `apps/web/.env.example`
- **THEN** 所有变量均为安全的示例值或占位符

#### Scenario: Server .env.example 密码使用占位符
- **WHEN** 查看 `apps/server/.env.example`
- **THEN** `DATABASE_URL`、`JWT_SECRET`、`REDIS_PASSWORD` 均为明显占位符值
- **THEN** 包含注释说明生产环境需通过 CI/CD Secrets 注入
- **THEN** 新增变量 `ENCRYPTION_KEY`、`HMAC_SECRET`、`REDIS_DB`、`ENABLE_BULL_DASHBOARD`、`ENABLE_KNIFE4J` 均有说明
