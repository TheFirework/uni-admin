## Why

当前 uni-admin 项目处于初始搭建阶段，Web 和 Server 端缺少关键的基础依赖库（如工具函数库、验证库、认证鉴权框架等），导致无法支撑后续业务功能开发（如用户管理、权限控制、数据加密等核心功能）。现在统一安装并配置这些基础依赖，可以为整个项目建立坚实的技术底座，确保前后端使用一致的技术栈和最佳实践。

## What Changes

### Web 端 (Vue3) 依赖安装
- **@vueuse/core**: 提供 Vue3 组合式 API 工具集（响应式状态管理、浏览器 API 封装等）
- **dayjs**: 轻量级日期处理库（替代 moment.js，体积更小）
- **vuedraggable@next**: 基于 SortableJS 的 Vue3 拖拽排序组件（支持列表拖拽、看板布局）
- **zod**: TypeScript-first 数据验证库（用于表单验证、API 响应类型安全）
- **@iconify/vue**: 统一图标库组件（支持多图标集，按需加载）
- **vee-validate**: Vue3 表单验证框架（与 zod 集成，提供声明式验证）

### Server 端 (NestJS) 依赖安装与配置

**安全与认证模块**:
- **bcrypt**: 密码哈希加密算法（用于用户密码的安全存储）
- **@nestjs/jwt + @nestjs/passport + passport + passport-jwt**: JWT 认证鉴权完整生态
  - 实现 Access Token + Refresh Token 双 token 机制
  - Access Token 有效期：15分钟（短期）
  - Refresh Token 有效期：7天（长期）
  - 支持自动刷新流程，提升安全性

**文档生成增强**:
- **nest-knife4j**: 国产 Swagger UI 增强版（提供离线文档下载、接口调试、更美观的 UI）

**数据验证与转换**:
- **zod**: 作为 class-validator 的补充（Service 层业务逻辑验证、前后端共享 schema）

**工具库**:
- **dayjs**: 统一日期处理方案（与 Web 端保持一致）
- **crypto-js**: 加密解密工具库（敏感数据加解密、接口签名验证）
- **lodash-es**: ES Module 版本的工具函数库（防抖节流、深拷贝、数据处理）

**日志与异常处理**:
- **winston + nest-winston**: 企业级日志框架
  - 结构化 JSON 日志输出
  - 多级别日志（debug/info/warn/error）
  - 支持文件轮转和控制台输出
- 全局异常过滤器（Exception Filter）：统一错误响应格式

**数据访问与查询构建器**:
- **knex**: SQL 查询构建器（提供类型安全的链式查询 API，补充 Prisma ORM 能力）
  - 支持复杂联表查询、原生 SQL 执行、事务管理
  - 与 Prisma 共存：Prisma 负责 CRUD，Knex 负责复杂查询和报表

**数据库种子数据**:
- **nestjs-seeder**: 数据库种子数据填充框架（用于开发/测试环境初始化基础数据）
  - 支持 TypeScript 定义种子数据（与实体类型一致）
  - 提供命令行接口 `npx nestjs-seed` 一键填充

**缓存系统 (Redis)**:
- **@nestjs/cache-manager + cache-manager-redis-store-yet + ioredis**: Redis 缓存集成
  - 会话存储（Refresh Token、用户在线状态）
  - 接口签名 nonce 防重放（5分钟 TTL）
  - 热点数据缓存（权限配置、字典数据等）
  - 分布式锁（防止并发重复操作）
  - ioredis: 高性能 Redis 客户端（支持集群、哨兵模式）

**异步任务队列 (Bull)**:
- **@nestjs/bull + bull**: 基于 Redis 的任务队列系统
  - 异步任务处理（邮件发送、报表生成、数据同步）
  - 延迟任务（定时提醒、过期清理）
  - 任务重试机制（指数退避策略）
  - Web UI 监控面板（查看任务状态、失败重试）

### 开发依赖（TypeScript 类型定义）
- **@types/bcrypt**: bcrypt 的 TypeScript 类型定义
- **@types/crypto-js**: crypto-js 的 TypeScript 类型定义
- **@types/passport-jwt**: passport-jwt 的 TypeScript 类型定义
- **@types/lodash-es**: lodash-es 的 TypeScript 类型定义

## Capabilities

