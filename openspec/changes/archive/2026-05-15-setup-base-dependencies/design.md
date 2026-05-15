## Context

### 当前状态
uni-admin 项目是一个基于 pnpm monorepo 的管理后台系统，采用 Vue3 + NestJS 技术栈。项目已完成基础脚手架搭建，包括：
- **Web 端**: Vue3 + Vite + Element Plus + Pinia + Vue Router（已安装 axios）
- **Server 端**: NestJS + Prisma + MySQL（已安装 @nestjs/config, @nestjs/swagger, class-validator, class-transformer）
- **共享包**: shared-types, shared-utils, ui-components

**关键缺失**: 项目缺少核心的基础依赖库和基础设施模块，导致无法开展业务功能开发。

### 技术约束
- 必须使用 TypeScript 严格模式
- 遵循 monorepo workspace 协议（workspace:*）
- 前后端需保持技术栈一致性（如日期库统一使用 dayjs）
- 需支持 Docker 容器化部署
- 日志输出必须为结构化 JSON 格式（便于 ELK 采集）

## Goals / Non-Goals

**Goals:**
- ✅ 安装并配置所有必需的生产级依赖库（共 25+ 个包）
- ✅ 搭建 JWT 双 Token 认证鉴权系统（Access Token 15min + Refresh Token 7天）
- ✅ 集成 Knife4j 增强 Swagger 文档体验（离线文档、接口调试）
- ✅ 建立 Winston 企业级日志系统（结构化日志、文件轮转）
- ✅ 封装 Crypto-js 数据安全工具（敏感数据加密、接口签名）
- ✅ 统一验证层（class-validator + zod 双轨制）

**Non-Goals:**
- ❌ 不实现具体的用户 CRUD 业务逻辑（仅搭建认证框架）
- ❌ 不实现 RBAC 权限管理系统（后续迭代）
- ❌ 不集成第三方 OAuth 登录（如 GitHub、Google）
- ❌ 不实现消息队列、缓存等中间件（按需添加）
- ❌ 不编写单元测试和 E2E 测试（独立任务）

## Decisions

### 决策 1: JWT 双 Token 机制 vs 单 Token

**选择**: Access Token (短期) + Refresh Token (长期) 双 token 机制

**理由**:
1. **安全性**: Access Token 泄露后影响窗口小（15分钟），降低损失
2. **用户体验**: Refresh Token 可延长会话时间（7天），避免频繁登录
3. **行业标准**: OAuth 2.0 和现代 SPA 应用普遍采用此方案

**替代方案对比**:
| 方案 | 安全性 | 复杂度 | 适用场景 |
|------|--------|--------|----------|
| 单 Token（长期） | ⚠️ 低 | ✅ 简单 | 内部工具、低安全要求 |
| 单 Token（短期） | ✅ 高 | ⚠️ 中等 | 需频繁重新登录 |
| **双 Token（推荐）** | ✅✅ 最高 | ⚠️ 较复杂 | **生产环境、管理后台** |

**Token 存储策略**:
- Access Token: 内存（Vuex/Pinia store）+ HTTP-only Cookie（防 XSS）
- Refresh Token: 仅 HTTP-only Cookie（防 JS 读取）+ Redis/数据库存储

---

### 决策 2: Passport.js vs 自定义 Guard

**选择**: @nestjs/passport + passport-jwt（Passport 策略模式）

**理由**:
1. **生态成熟**: NestJS 官方推荐，社区资源丰富
2. **可扩展性**: 支持多策略（JWT、Local、OAuth 等）
3. **标准化**: 遵循认证中间件标准模式

**架构设计**:
```
认证流程:
┌───────────┐    ┌──────────────┐    ┌─────────────────┐
│  前端请求  │───▶│ JwtAuthGuard │───▶│ JwtStrategy     │
└───────────┘    └──────────────┘    └────────┬────────┘
                      │                        │
                      ▼                        ▼
              验证 Bearer Token         从 Request 提取 Token
                      │                        │
                      ▼                        ▼
              jwtService.verify()       passport-jwt 解析
                      │                        │
                      └──────────┬─────────────┘
                                 ▼
                         注入 currentUser
```

**自定义装饰器**: `@CurrentUser()` 用于在 Controller 中获取当前用户信息

---

### 决策 3: Winston vs Pino 日志框架

**选择**: Winston + nest-winston

**理由**:
1. **功能丰富**: 支持多种传输（Console、File、HTTP、Stream）
2. **配置灵活**: 可按环境动态调整日志级别
3. **社区成熟**: 文档完善，NestJS 集成稳定

