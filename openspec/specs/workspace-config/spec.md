# Workspace Configuration Specification

定义 uni-admin 项目的 pnpm workspace 配置、TypeScript Project References、ESLint/Prettier 统一配置，以及开发/构建/测试工作流脚本的规范。

---

## Purpose

本规格定义 uni-admin 项目的基础工程化配置，包括包管理器配置、TypeScript 编译配置、代码质量工具配置和开发工作流脚本，确保项目具有一致的构建、检查和部署流程。

---

## Requirements

### Requirement: pnpm Workspace 配置

项目 MUST 使用 pnpm 作为包管理器，并通过 `pnpm-workspace.yaml` 配置 monorepo workspace。

**pnpm-workspace.yaml 基本配置**:
```yaml
packages:
  - 'apps/*'      # 匹配所有应用
  - 'packages/*'  # 匹配所有共享库
```

**workspace 范围规则**:
- MUST 包含 `apps/*` 以支持 @uni-admin/server 和 @uni-admin/web
- MUST 包含 `packages/*` 以支持所有共享库
- MAY 包含 `tooling/*` 如果 tooling 目录下有需要作为包发布的配置库

**package.json 中使用 workspace 协议**:
- 内部包之间的依赖引用 MUST 使用 `"workspace:*"` 协议
- 示例: `"@uni-admin/shared-types": "workspace:*"`
- 发布时 pnpm 会自动将 `workspace:*` 替换为实际版本号

**根 package.json 的职责**:
- MUST 定义 `private: true`（monorepo 根包不发布）
- SHOULD 集中管理常用的 npm scripts（dev, build, test, lint 等）
- SHOULD 将共用的 devDependencies 提升到根目录（如 typescript, eslint, prettier）
- MAY 使用 `pnpm.overrides` 强制统一某些依赖的版本

#### Scenario: workspace 初始化验证
- **WHEN** 开发者克隆项目并在根目录执行 `pnpm install`
- **THEN** pnpm SHALL 读取 `pnpm-workspace.yaml` 并识别所有 workspace 包
- **AND** 所有 apps/*/package.json 和 packages/*/package.json 中声明的内部依赖 SHALL 被正确链接
- **AND** 不应出现 "can't find package" 或 "version not found" 错误

