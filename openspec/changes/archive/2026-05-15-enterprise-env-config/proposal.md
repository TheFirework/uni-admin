## Why

当前 uni-admin 项目（monorepo）的环境变量配置处于**初始阶段**且**两端割裂**：

**Web 端 (`apps/web/`)**：
- 仅有 2 个变量（`VITE_APP_TITLE`、`VITE_API_BASE_URL`）
- 无多环境支持、无 TypeScript 类型声明、无运行时校验

**Server 端 (`apps/server/`)**：
- 使用 `process.env.*` 直接读取，通过 `@nestjs/config` 的 ConfigModule 加载 `.env`
- 无类型安全、无启动校验、与 Web 端配置完全独立

这导致三个核心痛点：
1. **开发者本地环境配置不一致** — 新人入职无标准 SOP
2. **敏感信息存在 Git 泄露风险** — 无系统化的安全策略
3. **切换环境时容易搞混配置** — 缺少 dev/test/production 三套独立配置

## What Changes

### 架构原则：各端独立管理，各自只加载所属端的 env 数据。**无全局 config 目录或 .env 文件。**

```
uni-admin/
├── apps/web/                              ← Vite + Vue3
│   ├── src/
│   │   ├── env.d.ts                      # Vite ImportMetaEnv 类型扩展
│   │   └── utils/
│   │       └── env.config.ts            # Web 端独立模块 (import.meta.env)
│   ├── .env.development / test / production / example
│   └── dist/                               (构建产物)
│
└── apps/server/                           ← NestJS
    ├── src/config/
    │   └── env.config.ts                 # Server 端独立模块 (process.env)
    ├── .env.development / test / production / example
    └── dist/                                 (构建产物)
```

### 具体变更

**Web 端新增/修改**:
- 新增 `apps/web/src/env.d.ts` — 扩展 `ImportMetaEnv` 接口声明所有自定义 `VITE_` 变量类型
- 新增 `apps/web/src/utils/env.config.ts` — 定义 `WebEnvConfig` 接口、从 `import.meta.env` 读取 `VITE_*` 变量、立即校验、导出只读 `export const env` 单例
- 新增多环境文件：`.env.development` / `.env.test` / `.env.production`
- 增强 `.env.example` 为完整模板文档
- 改造 `src/api/index.ts` — `import { env } from './utils/env.config'`
- 改造 `src/main.ts` — `import { env } from './utils/env.config'` 触发校验；条件加载 MSW/DevTools
- 改造 `vite.config.ts` — define 注入构建元数据（版本号+时间戳）；移除无用 `@/config` alias
- 扩展 `package.json` 脚本 — 新增 `dev:test` / `dev:prod`；升级 vue-tsc 到 ^2.2.x

**Server 端新增/修改**:
- 新增 `apps/server/src/config/env.config.ts` — 定义 `ServerEnvConfig` 接口、从 `process.env` 读取、惰性校验（`getEnv()` 函数）、含弱密钥警告
- 新增多环境文件：`.env.development` / `.env.test` / `.env.production`
- 增强 `.env.example` 为完整模板文档
- 改造 `src/main.ts` — `import { getEnv } from './config/env.config'` 替代 process.env（在 bootstrap 内惰性调用）
- 更新 `src/app.module.ts` — ConfigModule `envFilePath` 动态匹配 mode 文件；添加配置层级说明注释
- 更新 `tsconfig.json` — 移除 `composite`/`references` 以修复 nest build 不生成产物问题
- 更新 `package.json` — 添加 `"type": "module"` 声明

**清理删除**:
- 根目录 `.env`（混合文件，已被各 app 的 `.env.*` 替代）
- 根目录 `.env.example`（同上）
- 根目录 `config/` 目录（空目录，已无全局配置需求）

## Capabilities

### New Capabilities
- `web-env-config`: Web 端环境变量配置体系，涵盖 `utils/env.config.ts` 模块、`env.d.ts` 类型扩展、多环境文件、TypeScript 类型安全、立即校验、构建元数据注入、功能开关控制
- `server-env-config`: Server 端环境变量配置体系，涵盖 `config/env.config.ts` 惰性模块、多环境文件、TypeScript 类型安全、延迟校验（含弱密钥警告）、Swagger 功能开关控制

## Impact

| 影响范围 | 具体内容 |
|----------|----------|
| **新增文件** | `apps/web/src/env.d.ts`, `apps/web/src/utils/env.config.ts`, `apps/server/src/config/env.config.ts`, 8 个 `.env.*` 文件, `apps/web/src/mocks/browser.ts` (MSW stub) |
| **修改文件 (Web)** | `src/api/index.ts`, `src/main.ts`, `vite.config.ts`, `package.json` |
| **修改文件 (Server)** | `src/main.ts`, `src/app.module.ts`, `tsconfig.json`, `package.json` |
| **删除文件** | 根目录 `.env`, 根目录 `.env.example`, 根目录 `config/` 目录 |

### 回滚方案
1. 删除两端新增的 `env.config.ts`、`env.d.ts` 和 `.env.*` 文件
2. 恢复 `api/index.ts` / `main.ts` 为原始 `import.meta.env` / `process.env` 写法
3. 移除 vite define 配置和 package.json 新脚本
4. 恢复 server tsconfig.json 的 composite/references 配置
