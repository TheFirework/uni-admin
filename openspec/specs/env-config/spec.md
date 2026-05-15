# Purpose

定义 uni-admin 项目环境变量（.env）的企业级标准配置规范，涵盖 Web 端（Vite + Vue3）和 Server 端（NestJS）的独立配置模块架构、多环境文件体系、TypeScript 类型安全、运行时校验策略、构建元数据注入、功能开关控制和敏感信息安全管理。

---

## Requirements

### Requirement: 各端独立环境配置模块架构

系统 SHALL 为 Web 和 Server 分别提供独立的环境变量配置模块，位于各自的 app 目录内。**不存在全局的 `config/` 目录或根目录 `.env` 文件。**

#### Scenario: Web 独立模块从 import.meta.env 读取 VITE_ 变量
- **WHEN** 在 Vite 构建的 Web 应用中导入 `{ env } from './utils/env.config'`
- **THEN** 模块从 `import.meta.env` 读取以 `VITE_` 为前缀的变量
- **THEN** 模块在 import 时立即执行校验，导出 `export const env: Readonly<WebEnvConfig>`
- **THEN** 返回的 `env` 对象包含：`appTitle`, `appEnv`, `apiBaseUrl`, `apiTimeout`, `enableMock`, `enableDevtools`, `buildVersion`, `buildTime`

#### Scenario: Server 独立模块从 process.env 读取原生变量
- **WHEN** 在 NestJS Server 应用的 `bootstrap()` 函数内调用 `const { getEnv } = await import('./config/env.config.js'); const env = getEnv()`
- **THEN** 模块从 `process.env` 读取原生变量名（无前缀限制）
- **THEN** 采用惰性初始化：首次调用 `getEnv()` 时才执行校验（确保 ConfigModule 已先加载 .env）
- **THEN** 返回的 `env` 对象包含：`appEnv`, `port`, `databaseUrl`, `redisHost`, `redisPort`, `redisPassword`, `jwtSecret`, `jwtExpiresIn`, `corsOrigins`, `enableSwagger`, `buildVersion`, `buildTime`

#### Scenario: 两端接口完全独立
- **WHEN** 访问 Web 端的 `env.apiBaseUrl`
- **THEN** 类型为 `string`（来自 WebEnvConfig）
- **WHEN** 访问 Server 端的 `env.port`
- **THEN** 类型为 `number`（来自 ServerEnvConfig）
- **WHEN** 尝试在 Web 端访问 `env.port` 或在 Server 端访问 `env.appTitle`
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
- **THEN** `env.config.ts` 的 `getEnv()` 从已加载的 `process.env` 中读取并校验

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

#### Scenario: Server 端 IDE 完整类型补全
- **WHEN** 在 Server 代码中调用 `getEnv()` 后访问 `env.`
- **THEN** IDE 显示所有 ServerEnvConfig 属性：`appEnv`, `port`, `databaseUrl`, `redisHost`, `redisPort`, `redisPassword`, `jwtSecret`, `jwtExpiresIn`, `corsOrigins`, `enableSwagger`, `buildVersion`, `buildTime`

#### Scenario: 编译期拦截拼写错误（各端独立）
- **WHEN** 输入 `env.apitBaseUrl`（拼写错误）
- **THEN** TypeScript 编译器报错：Property does not exist on type 'WebEnvConfig'

---

### Requirement: 启动时严格校验（各端独立策略）

#### Scenario: Web 端缺少必填变量时终止启动
- **WHEN** 未设置 `VITE_APP_TITLE` 或其值为空字符串
- **THEN** 进程立即终止，控制台输出 `❌ 缺少必填环境变量: VITE_APP_TITLE`

#### Scenario: Server 端缺少必填变量时终止启动
- **WHEN** 未设置 `DATABASE_URL` 或其值为空字符串
- **THEN** 进程立即终止，控制台输出 `[Server] ❌ 缺少必填环境变量: DATABASE_URL`

#### Scenario: 枚举值非法时终止启动（两端各自校验）
- **WHEN** Web 端 `VITE_APP_ENV=staging`
- **THEN** 终止并提示 `VITE_APP_ENV 必须是: development | test | production`
- **WHEN** Server 端 `NODE_ENV=staging`
- **THEN** 终止并提示 `NODE_ENV 必须是: development | test | production`

#### Scenario: Server 端端口范围校验
- **WHEN** `PORT=0` 或 `PORT=99999`
- **THEN** 终止并提示 `PORT 必须是 1-65535 之间的整数`

#### Scenario: Server 端弱密钥警告（不终止但告警）
- **WHEN** `JWT_SECRET=your-super-secret-jwt-key-change-in-production`（默认示例值）
- **THEN** 控制台输出 `⚠️ [Server] 警告: JWT_SECRET 仍在使用默认值，请更改为安全密钥`
- **THEN** 应用继续启动（不终止，仅警告）

---

### Requirement: 构建元数据自动注入（差异化策略）

#### Scenario: Web 端构建元数据通过 Vite define 注入
- **WHEN** 执行 `vite build`
- **THEN** `VITE_BUILD_VERSION` 和 `VITE_BUILD_TIME` 由 vite.config.ts 的 define 配置注入
- **THEN** `env.buildVersion` 和 `env.buildTime` 可在 Web 端代码中访问

#### Scenario: Server 端构建元数据运行时读取
- **WHEN** Server 应用启动时调用 `getEnv()`
- **THEN** `buildVersion` 通过读取 `package.json` version 字段获取

---

### Requirement: 功能开关控制（双端）

#### Scenario: Web 端 Mock / DevTools 开关
- **WHEN** `VITE_ENABLE_MOCK=true`
- **THEN** `env.enableMock` 为 `true`
- **WHEN** 生产环境中 `VITE_ENABLE_DEVTOOLS=true`
- **THEN** `env.enableDevtools` 强制为 `false`

#### Scenario: Server 端 Swagger 开关
- **WHEN** `ENABLE_SWAGGER=true` 且非生产环境
- **THEN** `env.enableSwagger` 为 `true`
- **WHEN** 生产环境中 `ENABLE_SWAGGER=true`
- **THEN** `env.enableSwagger` 强制为 `false`

---

### Requirement: 现有代码平滑集成

#### Scenario: Web Axios 集成
- **WHEN** `apps/web/src/api/index.ts` 导入 `{ env } from './utils/env.config'`
- **THEN** `baseURL` 取自 `env.apiBaseUrl`，`timeout` 取自 `env.apiTimeout`

#### Scenario: Web main.ts 集成
- **WHEN** `apps/web/src/main.ts` 导入 `{ env } from './utils/env.config'`
- **THEN** 触发即时校验；根据 `env.enableDevtools` 加载 DevTools；根据 `env.enableMock` 加载 MSW

#### Scenario: Server main.ts 集成（惰性初始化）
- **WHEN** `apps/server/src/main.ts` 在 `bootstrap()` 内动态导入 `{ getEnv } from './config/env.config.js'` 并调用 `getEnv()`
- **THEN** 触发延迟校验；`port` 取自 `env.port`；CORS origins 取自 `env.corsOrigins`
- **THEN** Swagger 条件加载基于 `env.enableSwagger`（替代原来的 `process.env.NODE_ENV !== 'production'` 判断）

#### Scenario: Server app.module.ts 保留 ConfigModule
- **WHEN** 查看 `apps/server/src/app.module.ts`
- **THEN** `ConfigModule.forRoot()` 保留不变，`envFilePath` 包含 mode 动态匹配（`'.env.local', '.env.${NODE_ENV}', '.env'`）
- **THEN** `env.config.ts` 作为上层类型安全封装与之共存

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
