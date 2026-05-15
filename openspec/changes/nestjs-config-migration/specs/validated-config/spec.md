## ADDED Requirements

### Requirement: 环境变量 Schema 定义与校验

系统 SHALL 使用 Zod v4 Schema 声明式定义所有环境变量，并在 NestJS 应用启动时自动执行校验。Schema SHALL 覆盖以下全部变量，包含类型转换、枚举约束和自定义业务规则：

| 变量名 | 类型 | 必填 | 默认值 | 校验规则 |
|--------|------|------|--------|----------|
| `NODE_ENV` | enum | 是 | - | 仅允许 `development` / `test` / `production` |
| `PORT` | number | 否 | 3000 | 范围 1-65535 |
| `DATABASE_URL` | string | 是 | - | 非空字符串（MySQL URL 格式） |
| `REDIS_HOST` | string | 否 | localhost | - |
| `REDIS_PORT` | number | 否 | 6379 | 范围 1-65535 |
| `REDIS_PASSWORD` | string | 否 | "" (空) | - |
| `REDIS_DB` | number | 否 | 0 | 范围 0-15 |
| `JWT_SECRET` | string | 是 | - | 长度 ≥ 32 字符时通过；否则 warn 但不终止 |
| `JWT_EXPIRES_IN` | string | 否 | "7d" | 如: "15m", "7d", "30d" |
| `ENCRYPTION_KEY` | string | 否 | 32字符默认值 | - |
| `HMAC_SECRET` | string | 否 | 同 ENCRYPTION_KEY | - |
| `CORS_ORIGINS` | string[] | 否 | [] | 逗号分隔字符串 → 数组转换 |
| `ENABLE_SWAGGER` | boolean | 否 | false | "true"/"1" → true |
| `ENABLE_BULL_DASHBOARD` | boolean | 否 | false | "true"/"1" → true |
| `ENABLE_KNIFE4J` | boolean | 否 | true | "false" → false |

#### Scenario: 启动时所有必填变量存在且格式正确
- **WHEN** 应用启动且 `.env` 文件包含所有必填变量（`NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`）且值合法
- **THEN** 应用正常启动，ConfigService 可正确读取所有配置值
- **AND** 类型转换生效（如 `PORT` 为 number 类型）

#### Scenario: 缺少必填变量导致启动失败
- **WHEN** 应用启动且 `DATABASE_URL` 未设置或为空字符串
- **THEN** 应用立即终止并输出明确错误信息，指明缺失的变量名
- **AND** 错误信息包含变量期望的格式说明

#### Scenario: JWT_SECRET 使用弱密钥时发出警告但不终止
- **WHEN** 应用启动且 `JWT_SECRET` 长度小于 32 字符或使用默认占位值
- **THEN** 控制台输出警告信息提示用户更改为强密钥
- **AND** 应用继续正常启动（不终止）

#### Scenario: 生产环境强制关闭 Swagger
- **WHEN** `NODE_ENV=production`
- **THEN** 无论 `ENABLE_SWAGGER` 设置为何值，最终 `enableSwagger` 均为 `false`

---

### Requirement: 统一配置访问接口 getConfig()

系统 SHALL 提供 `getConfig(): Readonly<ValidatedConfig>` 函数作为非 DI 场景下的统一配置访问入口。该函数 SHALL 具有以下特性：

1. 惰性初始化：首次调用时从已校验的 ConfigModule 内部状态构建类型安全对象
2. 结果缓存：后续调用返回同一冻结对象（Object.freeze）
3. 类型推断：`ValidatedConfig` 类型由 Zod Schema 自动 infer
4. 只读保证：返回值不可修改（Readonly + freeze）
5. 调用时机安全：在 ConfigModule.forRoot() 完成之后调用才有效

#### Scenario: 在 Guard 中同步获取配置
- **WHEN** SignAuthGuard 的 `computeSignature()` 方法需要读取 JWT 密钥
- **THEN** 通过 `getConfig().jwtSecret` 同步获取，无需异步等待
- **AND** 返回值为 string 类型（由 Zod schema 保证）

