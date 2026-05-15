# Monorepo Structure Specification

定义 uni-admin 项目完整的 Monorepo 目录结构、包职责划分、文件组织规则和依赖关系约束。

---

## Purpose

本规格定义 uni-admin 项目的 Monorepo 结构，确保项目具有清晰的目录组织、合理的包职责划分、规范的依赖关系，以及一致的测试文件组织方式。

---

## Requirements

### Requirement: 项目根目录结构

项目根目录 SHALL 包含以下顶层目录和文件，用于组织应用层、共享库层和工程化工具：

**必需的顶层目录**:
- `apps/`: 存放可独立部署的应用程序（NestJS 后端、Vue3 前端）
- `packages/`: 存放不可独立运行的共享库（类型、工具、组件）
- `tooling/`: 存放工程化工具配置（ESLint 配置、构建脚本等）

**必需的根级别文件**:
- `pnpm-workspace.yaml`: pnpm workspace 配置文件
- `package.json`: 根 package.json（管理共享 scripts 和 devDependencies）
- `tsconfig.base.json`: TypeScript 基础配置（所有包继承此配置）
- `.eslintrc.js`: 根 ESLint 配置
- `.prettierrc`: Prettier 格式化配置
- `.gitignore`: Git 忽略规则
- `README.md`: 项目说明文档

#### Scenario: 验证根目录结构完整性
- **WHEN** 开发者克隆项目并查看根目录
- **THEN** SHALL 看到 `apps/`, `packages/`, `tooling/` 三个主要目录
- **AND** SHALL 看到 `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json` 文件存在
- **AND** 所有必需的配置文件（`.eslintrc.js`, `.prettierrc`, `.gitignore`）都存在

#### Scenario: 根目录不包含业务代码
- **WHEN** 查看项目根目录的文件和文件夹
- **THEN** 根目录 SHALL NOT 包含任何业务逻辑代码（如 src/, lib/, dist/ 等）
- **AND** 根目录只包含配置文件、文档和目录组织结构

---

### Requirement: apps/ 目录结构与职责

`apps/` 目录 SHALL 存放所有可以独立构建、测试、部署的应用程序。每个应用 MUST 是一个完整的、可运行的单元。

**必需的应用**:
1. `apps/server/`: NestJS 后端应用（@uni-admin/server）
2. `apps/web/`: Vue3 前端应用（@uni-admin/web）

**每个应用必须包含的内容**:
- `src/`: 应用源代码目录
- `package.json`: 应用独立的依赖声明（使用 workspace:* 协议引用 shared packages）
- `tsconfig.json` (或 `tsconfig.app.json`): TypeScript 配置（继承 tsconfig.base.json）
- 构建配置文件（如 `nest-cli.json`, `vite.config.ts`）

**禁止事项**:
- apps 下的包 SHALL NOT 被其他 packages 引用（只能 packages → apps 的单向依赖的反向是禁止的）

#### Scenario: apps/server 后端应用结构
- **WHEN** 查看 `apps/server/` 目录
- **THEN** SHALL 包含以下核心结构：
  - `src/main.ts`: NestJS 应用入口
  - `src/app.module.ts`: NestJS 根模块
  - `src/common/`: 公共装饰器、过滤器、拦截器、管道
  - `src/config/`: 配置模块（数据库、Redis、应用配置）
  - `src/modules/`: 业务模块（auth, user, role, permission）
  - `src/prisma/`: Prisma schema 和迁移文件
  - `package.json`: 声明对 @uni-admin/shared-types 和 @uni-admin/shared-utils 的依赖
  - `nest-cli.json`: NestJS CLI 配置
  - `tsconfig.app.json`: TypeScript 配置（启用 Project References）

#### Scenario: apps/web 前端应用结构
- **WHEN** 查看 `apps/web/` 目录
- **THEN** SHALL 包含以下核心结构：
  - `src/main.ts`: Vue 应用入口
  - `src/App.vue`: Vue 根组件
  - `src/api/`: API 请求层（Axios 实例、请求拦截器、按模块组织的 API）
  - `src/views/`: 页面视图（路由级别的 Vue 组件）
  - `src/components/`: 页面级组件（非通用组件）
  - `src/stores/`: Pinia 状态管理（按模块组织 Store）
  - `src/router/`: 路由配置（路由定义、路由守卫）
  - `src/composables/`: 组合式函数（Vue3 Composition API）
  - `src/layouts/`: 布局组件（DefaultLayout, AuthLayout）
  - `src/assets/`: 静态资源（样式、图片、图标）
  - `package.json`: 声明对 @uni-admin/shared-types, @uni-admin/shared-utils, @uni-admin/ui-components 的依赖
  - `vite.config.ts`: Vite 构建配置
  - `tsconfig.app.json`: TypeScript 配置（启用 Project References）
  - `index.html`: HTML 入口文件