**日志配置策略**:
```typescript
// 开发环境: 彩色控制台输出 + debug 级别
// 生产环境: JSON 格式文件输出 + info 级别 + 文件轮转
// 格式: { timestamp, level, message, context, traceId, userId }
```

**替代方案 Pino 的优势**: 性能更高（适合高并发 QPS > 10k），但功能相对简单。对于管理后台场景，Winston 的灵活性更重要。

---

### 决策 4: Zod 与 Class-Validator 共存策略

**选择**: 分层使用，各司其职

**定位**:
- **Class-Validator**: Controller 层 DTO 验证（请求参数校验）
  - 使用装饰器风格 `@IsString()`, `@Min(0)`
  - 配合 ValidationPipe 自动执行
  - 返回 400 Bad Request + 详细错误信息

- **Zod**: Service 层业务逻辑验证 + 前端表单验证
  - 使用函数式风格 `z.string().min(1)`
  - 类型推断自动生成 TypeScript 类型
  - 可在 shared-types 包中共享 schema

**示例**:
```typescript
// Controller 层 (class-validator)
@Post('login')
async login(@Body() dto: LoginDto) {
  // ValidationPipe 自动验证 dto
  return this.authService.login(dto);
}

// Service 层 (zod)
const userSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/),
});
const validatedData = userSchema.parse(rawData);
```

---

### 决策 5: Knife4j 集成方式

**选择**: nest-knife4j 作为 Swagger UI 替代品

**理由**:
1. **国产增强**: 支持离线 Markdown 文档下载、接口调试、全局参数设置
2. **UI 美观**: 相比默认 Swagger UI 更符合国内开发者习惯
3. **功能丰富**: 支持分组显示、搜索过滤、收藏接口

**集成点修改**:
```typescript
// main.ts 第 36 行改动:
// 原: SwaggerModule.setup('api/docs', app, document);
// 改: 使用 Knife4jModule 或自定义静态资源服务
```

**访问路径**: 保持 `/api/docs` 不变（或改为 `/api/doc.html`，Knife4j 默认路径）

---

### 决策 6: Crypto-js 使用范围

**选择**: 封装为独立的工具类，提供统一 API

**应用场景**:

| 场景 | 算法 | 用途 |
|------|------|------|
| 敏感数据加密 | AES-256-CBC | 手机号、身份证、银行卡号 |
| 接口签名 | HMAC-SHA256 | 防篡改、防重放攻击 |
| 配置加密 | AES-256-ECB | 数据库密码、API Key |
| Token 混淆 | Base64 + XOR | Refresh Token 二次加密 |

**工具类设计**:
```typescript
// apps/server/src/shared/utils/crypto.util.ts
export class CryptoUtil {
  static encrypt(data: string, key?: string): string;  // AES 加密
  static decrypt(encrypted: string, key?: string): string;  // AES 解密
  static sign(data: object, secret: string): string;  // HMAC 签名
  static verify(data: object, signature: string, secret: string): boolean;  // 验证签名
}
```

---

### 决策 7: Knex.js vs 纯 Prisma ORM

**选择**: Knex.js 作为 Prisma 的补充查询构建器

**理由**:
1. **复杂查询能力**: Prisma 在处理多表联查、聚合统计、动态条件查询时不够灵活
2. **原生 SQL 支持**: Knex 支持执行原始 SQL（如存储过程、窗口函数）
3. **事务管理**: 提供更细粒度的事务控制（嵌套事务、Savepoint）
4. **性能优化**: 可手动优化查询计划，避免 Prisma 的 N+1 问题

