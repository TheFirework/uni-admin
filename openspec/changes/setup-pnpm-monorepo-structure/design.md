## Context

### 项目背景

uni-admin 是一个 NestJS + Vue3 + TypeScript 全栈管理后台基座项目，定位为"通用企业级管理后台"，主打：
- 通用化 & 标准化
- 权限完善
- 可快速二次开发

### 当前状态

项目处于**初始阶段**，仅有基础配置文件（README.md、LICENSE、openspec/config.yaml），尚未开始实际代码开发。这是建立正确架构的**最佳时机**。

### 技术栈约束

```
前端: Vue3 + Vite + Pinia + Element Plus + TailwindCSS
后端: Node.js + NestJS + Prisma
数据: MySQL + Redis
工程: pnpm Monorepo + Docker
测试: Vitest (单元) + Playwright (E2E)
质量: ESLint + Prettier + Strict TypeScript
```

### 利益相关者

- **前端开发者**: 需要清晰的组件组织和状态管理结构
- **后端开发者**: 需要模块化的 NestJS 架构
- **DevOps**: 需要前后端分离部署支持
- **二次开发者**: 需要标准化的结构降低学习成本

---

## Goals / Non-Goals

### ✅ Goals（目标）

1. **建立专业的 Monorepo 目录结构**
   - 采用 `apps/` + `packages/` 分层架构
   - 明确包职责和依赖方向
   - 支持独立构建、测试、部署

2. **定义完整的命名规范体系**
   - Package Name: `@uni-admin/<kebab-case-name>`
   - Directory: 小写复数或 kebab-case
   - File: 按类型区分命名规则
   - Code Identifiers: TypeScript 标准命名约定

3. **配置工程化基础设施**
   - pnpm workspace 管理
   - TypeScript Project References
   - 统一代码质量工具（ESLint/Prettier）
   - Docker 本地开发环境

4. **确保可扩展性**
   - 结构支持未来新增 packages/apps
   - 命名规范适应业务增长
   - 配置支持多环境部署

### ❌ Non-Goals（非目标）

- **不包含具体业务逻辑实现**: 本设计仅关注架构和规范，不涉及 auth、user 等业务模块的具体代码
- **不包含 CI/CD 流水线配置**: CI/CD 属于 DevOps 范畴，后续单独规划
- **不包含性能优化细节**: 如构建优化、缓存策略等，属于实施阶段考虑
- **不强制使用 Turborepo/Nx**: 虽然结构兼容这些工具，但初始阶段不引入额外构建工具复杂度

---

## Decisions

### 决策 1: 采用 apps/ + packages/ 分层架构

#### 选择方案

```
uni-admin/
├── apps/                    # 可独立部署的应用
│   ├── server/              # @uni-admin/server (NestJS)
│   └── web/                 # @uni-admin/web (Vue3)
│
├── packages/                # 共享库（不可独立运行）
│   ├── shared-types/        # @uni-admin/shared-types
│   ├── shared-utils/        # @uni-admin/shared-utils
│   └── ui-components/       # @uni-admin/ui-components
│
└── tooling/                 # 工程化工具配置
    ├── eslint-config/
    └── scripts/
```

#### 为什么选择此方案？

**优势**:
1. **语义清晰**: 一眼区分"产品"（apps）和"库"（packages）
2. **依赖单向**: `apps` → `packages`，禁止反向依赖，避免循环引用
3. **符合业界标准**: Turborepo、Nx、Lerna 都推荐这种结构
4. **部署明确**: 只有 `apps/` 下的项目需要部署，`packages/` 是纯库

**替代方案对比**:

| 方案 | 描述 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **✅ 选择: apps/packages 分离** | 应用与库物理分离 | 职责清晰、依赖单向 | 初始稍复杂 | 中大型项目、长期维护 |
| 传统 flat 结构 | 所有包平铺在 packages/ | 简单直观 | 混淆应用与库 | 小型项目、原型验证 |
| 按功能域拆分 | 按 auth/user/permission 组织 | 高内聚 | 跨域共享困难 | 微服务架构 |

**决策理由**: uni-admin 定位为"管理后台基座"，需要长期维护且会被二次开发，选择专业结构虽然初期稍复杂，但长期收益显著。

---

### 决策 2: 包粒度与职责划分

#### 包设计详情

##### 1️⃣ @uni/admin/server (apps/server)

**职责**: 后端 NestJS 应用，提供 RESTful API

**目录结构**:

