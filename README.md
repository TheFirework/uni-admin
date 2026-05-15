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

> **v0.0.2** - 基础依赖服务搭建完成 ✅ (2026-05-15)

| 模块                    | 状态      | 说明                                                                                      |
| --------------------- | ------- | --------------------------------------------------------------------------------------- |
| **Monorepo 基础设施**    | ✅ 完成    | pnpm workspace, TypeScript Project References, ESLint, Prettier                          |
| **shared-types 包**   | ✅ 完成    | API 类型、实体类型、通用类型、枚举定义 + Zod Schema 共享验证层                                                    |
| **shared-utils 包**   | ✅ 完成    | 日期、字符串、格式化、验证、加密工具函数                                                              |
| **ui-components 包**  | ✅ 完成    | DataTable, SearchForm, ModalForm 组件 + useDataTable/useForm/useModal hooks                  |
| **NestJS Server**     | ✅ 完成    | 项目结构、CORS、ValidationPipe、Swagger/Knife4j 文档                                                |
| **JWT 认证系统**       | ✅ 完成    | 双 Token 机制（Access Token + Refresh Token）、Passport 策略、Token 轮换、Redis 存储                          |
| **Redis 缓存系统**     | ✅ 完成    | cache-manager 集成、热点数据缓存、分布式锁、Nonce 防重放                                                  |
| **Bull 任务队列**      | ✅ 完成    | Email/Report/Cleanup 队列、任务调度服务、失败重试机制                                                      |
| **Winston 日志系统**   | ✅ 完成    | 结构化 JSON 日志、文件轮转、全局日志拦截器、异常过滤器                                                       |
| **数据安全模块**       | ✅ 完成    | AES 加解密、HMAC 签名验证、接口签名守卫                                                               |
| **Knex 数据访问层**    | ✅ 完成    | BaseRepository 泛型封装、UserRepository 业务查询、复杂联表/聚合统计                                              |
| **种子数据系统**       | ✅ 完成    | 模块化种子系统（Role/User/Permission/Dictionary/SystemConfig）、幂等性保证                                      |
| **Vue3 Web**          | ✅ 初始化完成 | Vite + Element Plus + Pinia + Router + API 层 + 工具库配置（dayjs/iconify/vee-validate/vuedraggable）        |
| **Docker 环境**        | ✅ 完成    | MySQL 8.0 + Redis 7.0 + Dockerfile.server/web                                                           |
| **Prisma Schema**     | ✅ 完成    | User, Role, Permission, Menu 数据模型                                                                 |
| **单元测试**           | ⏳ 待开发   | Vitest 配置已就绪，测试用例待编写                                                                        |
| **RBAC 权限系统**      | ⏳ 待开发   | 用户/角色/权限/菜单管理模块（TODO: 集成 Casbin）                                                          |

### 🎯 本版本新增功能 (v0.0.2)

#### 🔐 认证与安全
- ✅ **JWT 双 Token 认证**: Access Token (15min) + RefreshToken (7d) + HttpOnly Cookie 安全传输
- ✅ **Token 轮换策略**: 每次 Refresh 后旧 Token 立即失效，防止重放攻击
- ✅ **Redis Token 黑名单**: 支持强制下线（修改密码/冻结账号时批量删除所有设备 Token）
- ✅ **接口签名验证**: HMAC-SHA256 签名 + Nonce 防重放 + 时间戳窗口校验

#### ⚡ 性能与缓存
- ✅ **Redis 多场景缓存**: 
  - 热点数据缓存（TTL 可配置）
  - RefreshToken 分布式存储（支持多设备登录）
  - Nonce 防重放存储（5 分钟窗口）
  - 分布式互斥锁（防止并发重复执行）
- ✅ **自动缓存装饰器**: `@Cache()` + CacheInterceptor 实现接口级响应缓存

#### 📋 任务队列与异步处理
- ✅ **Bull 队列管理**: 
  - Email Queue（邮件发送，支持 HTML 模板）
  - Report Queue（报表生成 Excel/PDF）
  - Cleanup Queue（定时清理过期数据/临时文件/旧日志）
- ✅ **TaskSchedulerService**: 统一任务调度入口，支持延迟任务和状态查询

#### 🛠️ 数据访问增强
- ✅ **Knex.js 查询构建器**: 补充 Prisma 复杂查询能力（JOIN、聚合统计、窗口函数）
- ✅ **BaseRepository<T>**: 泛型 CRUD 封装 + 分页查询 + 动态条件构建
- ✅ **UserRepository**: 用户特定查询（模糊搜索、联表角色、活跃度统计）