**分层架构**:
```
数据访问层 (DAL):
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Controller Layer                                    │
│      │                                               │
│      ▼                                               │
│  Service Layer                                       │
│      │                                               │
│      ├─▶ Repository (Prisma) ──▶ 简单 CRUD 操作     │
│      │   - findById, create, update, delete          │
│      │   - 单表查询、关联查询（1-2 层）               │
│      │                                               │
│      └─▶ QueryBuilder (Knex) ──▶ 复杂查询操作       │
│          - 多表联查（3+ 表）                          │
│          - 聚合统计（GROUP BY, HAVING）              │
│          - 动态条件拼接                               │
│          - 报表导出                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**使用场景对比**:
| 场景 | 推荐工具 | 原因 |
|------|---------|------|
| 用户 CRUD | Prisma | 类型安全、自动生成 |
| 权限联查 | Knex | 多表 JOIN + 动态权限过滤 |
| 数据报表 | Knex | 聚合函数、分组统计 |
| 批量操作 | Knex | bulk insert/update 性能更优 |

---

### 决策 8: Redis 缓存策略与选型

**选择**: @nestjs/cache-manager + cache-manager-redis-store-yet + ioredis

**理由**:
1. **ioredis 性能**: 比 node_redis 更高性能（支持 pipeline、集群、哨兵）
2. **NestJS 原生集成**: cache-manager 是 NestJS 官方推荐的缓存抽象层
3. **cache-manager-redis-store-yet**: 维护活跃的 Redis store 实现（支持 Redis 7.x）

**缓存架构设计**:
```
Redis 缓存层次:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  L1: 应用内存缓存 (@CacheTTL)                                │
│    ├── 会话数据（当前用户信息）                               │
│    ├── 请求级缓存（单次请求内复用）                           │
│    └── TTL: 5 分钟                                          │
│                                                              │
│  L2: Redis 分布式缓存                                        │
│    ├── Refresh Token 存储（7天 TTL）                         │
│    ├── 用户在线状态（Set 结构）                              │
│    ├── 接口签名 nonce 防重放（5分钟 TTL）                    │
│    ├── 热点数据（权限配置、字典数据，1小时 TTL）             │
│    └── 分布式锁（防止并发重复操作）                          │
│                                                              │
│  L3: 数据库持久化                                             │
│    └── MySQL（Prisma + Knex 双写）                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Redis 配置策略**:
```typescript
// 开发环境: 单机模式（Docker Compose 启动）
// 生产环境: 哨兵模式或集群模式（高可用）
// 连接池: 最大连接数 10，最小空闲连接数 2
// 重试策略: 指数退避（1s, 2s, 4s, 8s）
```

**替代方案对比**:
| 方案 | 性能 | 功能 | 适用场景 |
|------|------|------|----------|
| 内存缓存（Map） | ⚡⚡⚡ 最高 | ❌ 简单 | 单实例开发环境 |
| **Redis（推荐）** | ⚡⚡ 高 | ✅✅ 丰富 | **生产环境、分布式系统** |
| Memcached | ⚡⚡ 高 | ⚠️ 中等 | 纯缓存场景 |

---

### 决策 9: Bull 任务队列集成

**选择**: @nestjs/bull + bull（基于 Redis 的任务队列）

**理由**:
1. **基于 Redis**: 无需额外基础设施（复用 Redis 实例）
2. **功能丰富**: 支持延迟任务、优先级、重试机制、并发控制
3. **监控完善**: 提供 Bull Board Web UI（可视化查看任务状态）
4. **TypeScript 友好**: 完整的类型定义支持