```
apps/server/
├── src/
│   ├── main.ts                      # NestJS 入口文件
│   ├── app.module.ts                # 根模块（聚合所有子模块）
│   │
│   ├── common/                      # 公共基础设施
│   │   ├── decorators/              # 自定义装饰器
│   │   │   ├── api-response.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/                 # 异常过滤器
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/            # 拦截器
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   ├── pipes/                   # 管道
│   │   │   └── validation.pipe.ts
│   │   └── utils/                   # 服务端工具函数
│   │       └── crypto.util.ts
│   │
│   ├── config/                      # 配置模块
│   │   ├── database.config.ts       # 数据库配置
│   │   ├── redis.config.ts          # Redis 配置
│   │   └── app.config.ts            # 应用配置
│   │
│   ├── modules/                     # 业务模块（按功能域组织）
│   │   ├── auth/                    # 认证模块
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/          # Passport 策略
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   ├── guards/              # 守卫
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   └── dto/                 # 数据传输对象
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── user/                    # 用户模块
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── entities/            # 实体类
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── role/                    # 角色模块
│   │   └── permission/              # 权限模块
│   │
│   └── prisma/                      # Prisma ORM 配置
│       ├── schema.prisma            # 数据模型定义
│       └── migrations/              # 数据库迁移文件
│           └── .gitkeep
│
├── test/                            # 测试文件
│   ├── app.e2e-spec.ts              # E2E 测试
│   └── jest-e2e.json               # Jest 配置
│
├── package.json                     # 声明依赖 @uni-admin/shared-types, @uni-admin/shared-utils
├── nest-cli.json                    # NestJS CLI 配置
├── tsconfig.app.json               # 继承 tsconfig.base.json
└── tsconfig.spec.json              # 测试用 TS 配置
```

**关键依赖**:
```json
{
  "dependencies": {
    "@uni-admin/shared-types": "workspace:*",
    "@uni-admin/shared-utils": "workspace:*"
  }
}
```

---

##### 2️⃣ @uni/admin/web (apps/web)

**职责**: 前端 Vue3 应用，提供管理后台 UI

**目录结构**:

```
apps/web/
├── src/
│   ├── main.ts                      # Vue 应用入口
│   ├── App.vue                      # 根组件
│   ├── env.d.ts                     # 环境变量类型声明
│   │
│   ├── api/                         # API 请求层
│   │   ├── index.ts                 # Axios 实例配置
│   │   ├── request.ts               # 请求拦截器（token、错误处理）
│   │   └── modules/                 # 按模块组织 API
│   │       ├── auth.api.ts          # 认证相关 API
│   │       └── user.api.ts          # 用户相关 API
│   │
│   ├── views/                       # 页面视图（路由级别）
│   │   ├── login/                   # 登录页
│   │   │   └── index.vue
│   │   ├── dashboard/               # 仪表盘
│   │   │   └── index.vue
│   │   └── system/                  # 系统管理
│   │       ├── user/
│   │       └── role/
│   │
│   ├── components/                  # 页面级组件（非通用）
│   │   ├── LoginForm.vue
│   │   └── UserTable.vue
│   │
│   ├── stores/                      # Pinia 状态管理
│   │   ├── index.ts                 # Store 实例创建
│   │   ├── modules/                 # 按模块组织 Store
│   │   │   ├── auth.store.ts        # 认证状态
│   │   │   ├── user.store.ts        # 用户状态
│   │   │   └── app.store.ts         # 应用全局状态
│   │
│   ├── router/                      # 路由配置
│   │   ├── index.ts                 # 路由实例
│   │   ├── routes/                  # 路由定义
│   │   │   ├── public.routes.ts     # 公开路由（登录等）
│   │   │   └── protected.routes.ts  # 受保护路由（需要认证）
│   │   └── guards/                  # 路由守卫
│   │       └── auth.guard.ts
│   │
│   ├── composables/                 # 组合式函数（Vue3 Composition API）
│   │   ├── useAuth.ts               # 认证逻辑
│   │   ├── usePagination.ts         # 分页逻辑
│   │   └── useDialog.ts             # 弹窗逻辑
│   │
│   ├── layouts/                     # 布局组件
│   │   ├── DefaultLayout.vue        # 默认布局（侧边栏 + 顶栏 + 内容区）
│   │   ├── AuthLayout.vue           # 认证布局（登录/注册页）
│   │   └── components/              # 布局子组件
│   │       ├── Sidebar.vue
│   │       ├── Header.vue
│   │       └── Breadcrumb.vue
│   │
│   ├── assets/                      # 静态资源
│   │   ├── styles/                  # 全局样式
│   │   │   ├── variables.scss       # SCSS 变量
│   │   │   ├── mixins.scss          # SCSS mixins
│   │   │   └── global.scss          # 全局样式
│   │   ├── images/                  # 图片资源
│   │   └── icons/                   # 图标资源
│   │
│   └── utils/                       # 前端工具函数
│       ├── permission.ts            # 权限指令
│       └── format.ts                # 格式化函数
│
├── public/                          # 公共静态资源
│   └── favicon.ico
│
├── package.json                     # 声明依赖 @uni-admin/shared-types, @uni-admin/shared-utils, @uni-admin/ui-components
├── vite.config.ts                   # Vite 配置（别名、代理、插件）
├── tsconfig.app.json               # 继承 tsconfig.base.json
├── index.html                       # HTML 入口
└── .env                             # 环境变量（开发环境）
```

