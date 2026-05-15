# uni-admin

<p align="center">
  <strong>NestJS + Vue3 + TypeScript 全栈管理后台基座</strong>
</p>

<p align="center">
  <sub>通用化 · 标准化 · 权限完善 · 可快速二次开发</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.0.1-blue" alt="version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.x-green" alt="node" />
  <img src="https://img.shields.io/badge/pnpm-%3E%3D8.x-red" alt="pnpm" />
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="license" />
</p>

***

## 📊 当前进度

> **v0.0.1** - Monorepo 基础架构搭建完成 ✅ (2026-05-15)

| 模块                  | 状态      | 说明                                                                        |
| ------------------- | ------- | ------------------------------------------------------------------------- |
| **Monorepo 基础设施**   | ✅ 完成    | pnpm workspace, TypeScript Project References, ESLint, Prettier           |
| **shared-types 包**  | ✅ 完成    | API 类型、实体类型、通用类型、枚举定义                                                     |
| **shared-utils 包**  | ✅ 完成    | 日期、字符串、格式化、验证、加密工具函数                                                      |
| **ui-components 包** | ✅ 完成    | DataTable, SearchForm, ModalForm 组件 + useDataTable/useForm/useModal hooks |
| **NestJS Server**   | ✅ 初始化完成 | 项目结构、CORS、ValidationPipe、Swagger 配置                                       |
| **Vue3 Web**        | ✅ 初始化完成 | Vite + Element Plus + Pinia + Router + API 层                              |
| **Docker 环境**       | ✅ 完成    | MySQL 8.0 + Redis 7.0 + Dockerfile.server/web                             |
| **Prisma Schema**   | ✅ 完成    | User, Role, Permission, Menu 数据模型                                         |
| **单元测试**            | ⏳ 待开发   | Vitest 配置已就绪，测试用例待编写                                                      |
| **RBAC 权限系统**       | ⏳ 开发中   | 用户/角色/权限/菜单管理模块                                                           |

***

## ✨ 特性

- 🏗️ **Monorepo 架构**: pnpm workspace + TypeScript Project References
- 📦 **共享包管理**: 统一的类型定义、工具函数、业务组件库
- 🎨 **Vue3 + Element Plus**: 现代化的前端 UI 框架
- ⚡ **NestJS**: 高效的后端开发框架
- 🔐 **权限完善**: RBAC 权限模型（开发中）
- 🛠️ **工程化**: ESLint + Prettier + Vitest + Playwright
- 🐳 **Docker 支持**: 一键启动本地开发环境（MySQL + Redis）

## 📁 Monorepo 结构

```
uni-admin/
├── apps/                          # 应用层（可独立部署）
│   ├── server/                    # NestJS 后端 (@uni-admin/server)
│   │   └── src/
│   │       ├── main.ts            # 入口文件
│   │       ├── app.module.ts      # 根模块
│   │       ├── common/            # 公共基础设施
│   │       ├── config/            # 配置模块
│   │       └── modules/           # 业务模块
│   │
│   └── web/                       # Vue3 前端 (@uni-admin/web)
│       └── src/
│           ├── main.ts            # Vue 入口
│           ├── api/               # API 层
│           ├── views/             # 页面视图
│           ├── stores/            # Pinia 状态管理
│           └── router/            # 路由配置
│
├── packages/                      # 共享库（不可独立运行）
│   ├── shared-types/              # TypeScript 类型定义
│   ├── shared-utils/              # 公共工具函数
│   └── ui-components/             # 业务 UI 组件库
│
├── docker-compose.yml             # Docker 编排 (MySQL + Redis)
├── pnpm-workspace.yaml            # Workspace 配置
└── tsconfig.base.json             # TS 基础配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose（可选，用于本地数据库和 Redis）

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/your-org/uni-admin.git
cd uni-admin

# 2. 安装依赖
pnpm install

# 3. 启动依赖服务（MySQL + Redis）
docker-compose up -d

# 4. 复制环境变量
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

# 5. 启动开发服务器（前后端并行）
pnpm dev

# 或者分别启动：
# pnpm dev:server    # 后端: http://localhost:3000
# pnpm dev:web       # 前端: http://localhost:5173
```

