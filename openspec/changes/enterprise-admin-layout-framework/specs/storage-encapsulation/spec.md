## ADDED Requirements

### Requirement: 统一工厂 API

系统 SHALL 提供 StorageFactory 单例作为唯一操作 localStorage/sessionStorage 的入口。代码中 SHALL NOT 直接调用原生 localStorage/sessionStorage API。

#### Scenario: 基本读写操作

- **WHEN** 调用 storage.set('key', { a: 1 }, { namespace: 'test' })
- **THEN** 数据 SHALL 以 `ua:test:key` 为键存入 localStorage
- **AND** 值 SHALL 自动 JSON.stringify 序列化
- **WHEN** 之后调用 storage.get('key', { defaultValue: { a: 0 }, namespace: 'test' })
- **THEN** 返回值 SHALL 为 `{ a: 1 }` (自动 JSON.parse 反序列化)
- **AND** 若 key 不存在则返回 defaultValue `{ a: 0 }`

#### Scenario: 类型安全泛型约束

- **WHEN** 声明 storage.get<UserInfo>('userInfo', { namespace: 'user' })
- **THEN** 返回值类型 SHALL 为 UserInfo (非 unknown)
- **AND** TypeScript 编译器提供完整的类型提示和校验

---

### Requirement: TTL 过期机制

存储值可选配过期时间 (TTL)。写入时附带 `_exp` 时间戳键，读取时自动比对当前时间，过期的条目返回 defaultValue 并异步删除。

#### Scenario: 写入带 TTL 的数据

- **WHEN** 调用 storage.set('captcha', 'abc123', { ttl: 300_000, namespace: 'cache' })
- **THEN** 写入主值 `ua:cache:captcha` = '"abc123"'
- **AND** 同时写入过期时间戳 `ua:cache:captcha._exp` = 当前时间戳 + 300000ms

#### Scenario: 读取未过期的 TTL 数据

- **WHEN** 在 TTL 有效期内调用 storage.get('captcha', { namespace: 'cache' })
- **THEN** 返回存储的实际值 `'abc123'`

#### Scenario: 读取已过期的 TTL 数据

- **WHEN** TTL 已过期后调用 storage.get('captcha', { defaultValue: '', namespace: 'cache' })
- **THEN** 返回 defaultValue `''`
- **AND** 异步删除 `ua:cache:captcha` 和 `ua:cache:captcha._exp` 两个键

---

### Requirement: AES-GCM 加密存储

敏感数据（如 Token）可选启用 AES-256-GCM 加密。加密使用 Web Crypto API（零依赖），密钥从设备指纹派生并缓存在内存中。

#### Scenario: 加密写入 Token

- **WHEN** 调用 storage.set('token', 'eyJhbGci...', { encrypt: true, namespace: 'auth' })
- **THEN** 值在序列化后 SHALL 经过 AES-GCM 加密再写入
- **AND** 通过浏览器 DevTools Application 面板查看时看到的是密文非明文

#### Scenario: 加密读取 Token

- **WHEN** 调用 storage.get('token', { encrypt: true, namespace: 'auth' })
- **THEN** 先读取密文，再用 AES-GCM 解密，再反序列化返回明文
- **AND** 解密过程对调用方透明

#### Scenario: 密钥内存持有策略

- **WHEN** 页面加载后首次调用加密读写
- **THEN** 密钥从 navigator.userAgent + origin 通过 PBKDF2 派生
- **AND** 密钥仅保存在 JavaScript 内存变量中
- **AND** 页面关闭后密钥丢失（不持久化）

---

### Requirement: 容量监控与预警

每次写入前 SHALL 检查 Storage 剩余容量。接近上限时发出预警，不足时自动清理过期条目。

#### Scenario: 容量充足时正常写入

- **WHEN** 当前 Storage 已用量 < 4.5MB (5MB 的 90%)
- **THEN** set 操作正常执行，无任何警告

#### Scenario: 容量接近上限时发出警告

- **WHEN** 当前 Storage 已用量 > 4.5MB 但 < 4.9MB
- **THEN** set 操作正常执行
- **AND** 控制台输出 `[Storage] WARNING: 容量使用超过 90%，建议清理`

#### Scenario: 容量严重不足时自动清理

- **WHEN** 当前 Storage 已用量 > 4.9MB 且待写入数据会导致超限
- **THEN** 自动扫描并删除所有 _exp 已过期的 TTL 条目
- **AND** 清理后如果空间足够则正常写入
- **AND** 如果清理后仍不足则抛出 QuotaExceededError

---

### Requirement: 命名空间隔离

所有存储键 MUST 带 `ua:` 前缀和命名空间标识，避免与其他应用或手写代码冲突。支持按命名空间批量清除。

#### Scenario: 键名前缀规则

- **WHEN** 以 namespace='auth', key='token' 写入
- **THEN** 实际存储键名为 `ua:auth:token`

#### Scenario: 按命名空间批量清除

- **WHEN** 调用 storage.clearNamespace('auth')
- **THEN** 删除所有 `ua:auth:*` 前缀的键
- **AND** 不影响其他命名空间的数据

#### Scenario: 一键全清

- **WHEN** 调用 storage.clearAll()
- **THEN** 删除所有 `ua:*` 前缀的键
- **AND** 不影响非 ua 前缀的数据（兼容遗留代码）

---

### Requirement: SSR 安全访问

Storage 封装层 SHALL 在服务端渲染（SSR）或 window 对象不存在环境中安全降级，不抛出异常。

#### Scenario: 非浏览器环境调用 get

- **WHEN** 在 Node.js / SSR 环境中调用 storage.get('key', { defaultValue: 'fallback' })
- **THEN** 返回 defaultValue `'fallback'`，SHALL NOT 抛出异常

---

### Requirement: 与 Pinia 和路由守卫联动

Storage 封装层 SHALL 与 AuthStore 和路由守卫紧密集成。AuthStore 的 token 读写走 Storage 封装层；logout 时一键清空关联命名空间。

#### Scenario: AuthStore 读取 Token 经由 Storage

- **WHEN** AuthStore 需要 Token 来附加到 HTTP 请求头
- **THEN** 通过 storage.get('token', { encrypt: true, namespace: 'auth' }) 读取
- **AND** 不直接访问 localStorage

#### Scenario: 退出登录时联动清空

- **WHEN** 执行 authStore.logout()
- **THEN** 顺序执行:
  1. storage.clearNamespace('auth') — 清除 Token
  2. storage.clearNamespace('user') — 清除用户信息
  3. storage.clearNamespace('tags') — 清除标签临时状态
  4. 重置 isRoutesLoaded = false
  5. router.push('/login')

#### Scenario: 区分持久化和临时存储

- **WHEN** 存储 Token 类长期数据
- **THEN** 默认使用 type: 'local' (localStorage)，关闭浏览器不丢失
- **WHEN** 存储标签列表类临时数据
- **THEN** 使用 type: 'session' (sessionStorage)，关闭浏览器标签即清除