**关键依赖**:
```json
{
  "dependencies": {
    "@uni-admin/shared-types": "workspace:*",
    "@uni-admin/shared-utils": "workspace:*",
    "@uni-admin/ui-components": "workspace:*"
  }
}
```

---

##### 3️⃣ @uni/admin/shared-types (packages/shared-types)

**职责**: 前后端共享的 TypeScript 类型定义

**目录结构**:

```
packages/shared-types/src/
├── index.ts                         # 统一导出入口（re-export 所有类型）
│
├── api.types.ts                     # API 请求/响应类型
│   ├── ApiResponse<T>               # 统一响应包装
│   ├── PaginatedResponse<T>         # 分页响应
│   ├── ApiError                     # 错误响应
│   └── PaginationParams             # 分页参数
│
├── entity.types.ts                  # 实体类型（对应数据库模型）
│   ├── IUser                        # 用户实体
│   ├── IRole                        # 角色实体
│   ├── IPermission                  # 权限实体
│   └── IMenu                        # 菜单实体
│
├── common.types.ts                  # 公共类型
│   ├── ID                           # 主键类型（string | number）
│   ├── Timestamps                   # 时间戳字段（createdAt, updatedAt）
│   ├── EnumStatus                   # 通用状态枚举
│   └── OptionItem                   # 下拉选项类型
│
└── enums.ts                         # 枚举常量定义
    ├── UserRole                     # 用户角色枚举
    ├── UserStatus                   # 用户状态枚举
    ├── PermissionType               # 权限类型枚举
    └── HttpMethod                   # HTTP 方法枚举
```

**package.json 配置**:
```json
{
  "name": "@uni-admin/shared-types",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

**设计要点**:
- 使用 `tsup` 构建（零配置 TypeScript 打包工具）
- 导出 ESM + CJS 双格式，兼容不同消费方式
- 所有类型集中管理，避免前后端重复定义

---

##### 4️⃣ @uni/admin/shared-utils (packages/shared-utils)

**职责**: 前后端通用的工具函数库

**目录结构**:

```
packages/shared-utils/src/
├── index.ts                         # 统一导出
│
├── date.ts                          # 日期处理工具
│   ├── formatDate()                 # 格式化日期
│   ├── getRelativeTime()            # 相对时间（如"3分钟前"）
│   ├── getDateRange()               # 获取日期范围
│   └── isExpired()                  # 判断是否过期
│
├── string.ts                        # 字符串处理工具
│   ├── camelize()                    # 转 camelCase
│   ├── snakeize()                   # 转 snake_case
│   ├── truncate()                   # 截断字符串
│   └── generateRandomString()       # 生成随机字符串
│
├── format.ts                        # 数据格式化
│   ├── formatFileSize()             # 文件大小格式化
│   ├── formatNumber()               # 数字格式化（千分位）
│   └── maskSensitiveData()          # 脱敏处理（手机号、身份证）
│
├── validate.ts                      # 验证函数
│   ├── isEmail()                    # 邮箱验证
│   ├── isPhone()                    # 手机号验证
│   ├── isIdCard()                   # 身份证验证
│   └── isUrl()                      # URL 验证
│
└── crypto.ts                        # 加密相关（需注意环境兼容性）
    ├── md5()                        # MD5 哈希
    ├── sha256()                     # SHA256 哈希
    └── base64Encode/Decode()        # Base64 编解码