### New Capabilities
- `jwt-auth`: JWT 认证鉴权系统（双 Token 机制、Passport 集成、守卫与装饰器）
- `api-documentation`: 接口文档系统（Swagger + Knife4j 集成、增强 UI 体验）
- `logging-system`: 日志系统（Winston 集成、结构化日志、全局异常捕获）
- `data-security`: 数据安全工具（Crypto-js 加密解密、接口签名验证）
- `shared-validation`: 共享验证层（Zod schema 定义、前后端复用）
- `data-access`: 数据访问层（Knex 查询构建器、复杂 SQL 查询支持）
- `cache-system`: Redis 缓存系统（会话存储、热点数据缓存、分布式锁）
- `task-queue`: 异步任务队列（Bull 基于 Redis、邮件发送、报表生成）
- `seed-data`: 数据库种子数据（nestjs-seeder 开发/测试环境初始化）

### Modified Capabilities
- 无现有 spec 需要修改（这是全新的基础能力建设）

## Impact

### 受影响的代码模块
- **apps/web/package.json**: 新增 6 个生产依赖
- **apps/server/package.json**: 新增 22 个生产依赖 + 4 个开发依赖（原 15+4，新增 Knex、Seeder、Redis缓存、Bull队列）
- **apps/server/src/main.ts**: 集成 Knife4j UI、Winston Logger
- **apps/server/src/app.module.ts**: 注册新模块（AuthModule, WinstonModule, CacheModule, BullModule）
- **新增目录结构**:
  - `apps/server/src/modules/auth/`: 认证模块（策略、守卫、装饰器、DTO）
  - `apps/server/src/common/filters/`: 全局异常过滤器
  - `apps/server/src/common/interceptors/`: 日志拦截器
  - `apps/server/src/config/`: 配置文件扩展（jwt.config.ts, winston.config.ts, knife4j.config.ts, knex.config.ts, redis.config.ts, bull.config.ts）
  - `apps/server/src/shared/utils/`: 工具函数封装（crypto.util.ts, date.util.ts, lodash.util.ts）
  - `apps/server/src/shared/db/`: Knex 数据库访问层（knex.instance.ts, base.repository.ts）
  - `apps/server/src/modules/tasks/`: Bull 任务队列模块（processors/, dto/）
  - `apps/server/src/seeders/`: 数据库种子数据定义（user.seeder.ts, role.seeder.ts, permission.seeder.ts）

### API 变更
- **新增接口**:
  - `POST /api/v1/auth/login` - 用户登录（返回双 Token）
  - `POST /api/v1/auth/refresh` - 刷新 Access Token
  - `POST /api/v1/auth/logout` - 用户登出（注销 Refresh Token）
- **接口变更**: 所有需要认证的接口需在 Header 中携带 `Authorization: Bearer <accessToken>`

### 依赖影响
- **package-lock.json / pnpm-lock.yaml**: 锁定所有新增依赖版本
- **node_modules/**: 安装约 32+ 个新包及其子依赖（原 25+，新增 Knex、Redis、Bull 相关）
- **构建时间**: 初次安装后可能增加 15-40 秒依赖解析时间
- **基础设施要求**:
  - Redis 服务（用于缓存、会话存储、Bull 队列、分布式锁）
  - 开发环境可通过 Docker Compose 一键启动 Redis 容器

### 安全性增强
- ✅ 密码 bcrypt 哈希存储（不可逆加密）
- ✅ JWT 双 Token 机制（降低 Token 泄露风险，Refresh Token 存储于 Redis）
- ✅ 敏感数据 AES 加解密（手机号、身份证等）
- ✅ 接口签名验证（防止重放攻击和篡改，nonce 存储于 Redis）
- ✅ 全局异常处理（避免堆栈信息泄露）
- ✅ Redis 会话管理（支持强制下线、单点登录限制）

### 性能优化
- ✅ Redis 热点数据缓存（减少数据库查询压力，如权限配置、字典数据）
- ✅ Bull 异步任务队列（解耦耗时操作，提升接口响应速度）
- ✅ Knex 复杂查询优化（联表查询、聚合统计性能优于 Prisma）

### 团队协作影响
- **前端团队**: 可使用 @vueuse/core、dayjs、vuedraggable 等提高开发效率
- **后端团队**: 基于 Passport + JWT 的标准认证模式，Knex 处理复杂查询，Redis 缓存加速
- **运维团队**: Docker Compose 管理 Redis 服务，Bull Dashboard 监控任务队列状态
- **全栈团队**: Zod schema 可在 shared-types 包中共享，保证前后端数据一致性