#### Scenario: workspace 协议依赖解析
- **WHEN** 查看 `apps/web/package.json` 的 dependencies
- **THEN** 对 @uni-admin/* 开头的包，版本号 MUST 为 `"workspace:*"`
- **AND** 执行 `pnpm install` 后，这些包 SHALL 被符号链接到对应的 packages/ 或 apps/ 目录
- **AND** 修改 shared 包的源码后，apps 中应能立即看到变更（无需重新 install）

#### Scenario: 根 scripts 集中管理
- **WHEN** 查看根 package.json 的 scripts 部分
- **THEN** SHOULD 定义以下常用命令：
  - `dev`: 启动所有应用的开发模式（`pnpm -r --parallel run dev`）
  - `build`: 构建所有包（`pnpm -r run build`）
  - `test`: 运行所有测试（`pnpm -r run test`）
  - `lint`: 代码检查（`pnpm -r run lint`）
  - `format`: 代码格式化（prettier）
- **AND** 也 SHOULD 提供按包执行的快捷方式：
  - `dev:server`: 只启动后端（`pnpm --filter @uni-admin/server dev`）
  - `dev:web`: 只启动前端（`pnpm --filter @uni-admin/web dev`）

---

### Requirement: TypeScript Project References 配置

项目 MUST 使用 TypeScript Project References 来实现增量编译和类型检查。

**tsconfig.base.json (根配置)**:
- MUST 作为所有包的基础配置被继承
- MUST 包含以下基础编译选项：
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "lib": ["ES2022"],
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true
    }
  }
  ```
- MAY 定义通用的路径别名（如 `@/*` → `./src/*`）

**各包的 tsconfig.json 配置要求**:
- MUST 使用 `"extends": "../../tsconfig.base.json"` 继承根配置
- MUST 设置 `"composite": true` 以启用 Project References
- MUST 设置 `"declaration": true` 以生成 .d.ts 类型声明文件
- MUST 设置 `"outDir"` 和 `"rootDir"` 指向正确的输出和源码目录
- MUST 在 `references` 数组中声明所依赖的其他 projects

**Project References 的依赖声明**:
- `apps/server/tsconfig.app.json` MUST reference:
  - `packages/shared-types`
  - `packages/shared-utils`
- `apps/web/tsconfig.app.json` MUST reference:
  - `packages/shared-types`
  - `packages/shared-utils`
  - `packages/ui-components`
- `packages/ui-components/tsconfig.json` MAY reference:
  - `packages/shared-types`

#### Scenario: TypeScript 增量编译
- **WHEN** 开发者修改了 `packages/shared-types/src/api.types.ts` 文件
- **THEN** 执行 `tsc -b`（构建模式）时，TypeScript SHOULD 只重新编译：
  - packages/shared-types 本身
  - 直接或间接依赖它的包（shared-utils, ui-components, server, web）
- **AND** 未被影响的包不应重新编译（节省时间）

#### Scenario: 类型检查跨包引用
- **WHEN** 在 `apps/web/src/views/user/index.vue` 中导入 `@uni-admin/shared-types` 定义的 IUser 类型
- **THEN** IDE（VSCode）SHOULD 能够提供完整的类型提示和自动补全
- **AND** 如果修改了 IUser 类型的定义，所有使用该类型的文件 SHOULD 立即显示类型错误（如果破坏性修改）

#### Scenario: tsconfig 继承链正确性
- **WHEN** 查看任意一个 app 或 package 的 tsconfig.json
- **THEN** 它 MUST 包含 `"extends"` 字段指向 `../../tsconfig.base.json`（相对路径根据深度调整）
- **AND** 它 MUST 包含 `"composite": true` 和 `"declaration": true`
- **AND** 它 SHOULD 包含正确的 `references` 数组

---

### Requirement: ESLint 统一配置

项目 MUST 使用 ESLint 进行代码质量检查，并采用统一的配置策略。

**根 ESLint 配置 (.eslintrc.js)**:
- MUST 定义适用于整个项目的通用规则
- SHOULD 使用 `@typescript-eslint/parser` 解析 TypeScript
- SHOULD 使用 `@typescript-eslint/eslint-plugin` 提供 TypeScript 相关规则
- SHOULD 使用 `eslint-config-prettier` 避免 ESLint 与 Prettier 的规则冲突
- SHOULD 使用 `eslint-plugin-vue` 处理 Vue 文件的 `<script>` 部分

**各包的 ESLint 配置继承策略**:
- 每个 app/package 可以有自己的 `.eslintrc.js` 或在 `package.json` 中定义 `eslintConfig`
- 推荐通过 `"extends": ["@uni-admin/eslint-config"]` 继承自定义规则集（如果存在）
- 或者直接 extends 根配置的常用规则组合

**必需的 ESLint 规则类别**:
1. **TypeScript 规则**: 类型检查、接口使用、泛型约束等
2. **命名规范**: 参见 naming-conventions spec 中的详细定义
3. **代码质量**: no-unused-vars, no-console（生产环境）, eqeqeq 等
4. **Vue 特定**: vue/multi-word-component-names, vue/no-mutating-props 等
5. **Import 规则**: import/order（排序）, no-duplicates 等

**ESLint 忽略配置 (.eslintignore)**:
- MUST 忽略 `node_modules/`, `dist/`, `.output/` 等构建产物
- MAY 忽略 `*.config.js`, `*.config.ts` 等配置文件（视团队偏好）

#### Scenario: ESLint 配置生效验证
- **WHEN** 在项目根目录执行 `pnpm lint`（假设该脚本运行 eslint）
- **THEN** ESLINT SHALL 扫描所有 apps/*/src 和 packages/*/src 下的 .ts, .vue, .js 文件
- **AND** 报告所有违反规则的代码问题
- **AND** 错误信息 SHALL 包含文件路径、行号、列号、规则名称和错误描述

#### Scenario: ESLint 自动修复
- **WHEN** 执行 `pnpm lint:fix`（假设该脚本运行 eslint --fix）
- **THEN** ESLINT SHALL 自动修复所有可以自动修复的问题（如引号风格、分号、缩进等）
- **AND** 对于无法自动修复的问题，仍然报告错误但不修改文件

#### Scenario: Vue 文件的 ESLint 支持
- **WHEN** 在 `apps/web/src/components/` 下创建新的 Vue 单文件组件（.vue）
- **THEN** ESLINT SHALL 能够正确解析 `<script>` 和 `<script setup>` 部分的 TypeScript 代码
- **AND** 应用所有适用的 TypeScript 规则和 Vue 特定规则
- **AND** 不应解析或检查 `<template>` 和 `<style>` 部分（除非配置了额外插件）

---

### Requirement: Prettier 格式化配置

项目 MUST 使用 Prettier 进行代码格式化，确保一致的代码风格。

**.prettierrc 配置文件基本选项**:
```json
{
  "semi": false,              // 不使用分号
  "singleQuote": true,        // 使用单引号
  "tabWidth": 2,              // 缩进宽度为 2 空格
  "trailingComma": "none",    // 尾随逗号：无
  "printWidth": 100,          // 行宽限制为 100 字符
  "endOfLine": "lf",          // 换行符使用 LF（Unix 风格）
  "arrowParens": "always",    // 箭头函数总是带括号
  "vueIndentScriptAndStyle": false // Vue 文件中 script/style 不额外缩进
}
```

**文件范围**:
- Prettier SHOULD 格式化以下文件类型：
  - `*.ts`, `*.tsx`, `*.js`, `*.jsx` (TypeScript/JavaScript)
  - `*.vue` (Vue 单文件组件)
  - `*.json`, `*.json5` (JSON)
  - `*.md` (Markdown)
  - `*.scss`, `*.css`, `.less` (样式文件)
  - `*.yaml`, `*.yml` (YAML)

**与 ESLint 的集成**:
- MUST 安装并启用 `eslint-config-prettier` 以禁用所有与 Prettier 冲突的 ESLint 规则
- 这样可以避免同一问题被两个工具分别报错

**格式化脚本**:
- 根 package.json SHOULD 提供 `format` 脚本：
  ```json
  "format": "prettier --write \"**/*.{ts,tsx,vue,json,md,scss,css,yaml,yml}\""
  ```

#### Scenario: Prettier 格式化执行
- **WHEN** 执行 `pnpm format`（或 prettier --write 命令）
- **THEN** Prettier SHALL 扫描所有匹配的文件并按照 .prettierrc 配置进行格式化
- **AND** 被修改的文件列表应被输出到控制台
- **AND** 文件的格式应符合配置的规则（单引号、无分号、2 空格缩进等）

#### Scenario: Prettier 与 ESLint 无冲突
- **WHEN** 同时运行 `pnpm lint` 和 `pnpm format`
- **THEN** 不应出现相同问题的重复错误（ESLint 报格式错误，Prettier 也报格式错误）
- **AND** 这通过 `eslint-config-prettier` 来保证

#### Scenario: 编辑器保存时自动格式化
- **WHEN** 开发者在 VSCode 中编辑 .ts 或 .vue 文件并按 Ctrl+S / Cmd+S 保存
- **THEN** 如果配置了 editor.formatOnSave，Prettier SHOULD 自动格式化当前文件
- **AND** 这个行为 SHOULD 与命令行执行 `prettier --file <filename>` 的结果一致

---

### Requirement: 开发工作流脚本规范

根 package.json MUST 定义一套完整的工作流脚本，以简化开发和构建过程。

**必需的脚本分类**:

**1. 开发脚本 (Development)**:
```json
{
  "dev": "pnpm -r --parallel run dev",
  "dev:server": "pnpm --filter @uni-admin/server dev",
  "dev:web": "pnpm --filter @uni-admin/web dev"
}
```
- `dev`: 并行启动所有应用的开发服务器
- `dev:server`: 仅启动 NestJS 后端（通常监听 http://localhost:3000）
- `dev:web`: 仅启动 Vite 前端开发服务器（通常监听 http://localhost:5173，并代理 API 到后端）

**2. 构建脚本 (Build)**:
```json
{
  "build": "pnpm -r run build",
  "build:server": "pnpm --filter @uni-admin/server build",
  "build:web": "pnpm --filter @uni-admin/web build"
}
```
- `build`: 按依赖顺序构建所有包（先 packages，再 apps）
- `build:server`: 仅构建 NestJS 后端（生成 dist/ 目录）
- `build:web`: 仅构建 Vue3 前端（生成 dist/ 目录用于部署）

**3. 测试脚本 (Testing)**:
```json
{
  "test": "pnpm -r run test",
  "test:watch": "pnpm -r run test:watch",
  "test:coverage": "pnpm -r run test:coverage",
  "test:e2e": "pnpm --filter @uni-admin/web test:e2e"
}
```
- `test`: 运行所有单元测试
- `test:e2e`: 运行端到端测试（Playwright）

**4. 代码质量脚本 (Code Quality)**:
```json
{
  "lint": "pnpm -r run lint",
  "lint:fix": "pnpm -r run lint:fix",
  "format": "prettier --write \"**/*.{ts,tsx,vue,json,md}\"",
  "typecheck": "pnpm -r run typecheck"
}
```
- `lint`: ESLint 检查
- `lint:fix`: ESLint 自动修复
- `format`: Prettier 格式化
- `typecheck`: TypeScript 类型检查（使用 tsc -b --verbose）

**5. 清理脚本 (Cleanup)**:
```json
{
  "clean": "pnpm -r exec rm -rf dist && rm -rf node_modules",
  "clean:install": "rm -rf node_modules && pnpm install"
}
```

#### Scenario: 一键启动开发环境
- **WHEN** 新开发者克隆项目后，依次执行：
  1. `pnpm install`（安装依赖）
  2. `cp .env.example .env`（配置环境变量）
  3. `docker-compose up -d mysql redis`（启动依赖服务）
  4. `pnpm dev`（启动前后端开发服务器）
- **THEN** NestJS 后端 SHOULD 在 http://localhost:3000 启动并提供 API
- **AND** Vue3 前端 SHOULD 在 http://localhost:5173 启动并可访问
- **AND** 前端 SHOULD 能够成功调用后端 API（通过 Vite proxy 配置）

#### Scenario: 独立构建验证
- **WHEN** 执行 `pnpm build:server`
- **THEN** `apps/server/dist/` 目录应被生成，包含编译后的 JavaScript 文件
- **AND** 该目录应可以独立运行（`node dist/main.js`），假设环境变量和外部服务已配置
- **WHEN** 执行 `pnpm build:web`
- **THEN** `apps/web/dist/` 目录应被生成，包含静态 HTML/CSS/JS 文件
- **AND** 该目录可以被 Nginx 或其他静态文件服务器托管

#### Scenario: 完整的代码质量检查流程
- **WHEN** 准备提交代码前，执行以下命令序列：
  1. `pnpm lint`（检查代码质量）
  2. `pnpm format`（格式化代码）
  3. `pnpm typecheck`（类型检查）
  4. `pnpm test`（运行单元测试）
- **THEN** 所有命令都应成功退出（exit code 0）
- **AND** 如果任何步骤失败，SHOULD 明确指出错误原因和位置

---

### Requirement: Docker 开发环境配置

项目 SHOULD 提供 Docker Compose 配置以简化本地开发环境的搭建。

**docker-compose.yml 必需服务**:

**1. MySQL 数据库服务**:
- MUST 使用 MySQL 8.0 或更高版本
- MUST 配置以下环境变量：
  - `MYSQL_ROOT_PASSWORD`: root 密码
  - `MYSQL_DATABASE`: 数据库名称（如 `uni_admin`）
  - `MYSQL_USER`: 应用用户名
  - `MYSQL_PASSWORD`: 应用密码
  - `TZ`: 时区设置（`Asia/Shanghai`）
- MUST 映射端口 `3306:3306`（允许主机访问）
- MUST 使用 volume 持久化数据（避免容器重启丢失数据）
- MUST 配置 healthcheck（确保数据库就绪后再启动应用）
- SHOULD 初始化 SQL 脚本（可选，通过 `/docker-entrypoint-initdb.d/`）

**2. Redis 缓存服务**:
- MUST 使用 Redis 7 Alpine 版本（轻量级）
- MUST 映射端口 `6379:6379`
- MUST 使用 volume 持久化数据
- MUST 启用 AOF 持久化（`--appendonly yes`）
- MUST 配置 healthcheck

**Dockerfile 要求**:

**apps/server/Dockerfile.server**:
- MUST 使用多阶段构建（builder → runner）
- builder 阶段：
  - 基于 `node:20-alpine`
  - 安装 pnpm
  - 先复制 `package.json` 和 `pnpm-lock.yaml`（利用 Docker 层缓存）
  - 执行 `pnpm install --frozen-lockfile`
  - 复制源码并执行 `pnpm --filter @uni-admin/server build`
- runner 阶段：
  - 基于 `node:20-alpine`
  - 只复制构建产物（dist/）和必要的配置
  - 安装生产依赖（@prisma/client）
  - 执行 Prisma generate
  - 暴露端口（默认 3000）
  - 设置启动命令

**apps/web/Dockerfile.web**:
- MUST 使用多阶段构建
- builder 阶段：构建 Vue3 应用（生成 dist/）
- runner 阶段：
  - 基于 `nginx:alpine`
  - 复制 dist/ 到 Nginx 的 html 目录
  - 自定义 nginx.conf（配置 SPA fallback、API proxy 等）
  - 暴露端口（默认 80 或 8080）

**环境变量管理**:
- MUST 提供 `.env.example` 文件（包含所有必需的环境变量及其说明）
- `.env` 文件 MUST 被 `.gitignore` 忽略（不提交敏感信息）

#### Scenario: Docker 本地环境一键启动
- **WHEN** 开发者执行 `docker-compose up -d`
- **THEN** MySQL 服务 SHOULD 启动并可通过 `localhost:3306` 连接
- **AND** Redis 服务 SHOULD 启动并可通过 `localhost:6379` 连接
- **AND** 执行 `docker-compose ps` 应显示两个服务都是 "Up" 或 "healthy" 状态

#### Scenario: Docker 容器健康检查
- **WHEN** MySQL 和 Redis 容器启动后
- **THEN** 等待最多 30 秒，healthcheck 应显示 "healthy"
- **AND** 应用容器（如果配置了 depends_on with condition: service_healthy）应在数据库就绪后才启动

#### Scenario: 数据持久化验证
- **WHEN** 在 MySQL 中创建了一些表和数据后，执行 `docker-compose down` 再 `docker-compose up -d`
- **THEN** 之前的数据应该仍然存在（因为使用了 named volumes）
- **AND** 除非显式执行 `docker-compose down -v`（这会删除 volumes）

---

### Requirement: Git 忽略规则配置

项目 MUST 配置全面的 `.gitignore` 文件，避免提交不必要的文件到版本控制。

**必须忽略的内容**:

**依赖和构建产物**:
```
node_modules/
dist/
.output/
*.tsbuildinfo
```

**环境变量和敏感信息**:
```
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
```

**IDE 和编辑器配置**:
```
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
```

**日志和临时文件**:
```
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
```

**操作系统文件**:
```
Thumbs.db
.DS_Store
```

**测试覆盖率**:
```
coverage/
.nyc_output/
```

**特定工具产物**:
```
# Prisma
packages/shared-prisma/prisma/migrations/.tmp

# Turborepo (如果使用)
.turbo/

# Nx (如果使用)
.nx/
```

#### Scenario: 敏感信息不被提交
- **WHEN** 开发者创建了 `.env` 文件并填入了数据库密码等敏感信息
- **THEN** 执行 `git status` 时，`.env` 文件 SHOULD 显示在 ".gitignore" 匹配的未跟踪文件列表中（或完全不显示）
- **AND** 执行 `git add .` 时，`.env` 不应被添加到暂存区

#### Scenario: node_modules 不被提交
- **WHEN** 项目根目录和各个子包目录下都有 node_modules/
- **THEN** 这些 node_modules/ 目录都不应出现在 `git status` 的输出中
- **AND** 新开发者执行 `git clone` 后，只需运行 `pnpm install` 即可安装所有依赖
