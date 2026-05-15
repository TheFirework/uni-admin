# Data Security Specification

## Purpose

定义 uni-admin 系统的数据安全规范，包括敏感数据加解密、接口签名验证和配置项加密存储，确保数据传输、存储和处理的安全性。

**Scope**: 覆盖 AES 加解密工具、HMAC 签名验证机制、防重放攻击策略。

---

## Requirements

### Requirement: 敏感数据加解密工具
系统 MUST 封装 Crypto-js 工具类，提供统一的 AES 加解密 API，用于保护敏感数据（手机号、身份证、银行卡等）。

**加密算法**: AES-256-CBC
**密钥管理**:
- 主密钥: 从环境变量 `CRYPTO_SECRET_KEY` 读取（32 字节长度）
- 向量 (IV): 每次加密随机生成（16 字节），附加到密文前

**API 设计**:
```typescript
class CryptoUtil {
  static encrypt(plaintext: string): string;  // 加密返回 Base64
  static decrypt(ciphertext: string): string;  // 解密返回原文
}
```

#### Scenario: 加密手机号存储
- **WHEN** 系统需要存储用户的手机号到数据库
- **THEN** MUST 先调用 `CryptoUtil.encrypt('13800138000')`
- **AND** 数据库中存储密文（如 `U2FsdGVkX1+7vR...`）
- **AND** 原始手机号 MUST 不出现在数据库和日志中

#### Scenario: 解密手机号显示
- **WHEN** 前端请求查看用户详细信息
- **THEN** 后端 MUST 从数据库读取密文
- **AND** 调用 `CryptoUtil.decrypt(ciphertext)` 还原为明文
- **AND** 返回给前端（注意：生产环境建议脱敏显示，如 `138****8000`）

#### Scenario: 加密失败处理
- **WHEN** 密文被篡改或密钥不匹配导致解密失败
- **THEN** CryptoUtil.decrypt() MUST 抛出 `CryptoDecryptionError`
- **AND** 错误消息 MUST 为 "数据解密失败"
- **AND** 系统 MUST 记录 error 级别日志（可能存在数据篡改攻击）

---

### Requirement: 接口签名验证
系统 MUST 实现 HMAC-SHA256 接口签名机制，防止请求被篡改或重放攻击。

**签名流程**:
```
客户端:
1. 将请求参数按 key 字典排序
2. 拼接为 querystring 格式（key1=value1&key2=value2）
3. 附加 timestamp（当前时间戳，精确到秒）和 nonce（随机字符串）
4. 计算 HMAC-SHA256 签名: sign = HMAC-SHA256(secret, sortedParams + timestamp + nonce)
5. 在 Header 中传递: X-Sign, X-Timestamp, X-Nonce

服务端:
1. 从 Header 提取 X-Sign, X-Timestamp, X-Nonce
2. 验证 timestamp 是否在 ±5 分钟内（防重放）
3. 验证 nonce 是否已被使用（Redis 存储，5 分钟过期）
4. 使用相同算法重算签名
5. 对比签名是否一致
```

**适用范围**:
- 敏感操作接口（如修改密码、支付、权限变更）
- 公开的写操作接口（如注册、提交表单）
- 可通过 `@RequireSign()` 装饰器按需启用

#### Scenario: 合法的带签名请求
- **WHEN** 客户端正确计算签名并在 Header 中传递
- **AND** 时间戳在有效范围内（±5分钟）
- **AND** nonce 未被重复使用
- **THEN** 签名验证守卫 MUST 放行请求
- **AND** 业务逻辑正常执行

#### Scenario: 签名被篡改
- **WHEN** 攻击者截获请求并修改了参数但未更新签名
- **THEN** 服务端重算的签名 MUST 与 X-Sign 不匹配
- **AND** 守卫 MUST 返回 HTTP 403 Forbidden
- **AND** 错误码为 `INVALID_SIGNATURE`

#### Scenario: 重放攻击检测
- **WHEN** 攻击者截获请求并在 5 分钟内重复发送（相同的 timestamp + nonce）
- **THEN** 服务端检查 Redis 发现 nonce 已存在
- **AND** 守卫 MUST 返回 HTTP 403 Forbidden
- **AND** 错误码为 `REPLAY_ATTACK`

---

### Requirement: 配置项加密存储
系统 MUST 使用 AES 加密存储敏感配置项（数据库密码、第三方 API Key 等）。

**实现方式**:
- 开发环境: 明文存储在 `.env.development`（方便调试）
- 生产环境: 加密存储在 `.env.production`（如 `DB_PASSWORD=enc:U2FsdGVkX1+...`）
- 启动时自动解密: ConfigModule 加载 .env 后调用 `CryptoUtil.decrypt()` 还原

#### Scenario: 启动时解密配置
- **WHEN** 服务启动读取 `.env.production`
- **AND** 发现以 `enc:` 前缀开头的配置项
- **THEN** ConfigService MUST 自动解密该配置项
- **AND** 应用程序使用解密后的明文值（对业务代码透明）