```

**关键设计决策**:
- **环境感知**: 部分 API 在 Node.js 和 Browser 环境有差异（如 crypto），需要做 polyfill 或条件导出
- **纯函数设计**: 所有工具函数应为纯函数，无副作用，便于测试
- **Tree-shaking 友好**: 使用 ESM export，支持按需导入

---

##### 5️⃣ @uni/admin/ui-components (packages/ui-components)

**职责**: 基于 Element Plus 封装的通用业务组件库

**目录结构**:

```
packages/ui-components/src/
├── index.ts                         # 统一导出所有组件
│
├── components/                      # 业务组件
│   ├── DataTable/                   # 通用数据表格
│   │   ├── DataTable.vue            # 主组件
│   │   ├── types.ts                 # 组件 Props 类型
│   │   └── index.ts                 # 组件导出
│   │
│   ├── SearchForm/                  # 搜索表单
│   │   ├── SearchForm.vue
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── ModalForm/                   # 弹窗表单
│   │   ├── ModalForm.vue
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── Upload/                      # 文件上传
│   │   ├── Upload.vue
│   │   └── index.ts
│   │
│   └── RichTextEditor/              # 富文本编辑器
│       ├── RichTextEditor.vue
│       └── index.ts
│
├── hooks/                           # 组合式函数（配套组件使用）
│   ├── useDataTable.ts              # 表格数据加载逻辑
│   ├── useForm.ts                   # 表单校验与提交
│   └── useModal.ts                  # 弹窗控制
│
└── theme/                           # 主题配置
    ├── variables.scss               # 覆盖 Element Plus 变量
    └── index.ts                     # 主题配置导出
```

**设计原则**:
- **业务导向**: 不是通用 UI 库（如 shadcn/ui），而是针对管理后台场景封装
- **Element Plus 增强**: 在 el-table、el-form 等基础上增加业务逻辑（分页、搜索、权限控制）
- **Configurable**: 通过 Props 暴露配置项，保持灵活性
- **TypeScript First**: 完整的类型定义，提升开发体验

---

### 决策 3: 依赖关系设计

#### 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    依赖关系图（DAG）                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   apps/server                                               │
│      │                                                      │
│      ├── @uni-admin/shared-types  ◀───┐                    │
│      └── @uni-admin/shared-utils      │                    │
│                                       │                    │
│   apps/web                             │                    │
│      │                                │                    │
│      ├── @uni-admin/shared-types  ◀───┤                    │
│      ├── @uni-admin/shared-utils      │                    │
│      └── @uni-admin/ui-components     │                    │
│                                  │    │                    │
│                                  ▼    ▼                    │
│                        ┌──────────────────┐                │
│                        │   packages/      │                │
│                        ├──────────────────┤                │
│                        │ shared-types    │ ← 无外部依赖     │
│                        │ shared-utils    │ ← 无外部依赖     │
│                        │ ui-components   │ ← 依赖 types     │
│                        └──────────────────┘                │
│                                                             │
│   规则:                                                      │
│   ✓ 允许: apps → packages                                   │
│   ✗ 禁止: packages → apps (循环依赖)                        │
│   ✗ 禁止: packages ↔ packages (循环依赖)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### workspace 协议使用

在 `package.json` 中使用 `workspace:*` 协议：

```jsonc
// apps/web/package.json
{
  "dependencies": {
    // 开发时自动链接到本地 packages
    "@uni-admin/shared-types": "workspace:*",
    "@uni-admin/shared-utils": "workspace:*",
    "@uni-admin/ui-components": "workspace:*"
  }
}

// 发布时自动替换为真实版本号
// "shared-types": "workspace:*" → "shared-types": "0.0.1"
```

**为什么选择 workspace:***?
- 开发时符号链接，修改即时生效，无需手动 link
- 发布时自动解析为实际版本，无需手动改版本号
- pnpm 原生支持，零配置

---

### 决策 4: 命名规范体系详细设计

#### 4.1 Package Name 命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 应用 | `@uni-admin/<app-name>` | `@uni-admin/server`, `@uni-admin/web` |
| 共享类型 | `@uni-admin/shared-types` | 固定名称 |
| 共享工具 | `@uni-admin/shared-utils` | 固定名称 |
| UI 组件 | `@uni-admin/ui-<component>` | `@uni-admin/ui-components` |
| 工具配置 | `@uni-admin/<tool>-config` | `@uni-admin/eslint-config` |

**规则**:
- 必须带 scope: `@uni-admin/`
- 使用 kebab-case（小写字母 + 连字符）
- 名称要有意义，能表达包的职责
- 避免过于简短或模糊的名称

#### 4.2 Directory 命名

```
✅ 推荐用法:
src/
├── modules/                 # 小写复数名词
├── components/              # 小写复数名词
├── shared-types/            # kebab-case（多个单词）
├── ui-components/           # 有意义前缀 + 名词复数
├── auth/                    # 单个单词小写
└── user-management/         # kebab-case（多个单词）

