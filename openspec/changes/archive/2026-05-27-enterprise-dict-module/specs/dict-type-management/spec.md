## ADDED Requirements

### Requirement: 字典类型列表查询
系统 SHALL 支持分页查询字典类型列表，返回所有未删除的字典类型记录，按创建时间倒序排列。支持按 dict_code、dict_name、status 条件筛选。

#### Scenario: 查询全部字典类型
- **WHEN** 管理员调用 `GET /api/system/dict/type/list` 不带筛选参数
- **THEN** 系统返回所有 is_deleted=0 的字典类型，包含 id、dictCode、dictName、status、isSystem、remark、createTime、updateTime 字段，按 createTime DESC 排序

#### Scenario: 按名称模糊搜索字典类型
- **WHEN** 管理员调用 `GET /api/system/dict/type/list?keyword=用户`
- **THEN** 系统返回 dict_name 包含"用户"的字典类型列表

#### Scenario: 按状态筛选字典类型
- **WHEN** 管理员调用 `GET /api/system/dict/type/list?status=1`
- **THEN** 系统返回 status=1 且 is_deleted=0 的字典类型列表

### Requirement: 新增字典类型
系统 SHALL 支持管理员新增字典类型。dict_code 必须全局唯一（在未删除记录中校验）。

#### Scenario: 正常新增字典类型
- **WHEN** 管理员调用 `POST /api/system/dict/type` 携带 { dictCode: "pay_type", dictName: "支付方式", remark: "支付方式分类", status: 1, isSystem: 0 }
- **THEN** 系统创建新的字典类型记录并返回成功响应，create_by 为当前用户标识

#### Scenario: 重复编码报错
- **WHEN** 管理员调用 `POST /api/system/dict/type` 携带已存在的 dictCode（如 "user_status"）
- **THEN** 系统返回 400 错误，提示"字典编码已存在"

#### Scenario: 必填字段缺失
- **WHEN** 管理员调用 `POST /api/system/dict/type` 缺少 dictCode 或 dictName
- **THEN** 系统返回 400 校验错误，提示缺少必填字段

### Requirement: 修改字典类型
系统 SHALL 支持修改字典类型的名称、备注、状态。系统内置类型（is_system=1）不允许修改 dictCode。

#### Scenario: 正常修改字典类型名称和备注
- **WHEN** 管理员调用 `PUT /api/system/dict/type/:id` 携带 { dictName: "用户账户状态", remark: "更新后的备注" }
- **THEN** 系统更新对应记录的 dictName、remark、updateBy、updateTime 并返回成功

#### Scenario: 尝试修改系统内置类型的编码
- **WHEN** 管理员尝试对 is_system=1 的字典类型修改其 dictCode
- **THEN** 系统返回 403 错误，提示"不允许修改系统内置字典的编码"

#### Scenario: 修改不存在的字典类型
- **WHEN** 管理员调用 `PUT /api/system/dict/type/99999`（不存在的 ID）
- **THEN** 系统返回 404 错误，提示"字典类型不存在"

### Requirement: 删除字典类型（软删除）
系统 SHALL 支持软删除字典类型。系统内置类型（is_system=1）禁止删除。

#### Scenario: 正常软删除非内置字典类型
- **WHEN** 管理员调用 `DELETE /api/system/dict/type/:id`（该类型 is_system=0）
- **THEN** 系统将该记录的 is_deleted 设为 1，返回成功响应

#### Scenario: 尝试删除系统内置字典类型
- **WHEN** 管理员调用 `DELETE /api/system/dict/type/:id`（该类型 is_system=1）
- **THEN** 系统返回 403 错误，提示"系统内置字典不允许删除"

#### Scenario: 删除已软删除的记录
- **WHEN** 管理员调用 `DELETE /api/system/dict/type/:id`（该记录已被软删除）
- **THEN** 系统返回 404 错误，提示"字典类型不存在"

### Requirement: 启用/禁用字典类型
系统 SHALL 支持切换字典类型的启用/禁用状态。禁用后该类型下的所有字典项在公开查询接口中不可见。

#### Scenario: 启用字典类型
- **WHEN** 管理员调用 `PUT /api/system/dict/type/:id/status` 携带 { status: 1 }
- **THEN** 系统将对应字典类型的 status 更新为 1，清除相关 Redis 缓存

#### Scenario: 禁用字典类型
- **WHEN** 管理员调用 `PUT /api/system/dict/type/:id/status` 携带 { status: 0 }
- **THEN** 系统将对应字典类型的 status 更新为 0，清除相关 Redis 缓存