#### Scenario: apps 下的应用可以独立运行
- **WHEN** 开发者进入 `apps/server/` 并执行 `pnpm dev`
- **THEN** NestJS 应用 SHOULD 能够独立启动并提供 API 服务（假设依赖的服务如 MySQL 已就绪）
- **WHEN** 开发者进入 `apps/web/` 并执行 `pnpm dev`
- **THEN** Vue 应用 SHOULD 能够独立启动并在浏览器中访问（假设后端 API 可用）

---

### Requirement: packages/ 目录结构与职责

`packages/` 目录 SHALL 存放所有共享库，这些库被 apps 或其他 packages 引用，但本身不能独立运行或部署。

**必需的共享库**:
1. `packages/shared-types/`: 共享 TypeScript 类型定义（@uni-admin/shared-types）
2. `packages/shared-utils/`: 公共工具函数库（@uni-admin/shared-utils）
3. `packages/ui-components/`: 业务 UI 组件库（@uni-admin/ui-components）

**每个 package 必须包含的内容**:
- `src/`: 库源代码目录
- `index.ts`: 统一导出入口（re-export 所有公共 API）
- `package.json`: 库的元数据和依赖声明
- `tsconfig.json`: TypeScript 配置（启用 composite 和 declaration）
- `README.md`: 库的使用说明文档（可选但推荐）

**构建要求**:
- 每个 package MUST 能够独立构建（生成 dist/ 目录）
- MUST 导出类型声明（.d.ts 文件）以支持 TypeScript consumers
- 推荐使用 `tsup` 作为构建工具（零配置 TypeScript 打包）

#### Scenario: packages/shared-types 类型定义库
- **WHEN** 查看 `packages/shared-types/src/` 目录
- **THEN** SHALL 包含以下内容：
  - `index.ts`: 统一导出所有类型
  - `api.types.ts`: API 请求/响应类型（ApiResponse<T>, PaginatedResponse<T>, ApiError, PaginationParams）
  - `entity.types.ts`: 实体类型（IUser, IRole, IPermission, IMenu 对应数据库模型）
  - `common.types.ts`: 公共类型（ID, Timestamps, EnumStatus, OptionItem）
  - `enums.ts`: 枚举常量（UserRole, UserStatus, PermissionType, HttpMethod）
- **AND** 该包 SHALL NOT 包含任何业务逻辑实现代码（只有类型定义和枚举）
- **AND** 该包 SHALL NOT 依赖任何外部运行时库（保持零依赖）

#### Scenario: packages/shared-utils 工具函数库
- **WHEN** 查看 `packages/shared-utils/src/` 目录
- **THEN** SHALL 包含以下功能模块：
  - `date.ts`: 日期处理工具（formatDate, getRelativeTime, getDateRange, isExpired）
  - `string.ts`: 字符串处理工具（camelize, snakeize, truncate, generateRandomString）
  - `format.ts`: 数据格式化（formatFileSize, formatNumber, maskSensitiveData）
  - `validate.ts`: 验证函数（isEmail, isPhone, isIdCard, isUrl）
  - `crypto.ts`: 加密相关工具（md5, sha256, base64Encode/Decode）
- **AND** 所有工具函数 MUST 是纯函数（无副作用，便于测试）
- **AND** 对于环境敏感的 API（如 Node.js crypto），SHALL 提供浏览器 polyfill 或条件导出

#### Scenario: packages/ui-components 业务组件库
- **WHEN** 查看 `packages/ui-components/src/` 目录
- **THEN** SHALL 包含以下内容：
  - `components/`: 业务组件集合
    - `DataTable/`: 通用数据表格（基于 el-table 封装，支持分页、排序、选择）
    - `SearchForm/`: 搜索表单（基于 el-form 封装，支持动态字段）
    - `ModalForm/`: 弹窗表单（基于 el-dialog + el-form 封装）
    - `Upload/`: 文件上传组件
    - `RichTextEditor/`: 富文本编辑器组件
  - `hooks/`: 配套的组合式函数（useDataTable, useForm, useModal）
  - `theme/`: Element Plus 主题变量覆盖
- **AND** 每个组件 MUST 有完整的 TypeScript Props 类型定义
- **AND** 该包 MUST 依赖 @uni-admin/shared-types（复用通用类型）

---