❌ 避免用法:
├── Src/                     # ❌ 大写开头
├── Component/               # ❌ 单数
├── sharedTypes/             # ❌ camelCase
├── UIComponents/            # ❌ PascalCase
└── _private/                # ❌ 下划线前缀（除非特殊需求）
```

#### 4.3 File 命名

```typescript
// ✅ Vue 组件: PascalCase
DataTable.vue
SearchForm.vue
UserModal.vue

// ✅ TypeScript 文件:
//    - 组件/类/接口定义: PascalCase
//    - 工具/函数/配置: kebab-case
//    - 类型定义: kebab-case.types.ts
//    - 常量/枚举: kebab-case 或 camelCase
UserService.ts
date-utils.ts
api.types.ts
user.enums.ts
vite.config.ts

// ✅ 测试文件: 与被测文件同名 + .spec/.test 后缀
UserService.spec.ts
date-utils.test.ts
DataTable.cy.ts           # Playwright E2E
```

#### 4.4 Code Identifiers 命名

```typescript
// ✅ 类和接口: PascalCase
class UserService {}
interface IUserRepository {}
type ApiResponse<T> = { ... }

// ✅ 函数和变量: camelCase
function getUserById(id: string): Promise<IUser> {}
const isLoading = ref(false);
let currentPage = 1;

// ✅ 常量: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = '/api/v1';
const DEFAULT_PAGE_SIZE = 20;

// ✅ 枚举值: UPPER_SNAKE_CASE
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

// ✅ CSS 类名: kebab-case (BEM 方法论)
.user-card { ... }
.user-card__title { ... }
.user-card--active { ... }

// ✅ CSS/SCSS 变量: kebab-case 前缀
$color-primary: #409eff;
$spacing-md: 16px;
```

---

### 决策 5: 关键配置文件设计

#### 5.1 pnpm-workspace.yaml

```yaml
# 定义 workspace 包的范围
packages:
  - 'apps/*'      # 所有应用
  - 'packages/*'  # 所有共享库
  # 不包含 tooling/（可选，如果 tooling 不需要作为包发布）