#### Scenario: 在 Filter 中获取环境标识
- **WHEN** HttpExceptionFilter 需要判断当前是否生产环境以控制错误详情暴露
- **THEN** 通过 `getConfig().appEnv === 'production'` 获取枚举类型值
- **AND** TypeScript 编译器可推断 appEnv 的联合类型

#### Scenario: 在静态工具方法中获取加密密钥
- **WHEN** CryptoUtil 的静态方法 `getEncryptionKey()` 被调用
- **THEN** 内部通过 `getConfig().encryptionKey` 获取配置值
- **AND** 若未设置则返回安全的默认值

---

### Requirement: ConfigService DI 注入模式

对于可参与 NestJS DI 容器的类（Service、Strategy、Module 的 useFactory），SHALL 优先使用构造器注入 `ConfigService` 获取配置。注入方式 SHALL 遵循以下规范：

1. 构造器参数声明：`constructor(private readonly configService: ConfigService)`
2. 读取配置：`this.configService.get<string>('KEY')` 或 `this.configService.get('KEY', defaultValue)`
3. 不再 fallback 到 `process.env.*` 直读

#### Scenario: AuthStrategy 通过 DI 获取 JWT 密钥
- **WHEN** JwtStrategy 被实例化用于 Passport 认证
- **THEN** 通过构造器注入的 `configService.get<string>('JWT_SECRET')` 获取签名密钥
- **AND** 不再存在 `process.env.JWT_SECRET || 'fallback'` 模式的代码

#### Scenario: AuthService 通过 DI 获取多配置项
- **WHEN** AuthService 需要读取 JWT_SECRET、JWT_EXPIRES_IN、NODE_ENV 等多个配置
- **THEN** 全部通过注入的 `configService` 获取
- **AND** 各处使用的 key 名称与 Zod Schema 中定义的一致

---

### Requirement: 配置模块工厂函数模式

当前作为 top-level const 导出的配置对象（redisConfig、JWT_CONFIG、knexConfig 等）SHALL 改造为工厂函数，接收 `ValidatedConfig` 参数并返回对应的配置对象。

#### Scenario: Redis 配置延迟创建
- **WHEN** 某模块需要 Redis 连接配置
- **THEN** 调用 `createRedisConfig(getConfig())` 获取完整 RedisConfig 对象
- **AND** 返回对象中 host/port/password/db 等字段均从 ValidatedConfig 映射

#### Scenario: JWT 配置合并后单密钥
- **WHEN** 某模块需要 JWT 签名/验证配置
- **THEN** 调用 `createJwtConfig(getConfig())` 获取 JwtConfig 对象
- **AND** accessTokenSecret 和 refreshTokenSecret 均源自同一个 JWT_SECRET
- **AND** 不再依赖独立的 JWT_ACCESS_SECRET / JWT_REFRESH_SECRET 变量

---

### Requirement: 多环境 .env 文件加载策略

ConfigModule.forRoot() SHALL 保持现有的多环境文件加载策略不变：

```
加载优先级（后者覆盖前者）:
  .env.local > .env.${NODE_ENV} > .env
```

各环境文件的职责边界：

| 文件 | 用途 | 提交到 Git |
|------|------|-----------|
| `.env` | Prisma 读取 + 开发默认值 | ✅ 是 |
| `.env.development` | 开发环境专用覆盖 | ✅ 是 |
| `.env.test` | 测试环境专用（独立数据库） | ✅ 是 |
| `.env.production` | 生产环境模板（含 CI/CD 占位符） | ✅ 是 |
| `.env.example` | 变量说明模板 | ✅ 是 |
| `.env.local` | 本地个人覆盖（密码等敏感信息） | ❌ 否（gitignore） |

#### Scenario: 开发环境默认加载顺序
- **WHEN** `NODE_ENV=development` 且不存在 `.env.local`
- **THEN** 加载顺序：`.env` → `.env.development`（后者覆盖同名变量）
- **AND** 最终 process.env 中 development 的值优先生效

#### Scenario: 本地覆盖最高优先级
- **WHEN** 存在 `.env.local` 文件
- **THEN** `.env.local` 中的变量值覆盖所有其他环境文件中的同名变量
