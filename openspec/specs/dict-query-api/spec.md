# dict-query-api Specification

## Purpose
TBD - created by archiving change enterprise-dict-module. Update Purpose after archive.
## Requirements
### Requirement: 按编码查询字典项（公开接口）
系统 SHALL 提供公开的无需认证的查询接口，根据字典编码返回所有可用（启用状态 + 类型启用 + 未删除）的字典项。结果 SHALL 缓存到 Redis 中。

#### Scenario: 正常查询存在的字典编码
- **WHEN** 匿名用户调用 `GET /api/public/dict/user_status`
- **THEN** 系统返回 dict_code="user_status"、status=1、所属类型 status=1、is_deleted=0 的所有字典数据项数组，每项包含 dictLabel、dictValue、tagType、sort 字段

#### Scenario: Redis 缓存命中
- **WHEN** 再次调用 `GET /api/public/dict/user_status`（缓存未过期）
- **THEN** 系统直接从 Redis 返回缓存数据，不查询数据库

#### Scenario: 查询不存在的字典编码
- **WHEN** 调用 `GET /api/public/dict/non_exist_code`
- **THEN** 系统返回空数组，并在 Redis 缓存空结果（TTL=60s 防穿透）

#### Scenario: 查询已禁用的字典类型
- **WHEN** 调用 `GET /api/public/dict/disabled_type`（该类型 status=0）
- **THEN** 系统返回空数组（禁用类型的数据不可见）

### Requirement: 按值翻译标签（公开接口）
系统 SHALL 提供公开接口，根据字典编码 + 存储值翻译为对应的展示标签名。

#### Scenario: 正常翻译
- **WHEN** 调用 `GET /api/public/dict/user_status/1`
- **THEN** 系统返回字符串 "启用"（对应的 dict_label）

#### Scenario: 值不存在
- **WHEN** 调用 `GET /api/public/dict/user_status/999`
- **THEN** 系统返回原始值 "999"（fallback 到原值）

#### Scenario: 编码不存在
- **WHEN** 调用 `GET /api/public/dict/non_exist/1`
- **THEN** 系统返回原始值 "1"

### Requirement: 批量查询多个字典（公开接口）
系统 SHALL 支持一次请求获取多个字典编码的所有字典项，减少前端网络请求次数。

#### Scenario: 批量查询两个字典
- **WHEN** 调用 `GET /api/public/dict/batch?codes=user_status,gender`
- **THEN** 系统返回对象 `{ user_status: [...], gender: [...] }`，key 为字典编码，value 为对应的字典项数组

#### Scenario: codes 参数为空
- **WHEN** 调用 `GET /api/public/dict/batch` 不带 codes 参数
- **THEN** 系统返回 400 错误，提示"codes 参数不能为空"

#### Scenario: 部分编码不存在
- **WHEN** 调用 `GET /api/public/dict/batch?codes=user_status,non_exist`
- **THEN** 系统返回 `{ user_status: [...], non_exist: [] }`，不存在的编码返回空数组

### Requirement: 缓存失效策略
系统 SHALL 在字典数据发生变更时自动清除相关的 Redis 缓存，确保下次查询获取最新数据。

#### Scenario: 管理接口写入后清除缓存
- **WHEN** 管理员通过管理接口新增/修改/删除了 dictCode="user_status" 的任意数据
- **THEN** 系统执行 DB 操作成功后，调用 redisCache.invalidatePattern('dict:*') 清除所有字典缓存

#### Scenario: 切换字典类型状态后清除缓存
- **WHEN** 管理员禁用了某个字典类型
- **THEN** 该类型下所有字典数据的公开查询接口返回空数组（缓存已清除，重新查库时过滤掉禁用类型的数据）