### 访问地址

| 服务         | 地址                               | 说明            |
| ---------- | -------------------------------- | ------------- |
| 前端         | <http://localhost:5173>          | Vue3 开发服务器    |
| 后端 API     | <http://localhost:3000>          | NestJS 服务     |
| Swagger 文档 | <http://localhost:3000/api/docs> | API 文档（仅开发环境） |
| MySQL      | localhost:3306                   | 数据库           |
| Redis      | localhost:6379                   | 缓存            |

## 📦 核心包介绍

### @uni-admin/shared-types

前后端共享的 TypeScript 类型定义：

- API 请求/响应类型（ApiResponse, PaginatedResponse）
- 实体类型（IUser, IRole, IPermission, IMenu）
- 公共类型（ID, Timestamps, EnumStatus）
- 枚举常量（UserRole, UserStatus, PermissionType）

### @uni-admin/shared-utils

通用工具函数库：

- `date.ts`: 日期处理（formatDate, getRelativeTime, getDateRange）
- `string.ts`: 字符串操作（camelize, snakeize, truncate）
- `format.ts`: 数据格式化（formatFileSize, formatNumber, maskSensitiveData）
- `validate.ts`: 验证函数（isEmail, isPhone, isIdCard, isUrl）
- `crypto.ts`: 加密工具（md5, sha256, base64）

### @uni-admin/ui-components

基于 Element Plus 的业务组件库：

- `DataTable`: 通用数据表格（分页、排序、多选）
- `SearchForm`: 搜索表单
- `ModalForm`: 弹窗表单
- Hooks: useDataTable, useForm, useModal

## 🛠️ 常用命令

```bash
# 开发
pnpm dev              # 启动所有应用
pnpm dev:server       # 仅启动后端
pnpm dev:web          # 仅启动前端

# 构建
pnpm build            # 构建所有包
pnpm build:server     # 仅构建后端
pnpm build:web        # 仅构建前端

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm format           # Prettier 格式化
pnpm typecheck        # TypeScript 类型检查

# 测试
pnpm test             # 运行所有测试
pnpm test:e2e         # E2E 测试

# 清理
pnpm clean            # 删除 dist 和 node_modules
```

## 🏗️ 技术栈

**前端**:

- Vue 3.4+ (Composition API)
- Vite 5.0+
- Pinia (状态管理)
- Vue Router 4
- Element Plus (UI 组件库)
- Axios (HTTP 客户端)
- SCSS (样式预处理器)

**后端**:

- Node.js 20+
- NestJS 10.x
- Prisma (ORM)
- class-validator (参数校验)
- Swagger/OpenAPI (API 文档)

**数据存储**:

- MySQL 8.0 (主数据库)
- Redis 7 (缓存)

**工程化**:

- pnpm (包管理器)
- TypeScript 5.3+ (严格模式)
- ESLint + Prettier (代码质量)
- Vitest (单元测试)
- Playwright (E2E 测试)
- Docker (容器化)

## 📝 开发规范

项目遵循统一的命名规范：

| 层级           | 规范                                                        | 示例                           |
| ------------ | --------------------------------------------------------- | ---------------------------- |
| Package Name | `@uni-admin/<kebab-case>`                                 | @uni-admin/server            |
| Directory    | 小写复数 / kebab-case                                         | components/, shared-types/   |
| File         | PascalCase (组件) / kebab-case (工具)                         | DataTable.vue, date-utils.ts |
| Code         | PascalCase (类) / camelCase (函数) / UPPER\_SNAKE\_CASE (常量) | UserService, getUserById     |

详见 [OpenSpec 设计文档](./openspec/changes/setup-pnpm-monorepo-structure/)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细贡献指南。

## 📄 License

[MIT](./LICENSE)