### Requirement: tooling/ 目录结构与用途

`tooling/` 目录 SHALL 存放工程化工具配置和脚本，用于提升开发效率和代码质量。

**推荐内容**:
- `tooling/eslint-config/`: 自定义 ESLint 规则集（@uni-admin/eslint-config）
- `tooling/scripts/`: 构建脚本、代码生成工具、自动化脚本

**tooling/ 与 packages/ 的区别**:
- `packages/` 下的库会被应用引用（作为 dependency）
- `tooling/` 下的配置通常只在开发时使用（作为 devDependency）

#### Scenario: tooling/eslint-config 自定义规则
- **WHEN** 查看 `tooling/eslint-config/`（如果存在）
- **THEN** 它 SHOULD 包含针对 uni-admin 项目的自定义 ESLint 规则
- **AND** 这些规则 SHOULD 强制执行命名规范（如文件命名、变量命名等）
- **AND** 各个 app/package 可以通过 `extends: "@uni-admin/eslint-config"` 来继承这些规则

#### Scenario: tooling/scripts 自动化脚本
- **WHEN** 查看 `tooling/scripts/`（如果存在）
- **THEN** 它 SHOULD 包含有用的自动化脚本，例如：
  - `generate-module.sh`: 快速生成 NestJS 模块脚手架
  - `generate-component.sh`: 快速生成 Vue 组件脚手架
  - `sync-types.sh`: 同步前后端类型定义

---

### Requirement: 依赖关系约束

Monorepo 内的包依赖关系 MUST 形成有向无环图（DAG），严格遵守以下规则：

**允许的依赖方向**:
- ✅ `apps/*` → `packages/*`（应用可以引用共享库）
- ✅ `packages/ui-components` → `packages/shared-types`（UI 组件库可以引用类型定义）

**禁止的依赖方向**:
- ❌ `packages/*` → `apps/*`（共享库不能引用应用，避免循环依赖）
- ❌ `packages/*` ↔ `packages/*`（共享库之间尽量避免循环依赖，如需依赖必须形成 DAG）

**workspace 协议使用**:
- 在 package.json 中引用内部包时，MUST 使用 `"workspace:*"` 协议
- 版本号在发布时会自动解析为实际版本号

#### Scenario: 验证依赖关系正确性
- **WHEN** 执行 `pnpm ls --depth -1` 或类似命令检查依赖关系
- **THEN** SHALL NOT 发现循环依赖
- **AND** apps/server 的 dependencies 中 SHALL 包含 @uni-admin/shared-types 和 @uni-admin/shared-utils
- **AND** apps/web 的 dependencies 中 SHALL 包含 @uni-admin/shared-types, @uni-admin/shared-utils, @uni-admin/ui-components
- **AND** packages/ui-components 的 dependencies 中 MAY 包含 @uni-admin/shared-types
- **AND** packages/shared-types 和 packages/shared-utils 的 dependencies 中 SHALL NOT 包含任何其他内部包

#### Scenario: workspace 协议正确性
- **WHEN** 查看 apps/web/package.json 的 dependencies 部分
- **THEN** 对内部包的版本声明 MUST 使用 `"workspace:*"` 格式
- **例如**: `"@uni-admin/shared-types": "workspace:*"` 而不是 `"^0.0.1"`

---

### Requirement: 测试目录组织

每个 app 和 package SHOULD 包含测试文件，测试文件的组织方式 MUST 遵循以下约定：

**测试文件位置**:
- 单元测试: 与源码同目录，文件名添加 `.spec.ts` 或 `.test.ts` 后缀
- E2E 测试: 在各 app 根目录下创建 `test/` 或 `e2e/` 目录

**测试文件命名示例**:
- `UserService.spec.ts`: UserService 类的单元测试
- `date-utils.test.ts`: date 工具函数的单元测试
- `DataTable.cy.ts`: DataTable 组件的 Playwright E2E 测试

#### Scenario: 测试文件与源码共存
- **WHEN** 查看 `apps/server/src/modules/user/` 目录
- **THEN** 如果存在用户相关的测试，它们 SHOULD 位于 `user.service.spec.ts` 或 `user.controller.spec.ts`
- **AND** 测试文件 SHOULD 与被测文件位于同一目录或平行的 `__tests__/` 子目录

#### Scenario: E2E 测试独立存放
- **WHEN** 查看 `apps/server/test/` 或 `apps/web/e2e/` 目录
- **THEN** SHOULD 包含端到端测试文件（如 `app.e2e-spec.ts`）
- **AND** 这些测试验证整个应用的集成行为，而非单个函数/组件
