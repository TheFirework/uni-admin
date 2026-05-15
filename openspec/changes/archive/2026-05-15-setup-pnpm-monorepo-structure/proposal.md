## Why

uni-admin 作为 NestJS + Vue3 + TypeScript 全栈管理后台基座项目，需要一个**清晰、可扩展、符合业界最佳实践**的 pnpm monorepo 架构来支撑其核心目标：

1. **前后端分离开发与部署** - server 和 web 作为独立应用，各自构建、测试、部署
2. **代码复用最大化** - 通过共享库（types、utils、components）消除重复代码
3. **标准化项目组织** - 为"可快速二次开发"提供统一的结构和规范
4. **工程化基础建设** - 统一的 TypeScript、ESLint、Prettier 配置，提升代码质量

当前项目处于初始阶段，正是建立正确架构的最佳时机。错误的 monorepo 结构会导致后续重构成本高昂，影响整个项目的可维护性。

## What Changes

### 核心架构变更

- **建立专业 Monorepo 目录结构**
  - 采用 `apps/` (可独立部署应用) + `packages/` (共享库) 的分层结构
  - 符合 Turborepo、Nx 等主流工具推荐的 best practice
  - 明确依赖方向：`apps` 依赖 `packages`，禁止反向依赖

- **定义三个核心应用/库包**
  - `@uni-admin/server`: 后端 NestJS 应用（位于 `apps/server/`）
  - `@uni-admin/web`: 前端 Vue3 应用（位于 `apps/web/`）
  - `@uni-admin/shared-types`: 共享 TypeScript 类型定义（位于 `packages/shared-types/`）
  - `@uni-admin/shared-utils`: 公共工具函数库（位于 `packages/shared-utils/`）
  - `@uni-admin/ui-components`: 业务组件库（位于 `packages/ui-components/`）

- **建立完整的命名规范体系**
  - Package Name: kebab-case with scope (`@uni-admin/<name>`)
  - Directory: 小写复数或 kebab-case (`modules/`, `shared-types/`)
  - File: 按类型区分（组件 PascalCase，工具 kebab-case，类型 `.types.ts`）
  - Code Identifiers: 类/接口 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE

- **配置 pnpm Workspace 与工程化工具**
  - `pnpm-workspace.yaml`: 定义 workspace 范围（`apps/*`, `packages/*`）
  - TypeScript Project References: 启用增量编译和类型检查
  - 统一 ESLint/Prettier 配置: 根配置 + 各包继承

### 工程化基础设施

- **Docker 支持**: 提供 `docker-compose.yml`（MySQL + Redis）和独立的 Dockerfile（server/web）
- **根 package.json**: 集中管理 scripts（dev、build、test、lint）和 devDependencies
- **TypeScript 基础配置**: `tsconfig.base.json` 作为所有包的继承基础

### **BREAKING** 变更

无破坏性变更（项目处于初始阶段，无历史包袱）

## Capabilities

### New Capabilities

- **monorepo-structure**: 定义完整的 monorepo 目录结构、包职责划分、依赖关系约束。涵盖 `apps/`、`packages/`、`tooling/` 三层架构的组织方式和文件布局规范。

- **naming-conventions**: 建立全面的命名规范体系，包括 Package Name、Directory、File、Code Identifiers 四个层级的命名规则，确保项目一致性和可读性。

- **workspace-config**: 配置 pnpm workspace 管理、TypeScript 项目引用、ESLint/Prettier 统一配置、以及开发/构建/测试工作流脚本的定义。

### Modified Capabilities

（无现有 capabilities 需要修改）

## Impact

### 受影响的范围

**代码层面**:
- 整个项目的基础目录结构和文件组织方式
- 所有新增代码必须遵循新的命名规范
- TypeScript 配置从单项目升级为多项目引用模式

**依赖关系**:
- 新增 pnpm 作为包管理器（替代 npm/yarn）
- 新增 workspace 协议依赖（`workspace:*`）
- 根 package.json 集中管理开发工具依赖

**开发流程**:
- 开发命令变化: `pnpm --filter @uni/admin/web dev` 替代 `npm run dev`
- 构建流程: 支持独立构建各应用（`pnpm --filter @uni/admin/server build`）
- 测试流程: 可按包运行测试（`pnpm --filter @uni/admin/shared-utils test`）

**部署方式**:
- 前后端分离部署: server 和 web 各自独立的 Docker 镜像和 CI/CD 流程
- docker-compose 用于本地开发环境（MySQL + Redis）

**团队协作**:
- 新成员入职: 清晰的目录结构降低学习成本
- 代码审查: 统一的命名规范减少 style 讨论
- 二次开发: 标准化的结构便于理解和扩展

### 回滚计划

如果新架构存在问题：

1. **立即回滚**: 删除 `apps/`、`packages/` 目录，恢复为传统的单仓库结构
2. **渐进式回滚**: 如果某个 shared 包设计不合理，可以将其内联到对应 app 中
3. **配置回滚**: 移除 `pnpm-workspace.yaml`，改回普通 npm 项目

由于项目处于初始阶段，回滚成本极低，主要工作是删除新建的目录和配置文件。

### 受影响的团队/角色

- **前端开发**: 需要适应 `apps/web/` 下的新目录结构（views、stores、composables 等）
- **后端开发**: 需要适应 `apps/server/` 下的 NestJS 模块化结构（modules/ 组织方式）
- **DevOps**: 需要配置前后端分离的 CI/CD 流水和 Docker 构建
- **架构师/技术负责人**: 负责维护命名规范和 code review 时的一致性检查
