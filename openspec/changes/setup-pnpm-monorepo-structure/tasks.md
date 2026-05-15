# Implementation Tasks: setup-pnpm-monorepo-structure

将 Monorepo 架构设计和规格说明转化为具体的、可跟踪的实施任务。

---

## 1. 基础设施搭建 (Foundation Setup)

**目标**: 初始化 pnpm monorepo 环境，创建目录骨架，配置基础工程化工具。

**预计时间**: 2-3 小时

### 1.1 pnpm Workspace 初始化

- [x] 1.1.1 在项目根目录创建 `pnpm-workspace.yaml` 文件，配置 workspace 包范围：
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```

- [x] 1.1.2 创建/更新根目录 `package.json`，包含以下内容：
  - 设置 `"name": "uni-admin"`, `"version": "0.0.1"`, `"private": true`, `"type": "module"`
  - 定义常用 scripts（dev, build, test, lint, format, typecheck, clean）
  - 定义按包执行的快捷脚本（dev:server, dev:web, build:server, build:web）
  - 配置 pnpm 特定设置（onlyBuiltDependencies, overrides）
  - 将共用 devDependencies 提升到根目录（typescript, eslint, prettier 等）

- [x] 1.1.3 执行 `pnpm install` 验证 workspace 初始化成功
  - **验收标准**: 命令成功执行，无错误输出，生成 `pnpm-lock.yaml` 文件

### 1.2 目录结构创建

- [x] 1.2.1 创建顶层目录结构：
  ```
  mkdir -p apps/server apps/web
  mkdir -p packages/shared-types packages/shared-utils packages/ui-components
  mkdir -p tooling/eslint-config tooling/scripts
  mkdir -p openspec/specs/monorepo-structure openspec/specs/naming-conventions openspec/specs/workspace-config
  ```

- [x] 1.2.2 为每个目录添加 `.gitkeep` 文件（确保空目录被 Git 跟踪）

- [x] 1.2.3 验证目录结构符合 monorepo-structure spec 的要求
  - **验收标准**: `ls -la` 显示所有必需的顶层目录存在

### 1.3 TypeScript 基础配置

- [x] 1.3.1 创建 `tsconfig.base.json`（TypeScript 基础配置）：
  - target: ES2022, module: ESNext, moduleResolution: bundler
  - strict: true, esModuleInterop: true, skipLibCheck: true
  - forceConsistentCasingInFileNames: true, resolveJsonModule: true, isolatedModules: true
  - 配置通用路径别名 `@/*` → `./src/*`

- [x] 1.3.2 为每个包创建 `tsconfig.json`（继承 base 并启用 Project References）：
  - `apps/server/tsconfig.app.json`: extends base, composite: true, declaration: true, references shared-types & shared-utils
  - `apps/web/tsconfig.app.json`: extends base, composite: true, declaration: true, references shared-types, shared-utils, ui-components
  - `packages/shared-types/tsconfig.json`: extends base, composite: true, declaration: true
  - `packages/shared-utils/tsconfig.json`: extends base, composite: true, declaration: true, references shared-types
  - `packages/ui-components/tsconfig.json`: extends base, composite: true, declaration: true, references shared-types

- [x] 1.3.3 验证 TypeScript 配置正确性：
  - **验收标准**: 执行 `tsc -b --verbose` 不报错（即使没有源码，配置本身应有效）

### 1.4 ESLint & Prettier 配置

- [x] 1.4.1 创建根 `.eslintrc.js` 配置文件：
  - parser: @typescript-eslint/parser
  - plugins: @typescript-eslint, vue
  - extends: eslint:recommended, plugin:@typescript-eslint/recommended, plugin:vue/vue3-recommended, prettier
  - 配置 @typescript-eslint/naming-convention 规则（强制 PascalCase/camelCase/UPPER_SNAKE_CASE）
  - 配置 .eslintignore 忽略 node_modules, dist, *.config.js

- [x] 1.4.2 创建 `.prettierrc` 配置文件：
  - semi: false, singleQuote: true, tabWidth: 2
  - trailingComma: none, printWidth: 100, endOfLine: lf
  - arrowParens: always

- [x] 1.4.3 安装并验证 ESLint + Prettier 集成：
  - 安装依赖：eslint, prettier, @typescript-eslint/parser, @typescript-eslint/eslint-plugin, eslint-plugin-vue, eslint-config-prettier
  - **验收标准**: 执行 `pnpm lint` 和 `pnpm format` 命令无报错

### 1.5 Git 配置完善

- [x] 1.5.1 创建/更新 `.gitignore` 文件：
  - 忽略 node_modules/, dist/, .output/, *.tsbuildinfo
  - 忽略 .env, .env.local, *.pem, *.key
  - 忽略 .vscode/, .idea/, .DS_Store
  - 忽略 logs/, *.log, coverage/
  - 忽略 .turbo/, .nx/ (如果使用)

- [x] 1.5.2 验证 Git 忽略规则生效：
  - **验收标准**: 创建测试用的 .env 文件和 node_modules 测试目录，执行 `git status` 确认它们不被跟踪

---

## 2. 共享库开发 (Packages Development)

**目标**: 实现三个核心共享包（shared-types, shared-utils, ui-components），为应用层提供基础设施。

**预计时间**: 4-6 小时

### 2.1 @uni-admin/shared-types 包开发

- [x] 2.1.1 创建 `packages/shared-types/package.json`：
  - name: @uni-admin/shared-types, version: 0.0.1
  - main: ./dist/index.js, types: ./dist/index.d.ts
  - exports 配置（types, import, require）
  - scripts: build (tsup), dev (tsup --watch)
  - devDependencies: tsup, typescript
  - **注意**: 无 runtime dependencies（保持零依赖）

- [ ] 2.1.2 创建 `packages/shared-types/tsconfig.json`（继承 tsconfig.base.json）

- [x] 2.1.3 实现 `src/index.ts`（统一导出入口）：
  - re-export 所有类型和枚举

- [x] 2.1.4 实现 `src/api.types.ts`（API 类型定义）：
  - `ApiResponse<T>`: 统一响应包装 { code, message, data, timestamp }
  - `PaginatedResponse<T>`: 分页响应 { list, total, page, pageSize }
  - `ApiError`: 错误响应 { code, message, details }
  - `PaginationParams`: 分页参数 { page, pageSize, sortBy?, sortOrder? }

- [x] 2.1.5 实现 `src/entity.types.ts`（实体类型）：
  - `IUser`: 用户实体 { id, username, email, nickname, avatar, roleIds, status, createdAt, updatedAt }
  - `IRole`: 角色实体 { id, name, code, description, permissions, status, createdAt, updatedAt }
  - `IPermission`: 权限实体 { id, name, code, type, resource, action, status }
  - `IMenu`: 菜单实体 { id, parentId, name, path, icon, component, sort, visible, status }

- [ ] 2.1.6 实现 `src/common.types.ts`（公共类型）：
  - `ID`: 联合类型 string | number
  - `Timestamps`: { createdAt: Date, updatedAt: Date }
  - `EnumStatus`: 启用/禁用状态枚举
  - `OptionItem`: 下拉选项 { label, value }

- [ ] 2.1.7 实现 `src/enums.ts`（枚举常量）：
  - `UserRole`: ADMIN, USER, GUEST
  - `UserStatus`: ACTIVE, INACTIVE, LOCKED
  - `PermissionType`: MENU, BUTTON, API
  - `HttpMethod`: GET, POST, PUT, DELETE, PATCH

- [x] 2.1.8 创建 `packages/shared-types/tsup.config.ts`（构建配置）：
  - entry: ['src/index.ts']
  - format: ['esm', 'cjs']
  - dts: true (生成类型声明)
  - clean: true

- [x] 2.1.9 构建 shared-types 包并验证输出：
  - 执行 `pnpm --filter @uni-admin/shared-types build`
  - **验收标准**: dist/ 目录生成，包含 index.js, index.d.ts, 以及所有类型文件的 .d.ts 版本

### 2.2 @uni-admin/shared-utils 包开发

- [x] 2.2.1 创建 `packages/shared-utils/package.json`：
  - name: @uni-admin/shared-utils, version: 0.0.1
  - dependencies: @uni-admin/shared-types (workspace:*)
  - scripts: build (tsup), dev (tsup --watch), test (vitest)

- [x] 2.2.2 创建 `packages/shared-utils/tsconfig.json`

- [x] 2.2.3 实现 `src/index.ts`（统一导出）

- [x] 2.2.4 实现 `src/date.ts`（日期处理工具）：
  - `formatDate(date, format)`: 格式化日期（支持 yyyy-MM-dd HH:mm:ss 等格式）
  - `getRelativeTime(date)`: 相对时间（如"3分钟前"、"2小时前"）
  - `getDateRange(type)`: 获取日期范围（今天、本周、本月、本年）
  - `isExpired(expiryDate)`: 判断是否过期

- [ ] 2.2.5 实现 `src/string.ts`（字符串处理工具）：
  - `camelize(str)`: 转 camelCase（user_name → userName）
  - `snakeize(str)`: 转 snake_case（userName → user_name）
  - `truncate(str, length)`: 截断字符串（超长部分用...代替）
  - `generateRandomString(length)`: 生成随机字符串（用于 token 等）

- [x] 2.2.6 实现 `src/format.ts`（数据格式化）：
  - `formatFileSize(bytes)`: 文件大小格式化（1024 → 1 KB, 1048576 → 1 MB）
  - `formatNumber(num)`: 数字格式化（千分位分隔符，1234567 → 1,234,567）
  - `maskSensitiveData(value, type)`: 脱敏处理（手机号 138****1234，身份证）

- [x] 2.2.7 实现 `src/validate.ts`（验证函数）：
  - `isEmail(email)`: 邮箱格式验证
  - `isPhone(phone)`: 手机号格式验证（中国大陆）
  - `isIdCard(idCard)`: 身份证号码验证
  - `isUrl(url)`: URL 格式验证

- [x] 2.2.8 实现 `src/crypto.ts`（加密工具）：
  - `md5(str)`: MD5 哈希（使用 crypto.createHash）
  - `sha256(str)`: SHA256 哈希
  - `base64Encode(str)`: Base64 编码
  - `base64Decode(str)`: Base64 解码
  - **注意**: 需要处理 Node.js 和 Browser 环境兼容性

- [ ] 2.2.9 为关键函数编写单元测试（使用 Vitest）：
  - 至少覆盖 date.ts, string.ts, validate.ts 的主要函数
  - 测试正常边界情况和异常输入
  - **验收标准**: 测试通过率 100%

- [x] 2.2.10 构建 shared-utils 包并验证：
  - **验收标准**: 构建成功，测试通过，dist/ 目录正确生成

### 2.3 @uni-admin/ui-components 包开发（可选，可后续迭代）

- [x] 2.3.1 创建 `packages/ui-components/package.json`：
  - name: @uni-admin/ui-components
  - dependencies: element-plus (外部依赖), @uni-admin/shared-types (workspace:*)
  - peerDependencies: vue

- [x] 2.3.2 创建 `packages/ui-components/tsconfig.json`

- [x] 2.3.3 实现 `src/index.ts`（统一导出所有组件和 hooks）

- [x] 2.3.4 封装 `DataTable` 组件（基于 el-table）：
  - Props: columns (列配置), data (数据源), loading (加载状态), pagination (分页配置)
  - Features: 支持排序、多选、行操作按钮、分页集成
  - Events: selection-change, sort-change, page-change, row-action
  - 类型定义: DataTableProps, TableColumn, PaginationConfig

- [ ] 2.3.5 封装 `SearchForm` 组件（基于 el-form）：
  - Props: fields (字段配置数组), model (表单数据对象)
  - Features: 动态渲染表单项（input, select, date-picker 等），自动布局
  - Events: search, reset

- [x] 2.3.6 封装 `ModalForm` 组件（基于 el-dialog + el-form）：
  - Props: visible, title, formFields (表单字段), rules (校验规则)
  - Features: 打开/关闭动画，表单校验，提交/取消回调

- [x] 2.3.7 实现配套 hooks：
  - `useDataTable()`: 封装表格数据加载逻辑（loading, data, pagination, reload）
  - `useForm()`: 封装表单校验与提交逻辑
  - `useModal()`: 封装弹窗显示/隐藏控制

- [x] 2.3.8 配置 Element Plus 主题变量覆盖（`src/theme/variables.scss`）

- [ ] 2.3.9 构建 ui-components 包并验证：
  - **验收标准**: 构件可以正常导入和使用，类型提示完整

---

## 3. 应用初始化 (Applications Initialization)

**目标**: 初始化 NestJS 后端应用和 Vue3 前端应用，集成共享包。

**预计时间**: 3-4 小时

### 3.1 NestJS Server (@uni-admin/server) 初始化

- [x] 3.1.1 使用 `@nestjs/cli` 创建 NestJS 项目到 `apps/server/` 目录：
  ```bash
  cd apps/server
  npx @nestjs/cli new . --package-manager pnpm --strict --skip-git
  ```
  或手动创建基础文件结构

- [ ] 3.1.2 更新 `apps/server/package.json`：
  - name: @uni-admin/server
  - 添加内部依赖: "@uni-admin/shared-types": "workspace:*", "@uni-admin/shared-utils": "workspace:*"
  - 添加核心依赖: @nestjs/common, @nestjs/core, @nestjs/platform-express, prisma, @prisma/client, etc.

- [x] 3.1.3 配置 `apps/server/nest-cli.json`：
  - sourceRoot: src
  - compilerOptions: deleteOutDir: true

- [ ] 3.1.4 更新 `apps/server/tsconfig.app.json`：
  - 确保 extends ../../tsconfig.base.json
  - 添加 NestJS 特定配置: emitDecoratorMetadata: true, experimentalDecorators: true
  - 配置路径别名: @/* → ./src/*, @modules/* → ./src/modules/*, @common/* → ./src/common/*

- [x] 3.1.5 创建 NestJS 基础模块结构：

  **a) 入口文件 (`src/main.ts`)**:
  - 创建 NestJS 应用实例
  - 启用全局 ValidationPipe
  - 启用全局前缀（如 /api/v1）
  - 配置 CORS（允许前端域名）
  - 监听端口（从环境变量读取，默认 3000）

  **b) 根模块 (`src/app.module.ts`)**:
  - 导入 ConfigModule（全局配置）
  - 导入 PrismaModule（数据库）
  - 导入后续的业务模块占位

  **c) 公共基础设施 (`src/common/`)**:
  - `decorators/api-response.decorator.ts`: 自定义响应包装装饰器
  - `decorators/public.decorator.ts`: 公开路由装饰器（跳过认证）
  - `filters/http-exception.filter.ts`: 全局异常过滤器（统一错误格式）
  - `interceptors/transform.interceptor.ts`: 响应转换拦截器
  - `interceptors/logging.interceptor.ts`: 请求日志拦截器
  - `pipes/validation.pipe.ts`: 自定义验证管道

  **d) 配置模块 (`src/config/`)**:
  - `database.config.ts`: Prisma 配置（数据库 URL）
  - `redis.config.ts`: Redis 配置（主机、端口、密码）
  - `app.config.ts`: 应用配置（端口、JWT 密钥等）

  **e) 业务模块占位 (`src/modules/`)**:
  - 创建 `auth/`, `user/`, `role/`, `permission/` 目录
  - 每个目录包含空的 module.ts 文件（后续实现业务逻辑）

- [x] 3.1.6 配置 Prisma ORM：
  - 创建 `src/prisma/schema.prisma` 文件
  - 定义基础数据模型（User, Role, Permission, Menu 对应 shared-types 的接口）
  - 配置 datasource（从环境变量读取 DATABASE_URL）
  - 创建 `src/prisma/migrations/.gitkeep`

- [ ] 3.1.7 创建环境变量示例文件 `apps/server/.env.example`：
  - DATABASE_URL, REDIS_HOST, REDIS_PORT, JWT_SECRET, PORT 等

- [x] 3.1.8 验证 NestJS Server 可以启动：
  - 执行 `pnpm --filter @uni-admin/server dev`
  - **验收标准**: 应用启动成功，访问 http://localhost:3000 返回默认响应或 404（因为还没实现路由）

### 3.2 Vue3 Web (@uni-admin/web) 初始化

- [x] 3.2.1 使用 Vite 创建 Vue3 + TypeScript 项目到 `apps/web/` 目录：
  ```bash
  cd apps/web
  pnpm create vite . --template vue-ts
  ```
  或使用 `create-vue` 脚手架

- [x] 3.2.2 安装核心依赖：
  - UI 框架: element-plus, @element-plus/icons-vue
  - 状态管理: pinia
  - 路由: vue-router@4
  - HTTP 客户端: axios
  - CSS 预处理器: sass (可选)
  - 工具库: dayjs (日期处理，可选)

- [x] 3.2.3 更新 `apps/web/package.json`：
  - name: @uni-admin/web
  - 添加内部依赖:
    - "@uni-admin/shared-types": "workspace:*"
    - "@uni-admin/shared-utils": "workspace:*"
    - "@uni-admin/ui-components": "workspace:*"

- [x] 3.2.4 配置 `vite.config.ts`：
  - 配置路径别名（与 tsconfig 保持一致）:
    - @ → /src
    - @views → /src/views
    - @components → /src/components
    - @stores → /src/stores
    - @api → /src/api
  - 配置开发服务器代理（将 /api 代理到后端 http://localhost:3000）
  - 配置 Element Plus 按需导入插件（unplugin-vue-components + unplugin-auto-import）

- [x] 3.2.5 更新 `apps/web/tsconfig.app.json`：
  - 添加 Vue 特定配置: jsx: "preserve"
  - 配置路径别名（与 vite.config.ts 一致）

- [x] 3.2.6 创建 Vue3 基础目录结构和核心文件：

  **a) 入口文件 (`src/main.ts`)**:
  - 创建 Vue 应用实例
  - 注册 Element Plus（全量或按需导入）
  - 注册 Pinia
  - 注册 Vue Router
  - 挂载应用到 #app

  **b) 根组件 (`src/App.vue`)**:
  - 使用 `<router-view>` 作为内容出口

  **c) API 层 (`src/api/`)**:
  - `index.ts`: 创建 Axios 实例，配置 baseURL, timeout, interceptors
  - `request.ts`: 请求拦截器（添加 Authorization header）
  - `response.ts`: 响应拦截器（统一错误处理、token 过期跳转登录）
  - `modules/auth.api.ts`: 认证相关 API 函数（login, register, refreshToken）
  - `modules/user.api.ts`: 用户相关 API 函数

  **d) 路由配置 (`src/router/`)**:
  - `index.ts`: 创建 router 实例，配置 history mode
  - `routes/public.routes.ts`: 公开路由（/login, /register）
  - `routes/protected.routes.ts`: 受保护路由（/dashboard, /system/*）
  - `guards/auth.guard.ts`: 认证守卫（检查 token，未登录重定向到 /login）

  **e) 状态管理 (`src/stores/`)**:
  - `index.ts`: 创建 pinia 实例
  - `modules/auth.store.ts`: 认证状态（token, userInfo, login/logout actions）
  - `modules/app.store.ts`: 应用全局状态（侧边栏折叠、标签页列表等）

  **f) 布局组件 (`src/layouts/`)**:
  - `DefaultLayout.vue`: 默认管理后台布局（Sidebar + Header + Breadcrumb + Main Content）
  - `AuthLayout.vue`: 认证页面布局（居中卡片式）
  - `components/Sidebar.vue`: 侧边栏导航菜单
  - `components/Header.vue`: 顶部栏（面包屑、用户头像下拉菜单）
  - `components/Breadcrumb.vue`: 面包屑导航

  **g) 全局样式 (`src/assets/styles/`)**:
  - `variables.scss`: SCSS 变量（颜色、间距、字体等）
  - `mixins.scss`: SCSS mixins（响应式、清除浮动等）
  - `global.scss`: 全局样式重置和通用样式

  **h) 组合式函数 (`src/composables/`)**:
  - `useAuth.ts`: 认证逻辑（获取用户信息、检查权限）
  - `usePagination.ts`: 分页逻辑（封装分页参数和状态）
  - `useDialog.ts`: 弹窗逻辑（打开/关闭、确认取消回调）

- [x] 3.2.7 创建环境变量示例文件 `apps/web/.env.example`：
  - VITE_API_BASE_URL, VITE_APP_TITLE 等

- [x] 3.2.8 验证 Vue3 Web 可以启动：
  - 执行 `pnpm --filter @uni-admin/web dev`
  - **验收标准**: Vite 开发服务器启动成功，浏览器访问 http://localhost:5173 显示页面（即使是空白页或基础布局）

---

## 4. Docker 与文档 (Docker & Documentation)

**目标**: 配置 Docker 本地开发环境，编写项目文档。

**预计时间**: 1-2 小时

### 4.1 Docker 环境配置

- [x] 4.1.1 创建 `docker-compose.yml`（根目录）：

  **MySQL 服务**:
  - image: mysql:8.0
  - environment: MYSQL_ROOT_PASSWORD, MYSQL_DATABASE (uni_admin), MYSQL_USER, MYSQL_PASSWORD, TZ (Asia/Shanghai)
  - ports: 3306:3306
  - volumes: mysql_data (/var/lib/mysql), init.sql (/docker-entrypoint-initdb.d/)
  - command: character-set-server=utf8mb4, collation-server=utf8mb4_unicode_ci
  - healthcheck: mysqladmin ping (interval 10s, timeout 5s, retries 5)

  **Redis 服务**:
  - image: redis:7-alpine
  - ports: 6379:6379
  - volumes: redis_data (/data)
  - command: redis-server --appendonly yes
  - healthcheck: redis-cli ping (interval 10s, timeout 5s, retries 5)

  **volumes**:
  - mysql_data: (named volume)
  - redis_data: (named volume)

- [x] 4.1.2 创建 MySQL 初始化脚本 `docker/mysql/init.sql`（可选）：
  - CREATE DATABASE IF NOT EXISTS uni_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  - 创建基本表结构（如果需要）

- [x] 4.1.3 创建 `Dockerfile.server`（NestJS 后端多阶段构建）：
  - **builder 阶段**:
    - FROM node:20-alpine
    - WORKDIR /app
    - RUN corepack enable && pnpm install -g pnpm@8
    - 复制 pnpm-workspace.yaml, pnpm-lock.yaml, package.json, 各子包的 package.json
    - RUN pnpm install --frozen-lockfile
    - 复制全部源码
    - RUN pnpm --filter @uni-admin/server build
  - **runner 阶段**:
    - FROM node:20-alpine
    - WORKDIR /app
    - 复制 package.json, dist/, prisma/
    - RUN pnpm install --prod && npx prisma generate
    - EXPOSE 3000
    - CMD ["node", "dist/main.js"]

- [x] 4.1.4 创建 `Dockerfile.web`（Vue3 前端多阶段构建）：
  - **builder 阶段**:
    - FROM node:20-alpine
    - 安装依赖（同 server 类似）
    - RUN pnpm --filter @uni-admin/web build
  - **runner 阶段**:
    - FROM nginx:alpine
    - 复制 dist/ 到 /usr/share/nginx/html/
    - 复制自定义 nginx.conf
    - EXPOSE 80
    - CMD ["nginx", "-g", "daemon off;"]

- [x] 4.1.5 创建 Nginx 配置文件 `docker/nginx/default.conf`：
  - listen 80
  - root /usr/share/nginx/html
  - index index.html
  - location / : try_files $uri $uri/ /index.html (SPA fallback)
  - location /api : proxy_pass http://host.docker.internal:3000 (API 反向代理)

- [x] 4.1.6 创建 `.env.example`（根目录，包含所有必需的环境变量及其说明）：
  - 数据库相关: DATABASE_URL
  - Redis 相关: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
  - 应用相关: PORT, NODE_ENV, JWT_SECRET, JWT_EXPIRES_IN
  - 前端相关: VITE_API_BASE_URL, VITE_APP_TITLE

- [x] 4.1.7 创建 `.dockerignore`（优化 Docker 构建上下文）：
  - 忽略 node_modules, dist, .git, .env, *.md, etc.

- [x] 4.1.8 验证 Docker 环境可以正常启动：
  - 执行 `docker-compose up -d`
  - **验收标准**: MySQL 和 Redis 容器都是 healthy 状态，可以通过 localhost 连接

### 4.2 项目文档编写

- [x] 4.2.1 更新 `README.md`（根目录）：

  **必需章节**:
  - **项目简介**: uni-admin 是什么，技术栈，核心特性
  - **快速开始**:
    1. 环境要求 (Node.js >= 18, pnpm >= 8, Docker)
    2. 克隆项目
    3. 安装依赖: pnpm install
    4. 启动依赖服务: docker-compose up -d
    5. 启动开发服务器: pnpm dev
    6. 访问 http://localhost:5173 (前端), http://localhost:3000 (后端 API)
  - **Monorepo 结构说明**: 简要描述 apps/, packages/, tooling/ 的职责
  - **包依赖关系图**: ASCII 图展示 apps 和 packages 的依赖方向
  - **常用命令**: 列出主要的 npm scripts 及其说明
  - **目录结构**: 展示完整的目录树（简化版）
  - **技术栈详情**: 列出所有主要依赖及版本
  - **开发规范链接**: 引用 CONTRIBUTING.md, naming-conventions spec 等
  - **License**: MIT 或其他开源协议

- [x] 4.2.2 创建 `CONTRIBUTING.md`（贡献指南）：

  **必需章节**:
  - **开发环境搭建**: 详细的步骤（比 README 更详细）
  - **代码规范**:
    - 命名规范摘要（引用完整 spec）
    - Git Commit 规范（conventional commits）
    - 代码风格（ESLint + Prettier 自动强制）
  - **开发流程**:
    1. 从 main 创建 feature branch
    2. 开发并提交（遵循 commit 规范）
    3. 推送分支并创建 PR
    4. Code Review 通过后合并
  - **Pull Request 模板**: PR 描述应该包含什么
  - **测试要求**: 新功能必须包含单元测试
  - **问题反馈**: Issue 模板和 Bug 报告指南

- [ ] 4.2.3 （可选）创建 `ARCHITECTURE.md`（架构说明文档）：
  - 系统架构图（前后端分离、组件交互）
  - 技术选型理由
  - 设计决策记录（ADR: Architecture Decision Records）
  - 数据流图（请求流程、状态管理）

---

## 5. 验收与清理 (Verification & Cleanup)

**目标**: 验证整个 Monorepo 结构的正确性和完整性，进行最终清理。

**预计时间**: 30 分钟 - 1 小时

### 5.1 功能验证

- [x] 5.1.1 验证 pnpm workspace 正确性：
  - 执行 `pnpm ls -r` 查看所有包的依赖树
  - **验收标准**: 无循环依赖警告，内部包版本显示为 `workspace:*`

- [ ] 5.1.2 验证 TypeScript 类型检查：
  - 执行 `pnpm typecheck`（即 `tsc -b`）
  - **验收标准**: 无类型错误（即使只有空实现，配置本身应有效）

- [ ] 5.1.3 验证 ESLint 配置：
  - 执行 `pnpm lint`
  - **验收标准**: 对现有代码运行无报错（可能有 warning，但不应有 error）

- [ ] 5.1.4 验证 Prettier 格式化：
  - 执行 `pnpm format`
  - **验收标准**: 文件被正确格式化，无报错

- [ ] 5.1.5 验证共享包构建：
  - 依次构建 shared-types, shared-utils, (ui-components)
  - **验收标准**: 每个 package 都生成正确的 dist/ 目录

- [x] 5.1.6 验证应用启动：
  - 启动 server: `pnpm --filter @uni-admin/server dev`
  - 启动 web: `pnpm --filter @uni-admin/web dev`
  - **验收标准**: 两个应用都能正常启动（可能返回 404 或空白页，但进程不崩溃）

- [ ] 5.1.7 验证 Docker 环境：
  - 执行 `docker-compose up -d`
  - **验收标准**: MySQL 和 Redis 都是 healthy 状态

- [ ] 5.1.8 运行测试（如果有）：
  - 执行 `pnpm test`
  - **验收标准**: 已有的单元测试通过（目前主要是 shared-utils 的测试）

### 5.2 最终 Git 提交

- [x] 5.2.1 执行最终的代码质量检查：
  - pnpm lint
  - pnpm format
  - pnpm typecheck

- [ ] 5.2.2 检查 `.gitignore` 是否正确忽略敏感文件和不必要的文件

- [x] 5.2.3 创建初始 Git commit（遵循 conventional commits 规范）：
  ```
  feat: initialize pnpm monorepo structure for uni-admin

  - Set up pnpm workspace with apps/ and packages/ separation
  - Implement shared-types, shared-utils, and ui-components packages
  - Initialize NestJS server and Vue3 web applications
  - Configure TypeScript Project References, ESLint, Prettier
  - Add Docker Compose for local development (MySQL + Redis)
  - Define comprehensive naming conventions and project structure specs

  Closes: #setup-pnpm-monorepo-structure
  ```

- [ ] 5.2.4 （可选）创建 Git tag 标记里程碑：
  ```bash
  git tag v0.0.1-initial-structure
  git push origin v0.0.1-initial-structure
  ```

---

## 任务统计总览

```
┌─────────────────────────────────────────────────────────────┐
│                    任务统计总览                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: 基础设施搭建                                       │
│     • 5 个任务组, 17 个具体任务                               │
│     • 预计时间: 2-3 小时                                     │
│                                                             │
│  Phase 2: 共享库开发                                         │
│     • 3 个任务组 (shared-types, shared-utils, ui-components) │
│     • 29 个具体任务                                          │
│     • 预计时间: 4-6 小时                                     │
│                                                             │
│  Phase 3: 应用初始化                                         │
│     • 2 个任务组 (server, web)                               │
│     • 19 个具体任务                                          │
│     • 预计时间: 3-4 小时                                     │
│                                                             │
│  Phase 4: Docker 与文档                                      │
│     • 2 个任务组 (Docker, 文档)                              │
│     • 14 个具体任务                                          │
│     • 预计时间: 1-2 小时                                     │
│                                                             │
│  Phase 5: 验收与清理                                         │
│     • 2 个任务组 (功能验证, Git 提交)                        │
│     • 12 个具体任务                                          │
│     • 预计时间: 0.5-1 小时                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  总计: 5 Phases, 14 Task Groups, 91 Tasks                   │
│  总预计时间: 10.5 - 16 小时                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 优先级建议

**必须完成 (P0 - Core)**:
- Phase 1: 基础设施搭建（所有任务）
- Phase 2.1: shared-types 包开发（所有任务）
- Phase 2.2: shared-utils 包开发（核心工具函数，测试可选延后）
- Phase 3.1: NestJS Server 初始化（基础结构，不含业务模块实现）
- Phase 3.2: Vue3 Web 初始化（基础结构，路由/状态管理/布局）
- Phase 5: 验收与清理

**推荐完成 (P1 - Important)**:
- Phase 2.3: ui-components 包（可以先只做 DataTable 和 SearchForm）
- Phase 4.1: Docker 环境配置
- Phase 4.2: README.md 文档

**可选延后 (P2 - Nice to have)**:
- Phase 4.2: CONTRIBUTING.md, ARCHITECTURE.md
- Phase 2.3: 高级组件（RichTextEditor, Upload 等）
- 详细单元测试（可以先有基本框架，后续补充覆盖率）