```

**设计说明**:
- 使用 glob 模式匹配目录
- `apps/*` 匹配 `apps/server`, `apps/web`
- `packages/*` 匹配 `packages/shared-types`, 等
- 如果 `tooling/` 下有独立包（如 eslint-config），可以添加 `'tooling/*'`

#### 5.2 Root package.json

```jsonc
{
  "name": "uni-admin",
  "version": "0.0.1",
  "private": true,
  "type": "module",

  // 集中管理的 scripts（方便一键执行）
  "scripts": {
    // 开发
    "dev": "pnpm -r --parallel run dev",
    "dev:server": "pnpm --filter @uni-admin/server dev",
    "dev:web": "pnpm --filter @uni-admin/web dev",

    // 构建
    "build": "pnpm -r run build",
    "build:server": "pnpm --filter @uni-admin/server build",
    "build:web": "pnpm --filter @uni-admin/web build",

    // 测试
    "test": "pnpm -r run test",
    "test:e2e": "pnpm --filter @uni-admin/web test:e2e",

    // 代码质量
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,vue,json,md}\"",
    "typecheck": "pnpm -r run typecheck",

    // 清理
    "clean": "pnpm -r exec rm -rf dist node_modules",
    "clean:install": "rm -rf node_modules && pnpm install"
  },

  // devDependencies 集中管理（提升安装速度和一致性）
  "devDependencies": {
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-vue": "^9.19.0"
  },

  // pnpm 特定配置
  "pnpm": {
    // 只允许使用声明的依赖（防止幽灵依赖）
    "onlyBuiltDependencies": [
      "esbuild",
      "protobufjs"
    ],
    // 覆盖依赖版本（统一管理）
    "overrides": {
      "typescript": "$typescript"
    }
  }
}
```

**设计要点**:
- **Scripts 集中**: 常用命令在根目录一键执行，也支持按包执行
- **DevDeps 提升**: 将共用工具（TS、ESLint、Prettier）提升到根目录，避免重复安装
- **onlyBuiltDependencies**: 只对原生模块进行 rebuild，加速 install
- **overrides**: 强制所有包使用相同版本的 TypeScript

#### 5.3 TypeScript Project References

**tsconfig.base.json** (根配置):

```jsonc
{
  "compilerOptions": {
    // 基础编译选项
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // 路径别名（各包可覆盖）
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // 共享类型（增强 IDE 支持）
    "types": ["node"]
  },

  // 排除 node_modules 和 dist
  "exclude": ["node_modules", "dist"]
}
```

**apps/server/tsconfig.app.json**:

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,                    // 启用 Project References
    "declaration": true,                   // 生成 .d.ts 文件
    "declarationMap": true,                // 生成 declaration source map

    // NestJS 特定配置
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,

    // 路径别名
    "paths": {
      "@/*": ["./src/*"],
      "@modules/*": ["./src/modules/*"],
      "@common/*": ["./src/common/*"]
    },

    // 引用其他 projects（增量编译）
    "references": [
      { "path": "../../packages/shared-types" },
      { "path": "../../packages/shared-utils" }
    ]
  },

  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**apps/web/tsconfig.app.json**:

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,

    // Vue 特定配置
    "jsx": "preserve",

    // Vite 别名对应
    "paths": {
      "@/*": ["./src/*"],
      "@views/*": ["./src/views/*"],
      "@components/*": ["./src/components/*"],
      "@stores/*": ["./src/stores/*"],
      "@api/*": ["./src/api/*"]
    },

    // 引用共享包
    "references": [
      { "path": "../../packages/shared-types" },
      { "path": "../../packages/shared-utils" },
      { "path": "../../packages/ui-components" }
    ]
  },

  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

**Project References 的好处**:
1. **增量编译**: 只重新编译变更的包及其依赖者
2. **类型检查加速**: 可以并行类型检查多个包
3. **构建顺序优化**: 自动推断正确的构建拓扑顺序
4. **IDE 支持**: VSCode 能更好地理解跨包引用

---

### 决策 6: Docker 本地开发环境

#### docker-compose.yml 设计

```yaml
version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: uni-admin-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: uni_admin
      MYSQL_USER: admin
      MYSQL_PASSWORD: admin_password
      TZ: Asia/Shanghai
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: uni-admin-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
  redis_data:
```

**Dockerfile.server** (后端):

```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && pnpm install -g pnpm@8

# 先复制 pnpm-lock.yaml 以利用 Docker 缓存
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/*/package.json ./packages/*/

# 安装依赖（只安装 production dependencies 用于构建）
RUN pnpm install --frozen-lockfile --prod

# 复制源码
COPY . .

# 构建 server
RUN pnpm --filter @uni-admin/server build

# 生产镜像
FROM node:20-alpine AS runner

WORKDIR /app

# 安装生产依赖
RUN corepack enable && pnpm install -g pnpm@8
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma

# 安装 Prisma CLI（用于运行时 migration）
RUN pnpm add @prisma/client && npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**Dockerfile.web** (前端):

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && pnpm install -g pnpm@8

# 复制并安装依赖
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm --filter @uni-admin/web build

# Nginx 托管静态文件
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**设计决策**:
- **多阶段构建**: 减小最终镜像体积（只包含产物）
- **分层缓存**: 先复制 package.json 再复制源码，优化 Docker 层缓存
- **分离部署**: server 和 web 各自独立的 Dockerfile，支持独立扩缩容
- **健康检查**: MySQL 和 Redis 都配置了 healthcheck，确保服务就绪

---

## Risks / Trade-offs

### ⚠️ 已识别的风险及缓解措施

#### 风险 1: Shared Packages 导致的耦合度增加

**描述**: 如果 shared-types 或 shared-utils 设计不当，可能导致前后端过度耦合，任何修改都需要同时更新两端。

**风险等级**: 🟡 中等

**缓解措施**:
- ✅ shared-types 只包含**纯类型定义**，不含业务逻辑
- ✅ shared-utils 只包含**纯函数工具**，无副作用
- ✅ 定期审查 shared 包的依赖关系，及时拆分过大的包
- ✅ 版本化管理：shared 包的 breaking change 需要同步升级 server 和 web

**回滚方案**: 如果某个 shared 包耦合度过高，将其内联到对应的 app 中

---

#### 风险 2: 初始设置复杂度高

**描述**: 相比传统的单仓库 monorepo（所有包平铺），apps/packages 分层结构需要更多的配置文件和理解成本。

**风险等级**: 🟢 低

**缓解措施**:
- ✅ 提供详尽的文档（本 design.md）和新手引导
- ✅ 使用脚手架脚本一键生成新包/模块
- ✅ IDE 配置优化（VSCode workspace、路径别名）
- ✅ 团队 onboarding 培训

**长期收益**: 初始投入 1-2 天设置，后续节省大量沟通和维护成本

---

#### 风险 3: pnpm Workspace 的学习曲线

**描述**: 团队成员可能不熟悉 pnpm 的 workspace 协议、filter 语法等特性。

**风险等级**: 🟢 低

**缓解措施**:
- ✅ Root package.json 预定义常用 scripts，减少直接使用 pnpm 命令
- ✅ 提供 README 快速参考卡片（常用命令速查）
- ✅ Code Review 时指导正确用法
- ✅ 渐进式采用：先从简单命令开始，逐步深入

---

#### 风险 4: TypeScript Project References 配置复杂

**描述**: 多个 tsconfig 文件的继承链和 references 配置容易出错。

**风险等级**: 🟡 中等

**缓解措施**:
- ✅ 使用严格的 extends 链（base → app-specific）
- ✅ IDE 自动补全和错误提示帮助排查问题
- ✅ 编写自动化脚本验证 tsconfig 正确性
- ✅ 提供模板文件，新建包时直接复制

---

### ⚖️ 权衡取舍（Trade-offs）

#### 权衡 1: 结构清晰 vs 设置复杂度

| 维度 | Flat Structure | Apps/Packages 分层 |
|------|---------------|-------------------|
| **初始设置** | 🟢 简单（5 分钟） | 🔴 较复杂（30 分钟） |
| **长期维护** | 🔴 混乱（6 个月后） | 🟢 清晰（持续） |
| **新人理解** | 🟡 一般 | 🟢 直观 |
| **依赖管理** | 🔴 易出循环依赖 | 🟢 天然防循环 |
| **扩展性** | 🔴 有限 | 🟢 优秀 |

**决策**: 选择 **Apps/Packages 分层**，因为 uni-admin 是长期项目，初始 25 分钟的额外投入换来数年的维护便利是值得的。

---

#### 权衡 2: 共享包数量 vs 内聚性

| 方案 | 包数量 | 优点 | 缺点 |
|------|--------|------|------|
| **单一 shared 包** | 1 个 | 简单 | 臃肿、职责不清 |
| **按类型拆分（当前选择）** | 3-5 个 | 职责清晰 | 需要管理包间依赖 |
| **细粒度拆分** | 10+ 个 | 高内聚 | 过度工程化 |

**决策**: 选择 **按类型拆分（3-5 个包）**，在清晰度和简洁性之间取得平衡。预留扩展空间：当某个包过大时（如 >5000 行），再进一步拆分。

---

#### 权衡 3: 严格命名规范 vs 开发灵活性

| 策略 | 优点 | 缺点 |
|------|------|------|
| **宽松规范** | 快速启动 | 风格不一致 |
| **严格规范（当前选择）** | 一致性高、可读性好 | 初期需要适应 |
| **自动化强制** | 100% 合规 | 可能阻碍紧急修复 |

**决策**: 选择 **严格规范 + 工具辅助**（ESLint rules、Prettier、commitlint），通过自动化工具减少人为疏忽，但在紧急情况下允许手动 override。

---

## Migration Plan（实施计划）

由于项目处于初始阶段，这不是传统意义上的"迁移"，而是**从零搭建**。以下是建议的实施步骤：

### Phase 1: 基础设施搭建（预计 2-3 小时）

```
Step 1: 初始化 pnpm workspace
  ├── 创建 pnpm-workspace.yaml
  ├── 创建 root package.json
  └── 运行 pnpm install

Step 2: 创建目录骨架
  ├── mkdir -p apps/{server,web}
  ├── mkdir -p packages/{shared-types,shared-utils,ui-components}
  └── mkdir -p tooling/{eslint-config,scripts}

Step 3: 配置 TypeScript
  ├── 创建 tsconfig.base.json
  ├── 为每个包创建 tsconfig.json（extends base）
  └── 配置 Project References

Step 4: 配置代码质量工具
  ├── 创建 .eslintrc.js（根配置）
  ├── 创建 .prettierrc
  └── 为各包创建继承配置
```

### Phase 2: Packages 开发（预计 4-6 小时）

```
Step 5: 实现 shared-types
  ├── 定义基础类型（ApiResponse, PaginatedResponse）
  ├── 定义实体类型（IUser, IRole 等）
  ├── 定义枚举（UserRole, UserStatus）
  └── 配置构建脚本（tsup）

Step 6: 实现 shared-utils
  ├── 实现日期工具（date.ts）
  ├── 实现字符串工具（string.ts）
  ├── 实现验证函数（validate.ts）
  └── 编写单元测试

Step 7: 实现 ui-components（可选，后续迭代）
  ├── 封装 DataTable 组件
  ├── 封装 SearchForm 组件
  └── 编写 Storybook 文档
```

### Phase 3: Applications 初始化（预计 3-4 小时）

```
Step 8: 初始化 NestJS Server
  ├── 安装 NestJS 依赖
  ├── 创建基础模块结构（common/, config/, modules/）
  ├── 配置 Prisma（schema, client）
  └── 集成 shared-types 和 shared-utils

Step 9: 初始化 Vue3 Web
  ├── 使用 create-vite 创建项目（Vue + TypeScript）
  ├── 安装 Element Plus、Pinia、Vue Router
  ├── 创建目录结构（views/, stores/, api/ 等）
  ├── 配置 Vite（别名、代理）
  └── 集成所有 shared packages
```

### Phase 4: Docker 与文档（预计 1-2 小时）

```
Step 10: 配置 Docker 环境
  ├── 创建 docker-compose.yml（MySQL + Redis）
  ├── 编写 Dockerfile.server
  ├── 编写 Dockerfile.web
  └── 创建 .env.example

Step 11: 编写文档
  ├── 更新 README.md（快速开始指南）
  ├── 添加 CONTRIBUTING.md（开发规范）
  └── 创建 ARCHITECTURE.md（架构说明）
```

### 回滚策略

如果在实施过程中发现严重问题：

1. **Phase 1-2 回滚**: 直接删除新建的目录和配置，恢复到初始状态（< 5 分钟）
2. **Phase 3 回滚**: 保留 packages，删除 apps 目录，重新初始化应用（< 15 分钟）
3. **整体回滚**: 使用 git reset 回退到实施前的 commit（< 1 分钟）

---

## Open Questions

### 待解决的问题

#### ❓ Q1: 是否需要引入 Turborepo 或 Nx？

**背景**: Turborepo 和 Nx 可以提供更强大的构建缓存、任务编排、代码生成等功能。

**当前倾向**: **暂不引入**

**理由**:
- 项目初期包数量少（3 apps + 3 packages），pnpm 原生能力足够
- Turborepo/Nx 增加学习成本和配置复杂度
- 可以在包数量增长到 10+ 个时再评估引入

**决策时机**: 当团队成员反馈构建/测试速度明显变慢时

---

#### ❓ Q2: shared-packages 是否需要发布到 npm？

**背景**: 如果希望 uni-admin 的 shared 包可以被其他项目复用，可以发布到 npm（私有或公开）。

**当前倾向**: **暂时不发布，保留发布能力**

**理由**:
- 初期专注于 uni-admin 自身的使用
- package.json 已经按照可发布的标准配置（exports、main、types）
- 未来如果有复用需求，只需添加 npm publish 脚本即可

**决策时机**: 当有第二个项目需要复用这些包时

---

#### ❓ Q3: 是否需要 Changesets 进行版本管理？

**背景**: Changesets 是一个用于管理 monorepo 版本和 changelog 的工具。

**当前倾向**: **初期不需要，后期可引入**

**理由**:
- 项目处于 0.0.1 阶段，频繁变动，固定版本意义不大
- 可以先使用手动版本管理（修改 package.json version 字段）
- 当准备发布稳定版本（1.0.0）时，再引入 Changesets

**决策时机**: 准备首次正式发布时

---

#### ❓ Q4: 是否需要配置 monorepo 的 CI/CD 流水线？

**背景**: 前后端分离部署需要独立的 CI/CD 流程。

**当前倾向**: **不在本次设计中包含，后续单独规划**

**理由**:
- CI/CD 属于 DevOps 范畴，涉及团队的具体工具链偏好（GitHub Actions、GitLab CI、Jenkins 等）
- 本次设计聚焦于代码层面的架构
- 可以基于本设计的 Dockerfile 快速搭建 CI/CD

**决策时机**: 当需要自动化部署时

---

## 总结

本设计文档定义了 uni-admin 项目的完整 Monorepo 架构，包括：

✅ **清晰的分层结构**: apps/（可部署应用）+ packages/（共享库）  
✅ **5 个核心包**: server, web, shared-types, shared-utils, ui-components  
✅ **完整的命名规范**: 四层级体系（Package → Directory → File → Code）  
✅ **工程化配置**: pnpm workspace, TS Project References, ESLint/Prettier  
✅ **Docker 支持**: 本地开发环境和独立部署镜像  
✅ **风险管理**: 4 个已识别风险 + 缓解措施  
✅ **渐进式实施**: 4 个 Phase，总计约 10-15 小时工作量  

该架构平衡了**专业性**和**实用性**，既符合业界最佳实践，又不会过度工程化。为 uni-admin 成为"可快速二次开发"的管理后台基座奠定了坚实的基础。