#### 🌐 Web 端工具库
- ✅ **@vueuse/core**: Vue 组合式 API 工具集
- ✅ **dayjs**: 日期处理（中文语言包、relativeTime、timezone）
- ✅ **@iconify/vue**: 统一图标管理（Element Plus 图标集）
- ✅ **vee-validate**: 表单验证（blur 触发、自定义错误组件）
- ✅ **vuedraggable.next**: 拖拽排序组件
- ✅ **zod**: TypeScript-first Schema 验证（前后端共享）

#### 📝 开发体验优化
- ✅ **Knife4j 增强 UI**: 比 Swagger 更美观的 API 文档界面 (`/doc.html`)
- ✅ **结构化日志**: Winston JSON 格式 + 文件按天轮转 + 全局请求拦截器
- ✅ **统一异常处理**: 标准错误响应格式（code/message/details/timestamp/path）
- ✅ **Zod Schema 共享**: 前后端共用类型定义，避免 DTO 不一致问题
- ✅ **模块化种子数据**: 支持 `--module` 选择性执行 + `--drop` 清空重建

***

## ✨ 特性

- 🏗️ **Monorepo 架构**: pnpm workspace + TypeScript Project References
- 📦 **共享包管理**: 统一的类型定义、工具函数、业务组件库
- 🎨 **Vue3 + Element Plus**: 现代化的前端 UI 框架
- ⚡ **NestJS**: 高效的后端开发框架
- 🔐 **JWT 双 Token 认证**: Access Token + RefreshToken + Token 轮换策略
- 🗄️ **Redis 缓存系统**: 热点数据缓存、分布式锁、Token 黑名单
- 📋 **Bull 任务队列**: 异步邮件发送、报表生成、定时清理任务
- 📝 **Knife4j API 文档**: 增强 Swagger UI，更美观的接口文档界面
- 🛡️ **数据安全**: AES 加解密、HMAC 签名验证、接口防重放
- 📊 **Knex 数据访问**: 复杂查询构建器、泛型 Repository 封装
- 📦 **Zod 共享验证**: 前后端 Schema 复用，TypeScript 类型安全
- 🌱 **种子数据系统**: 模块化数据填充、幂等性保证
- 🔐 **权限完善**: RBAC 权限模型（待集成 Casbin）
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

| 服务           | 地址                                | 说明                  |
| ------------ | --------------------------------- | ------------------- |
| 前端           | <http://localhost:5173>           | Vue3 开发服务器          |
| 后端 API       | <http://localhost:3000>           | NestJS 服务           |
| Swagger 文档    | <http://localhost:3000/api/docs>  | 标准 API 文档（仅开发环境）   |
| **Knife4j 文档** | **<http://localhost:3000/doc.html>** | **增强 API 文档（推荐）** |
| MySQL         | localhost:3306                    | 数据库                 |
| Redis         | localhost:6379                    | 缓存                  |

### 默认账号

| 角色     | 用户名      | 密码            | 用途        |
| ------ | -------- | ------------- | --------- |
| 超级管理员 | admin    | Admin@123456  | 系统管理操作   |
| 测试用户  | testuser | Test@123456   | 功能测试使用   |

> ⚠️ **安全提示**: 生产环境部署前请务必修改默认密码！

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

# 数据库 & 种子数据（在 apps/server 目录下执行）
cd apps/server
npm run seed          # 填充所有种子数据（30条记录）
npm run seed:drop     # 清空所有种子数据后重新填充
npx prisma migrate dev  # 运行数据库迁移
npx prisma studio      # 打开 Prisma 数据库可视化工具

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
- **@vueuse/core** (组合式 API 工具集)
- **dayjs** (日期处理)
- **@iconify/vue** (图标管理)
- **vee-validate** (表单验证)
- **vuedraggable.next** (拖拽排序)
- **zod** (Schema 验证，与后端共享)
- SCSS (样式预处理器)

**后端**:

- Node.js 20+
- NestJS 10.x
- Prisma (ORM)
- **Knex.js** (SQL 查询构建器)
- **JWT + Passport** (认证鉴权)
- **Bull + Redis** (任务队列)
- **Winston** (日志系统)
- **Zod** (Schema 验证)
- class-validator (参数校验)
- **Knife4j / Swagger/OpenAPI** (API 文档增强)
- **crypto-js** (数据加密)
- **bcrypt** (密码哈希)

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