**任务队列架构**:
```
Bull Queue 设计:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Queue 定义:                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ email-queue     │  │ report-queue    │  │ cleanup-queue │ │
│  │ (邮件发送)      │  │ (报表生成)      │  │ (定时清理)    │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                    │                   │         │
│           ▼                    ▼                   ▼         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ EmailProcessor  │  │ ReportProcessor │  │ CleanupProc.  │ │
│  │ - 注册邮件      │  │ - Excel 导出    │  │ - 过期Token   │ │
│  │ - 密码重置      │  │ - PDF 报告      │  │ - 临时文件    │ │
│  │ - 通知提醒      │  │ - 数据统计      │  │ - 日志归档    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                              │
│  特性:                                                        │
│  ✅ 重试机制: 3 次，指数退避（1s, 2s, 4s）                   │
│  ✅ 死信队列: 失败任务转入 dead queue 人工处理                │
│  ✅ 延迟任务: 支持定时执行（如 24小时后发送提醒）            │
│  ✅ 并发控制: 同一用户任务串行执行                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Bull Dashboard 监控**:
- 访问路径: `/admin/queues`（需认证访问）
- 功能: 查看队列状态、待处理任务、失败任务、手动重试

---

### 决策 10: 数据库种子数据方案

**选择**: nestjs-seeder（NestJS 生态的种子数据框架）

**理由**:
1. **NestJS 原生**: 与项目技术栈一致，支持依赖注入
2. **类型安全**: 使用 TypeScript 定义种子数据，与实体类类型一致
3. **环境隔离**: 支持按环境加载不同种子数据（dev/test/prod）
4. **幂等性**: 支持增量更新（upsert 模式），可重复运行

**种子数据设计**:
```typescript
// apps/server/src/seeders/user.seeder.ts
import { Seeder } from 'nestjs-seeder';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<void> {
    const users = [
      { username: 'admin', password: 'Admin@123', role: 'admin' },
      { username: 'testuser', password: 'Test@123', role: 'user' },
    ];
    
    for (const user of users) {
      await this.prisma.user.upsert({
        where: { username: user.username },
        update: {},
        create: {
          ...user,
          password: await bcrypt.hash(user.password, 10),
        },
      });
    }
  }

  async drop(): Promise<void> {
    await this.prisma.user.deleteMany();
  }
}
```

**种子数据清单**:
| 文件名 | 内容 | 依赖顺序 |
|--------|------|---------|
| `role.seeder.ts` | 角色定义（管理员、普通用户等） | 1（无依赖） |
| `permission.seeder.ts` | 权限定义（CRUD 权限） | 2（依赖角色） |
| `user.seeder.ts` | 初始用户（admin, testuser） | 3（依赖角色） |
| `dictionary.seeder.ts` | 数据字典（状态码、性别等） | 4（无依赖） |
| `system-config.seeder.ts` | 系统配置（站点名称、Logo 等） | 5（无依赖） |

---

## Risks / Trade-offs

### 风险 1: 依赖版本冲突
**描述**: 新增 32+ 个依赖可能存在子依赖版本冲突（如 lodash-es 与其他包依赖的 lodash 版本不一致）

**缓解措施**:
- ✅ 使用 pnpm 的 strict resolution 算法（自动去重）
- ✅ 在 `.npmrc` 中配置 `resolution-mode=highest`（可选）
- ✅ 安装后运行 `pnpm audit` 检测漏洞

---

### 风险 2: JWT Refresh Token 安全性
**描述**: Refresh Token 如果被窃取，攻击者可长期冒充用户

**缓解措施**:
- ✅ Refresh Token 存储 Redis 时绑定用户设备指纹（User-Agent + IP）
- ✅ 单点登出机制：注销时删除 Redis 中的 Refresh Token
- ✅ Token 轮换策略：每次刷新后生成新的 Refresh Token（旧 Token 立即失效）
- ✅ 异常检测：短时间内多次刷新触发风控告警

---

### 风险 3: 性能影响
**描述**: Winston 日志写入、bcrypt 密码哈希、Crypto-js 加密可能增加响应延迟

**性能数据参考**:
| 操作 | 耗时 | 影响 |
|------|------|------|
| bcrypt.hash() (10 rounds) | ~100ms | 仅注册/修改密码时 |
| AES-256 加解密 | ~1ms | 可忽略 |
| Winston 文件写日志 | ~5ms | 异步写入，不阻塞 |
| JWT verify() | ~2ms | 可忽略 |
| Redis 缓存读取 | ~0.5ms | 可忽略（本地网络） |
| Bull 入队操作 | ~1ms | 可忽略 |

**缓解措施**:
- ✅ bcrypt 使用异步方法 `hashSync()` → `hash()`
- ✅ Winston 使用异步 transport（File transport 默认异步）
- ✅ 关键路径避免同步加密操作

---

### 风险 4: Redis 单点故障
**描述**: Redis 服务不可用会导致缓存失效、任务队列停止、会话管理失败

**缓解措施**:
- ✅ 开发环境：Docker Compose 自动重启 Redis 容器
- ✅ 生产环境：Redis 哨兵模式或集群模式（高可用）
- ✅ 降级策略：Redis 不可用时回退到内存缓存或数据库查询
- ✅ 健康检查：定期检测 Redis 连接状态，触发告警

---

### 风险 5: Knex 与 Prisma 数据一致性
**描述**: 同时使用 Knex 和 Prisma 操作数据库可能导致数据不一致（如缓存未同步）

**缓解措施**:
- ✅ 明确分层职责：Prisma 负责 DDL 和 CRUD，Knex 只读复杂查询
- ✅ 统一事务管理：跨表操作使用 Knex 事务包裹
- ✅ 缓存失效策略：数据变更时主动清除相关 Redis 缓存

---

### 权衡 1: 开发效率 vs 包体积
**决策**: 选择功能丰富的包（@vueuse/core、lodash-es）而非轻量级替代

**理由**:
- 管理后台非移动端应用，初始加载时间可接受（< 3s）
- Vite 的 Tree Shaking 会自动移除未使用的代码
- 开发效率提升远大于包体积增加的影响

**数据**:
- @vueuse/core (unpacked): ~500KB → Tree Shaking 后实际 < 50KB（按需引入）
- lodash-es (unpacked): ~1MB → 实际使用 < 100KB

---

### 权衡 2: 功能完整性 vs 实施复杂度
**决策**: 一次性完成所有基础依赖安装和配置（而非分批实施）

**理由**:
- 避免多次重构 main.ts 和 app.module.ts
- 减少合并冲突风险（团队成员并行开发时）
- 建立完整的技术基座，后续业务开发无阻碍

**复杂度控制**:
- 采用模块化设计（AuthModule、WinstonModule 独立封装）
- 提供清晰的 TODO 标记和扩展点
- 编写详细的设计文档供团队参考

---

## Migration Plan

### 部署步骤（无停机迁移，新功能增量上线）

#### Phase 1: 依赖安装（30 分钟）
```bash
# 1. 安装 Web 端依赖
pnpm --filter @uni-admin/web add @vueuse/core dayjs vuedraggable@next zod @iconify/vue vee-validate

