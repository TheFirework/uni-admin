## Context

uni-admin 是一个基于 pnpm workspace 的 monorepo 管理后台项目，包含两个应用：

**Web 端 (`apps/web/`)**：Vite 5 + Vue 3.4 + TypeScript 5.9 + Element Plus + Pinia + Axios
**Server 端 (`apps/server/`)**：NestJS 10 + TypeScript 5.9 + Prisma + MySQL + Redis

## Goals / Non-Goals

**Goals:**
- Web 和 Server **各自拥有独立的 `env.config.ts`**，只加载所属端的环境变量
- 各端独立提供 TypeScript 类型安全 + 启动时严格校验
- 多环境文件体系（development / test / production）
- 构建元数据、功能开关等能力
- 敏感信息安全策略
- **零全局 config 目录**：所有配置文件归属各 app 内部

**Non-Goals:**
- 不做跨端共享模块（各端独立维护，避免 alias/路径复杂性）
- 不保留根目录 `config/` 或 `.env` 文件
- 不替换 Server 端 ConfigModule（与 env.config.ts 共存）
- 不实现完整 MSW Mock 数据定义（仅预留接口）

## Decisions

### 决策 1：各端独立的 env.config.ts（去中心化）

**选择**: Web 和 Server 各自拥有独立的配置模块，各自只处理自己的数据源和变量。

```
apps/web/src/utils/env.config.ts        apps/server/src/config/env.config.ts
┌───────────────────────────────┐      ┌───────────────────────────────┐
│ 数据源: import.meta.env       │      │ 数据源: process.env            │
│ 变量前缀: VITE_*              │      │ 变量名: 原生 (无前缀限制)      │
│ 接口: WebEnvConfig           │      │ 接口: ServerEnvConfig         │
│ 导出: export const env        │      │ 导出: export function getEnv() │
│ 初始化时机: import 时立即执行   │      │ 初始化时机: 首次调用时惰性执行 │
│ 使用者: main.ts, api/index.ts │      │ 使用者: main.ts               │
└───────────────────────────────┘      └───────────────────────────────┘
```

**关键差异 — 初始化时机**:
- **Web 端**: Vite 在编译时就处理了 `.env` 文件，`import.meta.env` 在运行时已就绪 → 可以在模块顶层立即校验并导出 `export const env`
- **Server 端**: NestJS 的 ConfigModule 在应用启动后才加载 `.env` 到 `process.env` → 必须使用惰性初始化（`getEnv()` 函数），在 bootstrap() 内部调用

**理由**:
- **零跨端耦合**: 各端修改互不影响，无需 alias/paths 配置
- **简单直观**: 开发者在对应 app 目录下就能找到所有配置逻辑
- **符合框架惯例**: Vite 项目用 `import.meta.env`，Node.js 用 `process.env`
- **独立演进**: 两端可按需添加不同的校验规则和字段

**备选方案**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| A. 各端独立 ✅ | 零耦合、简单直观、无路径问题 | 接口定义不共享 |
| B. 根目录统一模块 | 一处修改两端生效 | alias 复杂、tsc rootDir 限制 |
| C. 抽取为 npm 包 | 完全解耦 | 过度工程化 |

### 决策 2：多环境文件体系（双端各自维护）

```
uni-admin/
├── apps/web/                          ← Vite + Vue3
│   ├── src/env.d.ts                  # ImportMetaEnv 类型扩展
│   ├── src/utils/env.config.ts       # Web 端 env 模块
│   ├── .env.development              # 开发环境 (VITE_* 前缀)
│   ├── .env.test                     # 测试环境
│   ├── .env.production               # 生产环境
│   └── .env.example                  # 模板文档
│
└── apps/server/                       ← NestJS
    ├── src/config/env.config.ts     # Server 端 env 模块
    ├── .env.development              # 开发环境 (原生变量名)
    ├── .env.test                     # 测试环境
    ├── .env.production               # 生产环境
    └── .env.example                  # 模板文档
```

**注意**: 根目录不存在 `config/`、`.env`、`.env.example` 等任何全局配置文件。

### 决策 3：严格模式校验策略

- **Web 端**: 模块 import 时立即同步校验，失败即终止进程
- **Server 端**: 首次调用 `getEnv()` 时惰性校验，失败即终止；JWT_SECRET 弱密钥仅警告不终止

### 决策 4：构建元数据注入策略

- **Web**: Vite `define` 编译时注入 `VITE_BUILD_VERSION` / `VITE_BUILD_TIME`
- **Server**: 运行时通过 `process.cwd()` 读取 `package.json` version 字段

### 决策 5：敏感信息安全策略

分层防御：.gitignore + .env.example 占位符 + CI/CD Secrets + 弱密钥警告

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 两端接口定义不同步 | 校验逻辑独立不影响；接口结构差异是合理的 |
| 新增变量需改两处 | 各端变量本就不同（VITE_* vs 原生），不存在真正重复 |
| Server 惰性初始化需注意调用顺序 | 在 bootstrap() 中 ConfigModule 加载后调用 getEnv() |