# 2. 安装 Server 端生产依赖
pnpm --filter @uni-admin/server add bcrypt nest-knife4j zod @nestjs/jwt \
  @nestjs/passport passport passport-jwt dayjs crypto-js lodash-es winston nest-winston

# 3. 安装 Server 端开发依赖
pnpm --filter @uni-admin/server add -D @types/bcrypt @types/crypto-js \
  @types/passport-jwt @types/lodash-es

# 4. 验证安装
pnpm install && pnpm run typecheck
```

#### Phase 2: 基础设施配置（2 小时）
1. 创建配置文件：
   - `apps/server/src/config/jwt.config.ts`
   - `apps/server/src/config/winston.config.ts`
   - `apps/server/src/config/knife4j.config.ts`

2. 更新入口文件：
   - `apps/server/src/main.ts`: 集成 Knife4j + Winston Logger
   - `apps/server/src/app.module.ts`: 注册 AuthModule + WinstonModule

3. 创建工具类：
   - `apps/server/src/shared/utils/crypto.util.ts`
   - `apps/server/src/shared/utils/date.util.ts`
   - `apps/server/src/shared/utils/lodash.util.ts`

#### Phase 3: 认证模块搭建（3 小时）
1. 实现 Passport 策略：
   - `jwt.strategy.ts` (Access Token 验证)
   - `refresh-token.strategy.ts` (Refresh Token 验证)

2. 创建守卫与装饰器：
   - `jwt-auth.guard.ts` (路由保护)
   - `current-user.decorator.ts` (注入当前用户)

3. 实现 Auth Service：
   - `login()` - 生成双 Token
   - `refreshTokens()` - 刷新 Token
   - `logout()` - 注销 Token

4. 创建 DTO：
   - `login.dto.ts` (class-validator)
   - `refresh-token.dto.ts`

#### Phase 4: 日志与异常处理（1 小时）
1. 全局异常过滤器：`http-exception.filter.ts`
2. 日志拦截器：`logging.interceptor.ts`
3. Winston Logger 服务封装

#### Phase 5: 验证与测试（1 小时）
1. 启动开发服务器：`pnpm dev`
2. 访问 Swagger 文档：`http://localhost:3000/api/doc.html`
3. 测试登录接口：获取双 Token
4. 测试刷新接口：验证 Token 刷新流程
5. 检查日志输出：确认结构化 JSON 格式

### 回滚策略
**回滚条件**: 如果出现严重 bug 或性能问题

**回滚步骤**:
1. Git revert 到上一个 commit（依赖安装前）
2. 重新运行 `pnpm install` 恢复原始依赖
3. 恢复 `main.ts` 和 `app.module.ts` 的备份

**回滚时间**: < 10 分钟（纯代码回滚，无数据库变更）

---

## Open Questions

### 待解决问题

1. **Refresh Token 存储方案**
   - **选项 A**: Redis（推荐，高性能，支持 TTL 自动过期）
   - **选项 B**: MySQL（无需额外基础设施，但查询性能较低）
   - **待确认**: 当前项目是否已集成 Redis？

2. **Token 黑名单机制**
   - 是否需要在登出或修改密码后将旧 Token 加入黑名单？
   - 如果是，使用 Redis Set 还是数据库表存储？

3. **接口签名的必要性**
   - 是否所有接口都需要签名验证？还是仅敏感操作（支付、权限变更）？
   - 签名算法是否需要支持 RSA 非对称加密（更高安全性）？

4. **日志采集对接**
   - 是否需要对接 ELK Stack（Elasticsearch + Logstash + Kibana）？
   - 还是先本地文件存储，后续再接入？

> **建议**: 这些问题可在实施过程中根据实际情况灵活调整，当前设计已预留扩展点。
