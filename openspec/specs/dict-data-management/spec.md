# dict-data-management Specification

## Purpose
定义字典数据的完整管理能力——包含列表查询、增删改查、排序调整，以及 UI 重构后的展示规范。

## Requirements

### Requirement: 字典数据列表查询
系统 SHALL 支持按字典编码（dictCode）筛选查询字典数据列表，返回所有未删除且属于启用状态的字典项，按 sort 升序排列。

#### Scenario: 查询某编码下所有字典数据
- **WHEN** 管理员调用 `GET /api/system/dict/data/list?dictCode=user_status`
- **THEN** 系统返回 dict_code="user_status"、is_deleted=0 的所有字典数据，按 sort ASC 排序

#### Scenario: 不带编码查询全部字典数据
- **WHEN** 管理员调用 `GET /api/system/dict/data/list` 不带参数
- **THEN** 系统返回所有未删除的字典数据（管理接口允许查看全部）

#### Scenario: 查询不存在编码的字典数据
- **WHEN** 管理员调用 `GET /api/system/dict/data/list?dictCode=non_exist`
- **THEN** 系统返回空数组

### Requirement: 新增字典数据
系统 SHALL 支持为指定字典类型新增字典数据项。dictCode 必须对应一个已存在且启用的字典类型。

#### Scenario: 正常新增字典数据
- **WHEN** 管理员调用 `POST /api/system/dict/data` 携带 { dictCode: "user_status", dictLabel: "锁定", dictValue: "2", sort: 3, tagType: "warning", status: 1, remark: "账号被锁定" }
- **THEN** 系统创建新的字典数据记录，清除该 dictCode 对应的 Redis 缓存

#### Scenario: 关联的字典类型不存在
- **WHEN** 管理员调用 `POST /api/system/dict/data` 携带不存在的 dictCode
- **THEN** 系统返回 400 错误，提示"字典类型不存在"

#### Scenario: 关联的字典类型已禁用
- **WHEN** 管理员尝试向 status=0 的字典类型添加数据
- **THEN** 系统返回 400 错误，提示"目标字典类型已禁用"

### Requirement: 修改字典数据
系统 SHALL 支持修改字典数据的标签、值、排序、标签类型、状态等字段。

#### Scenario: 正常修改字典数据
- **WHEN** 管理员调用 `PUT /api/system/dict/data/:id` 携带 { dictLabel: "已启用", tagType: "success", sort: 1 }
- **THEN** 系统更新对应记录，清除该 dictCode 对应的 Redis 缓存

#### Scenario: 修改不存在的字典数据
- **WHEN** 管理员调用 `PUT /api/system/dict/data/99999`
- **THEN** 系统返回 404 错误，提示"字典数据不存在"

### Requirement: 删除字典数据（软删除）
系统 SHALL 支持软删除字典数据。

#### Scenario: 正常软删除字典数据
- **WHEN** 管理员调用 `DELETE /api/system/dict/data/:id`
- **THEN** 系统将该记录的 is_deleted 设为 1，清除该 dictCode 对应的 Redis 缓存

#### Scenario: 删除已软删除的记录
- **WHEN** 管理员调用 `DELETE /api/system/dict/data/:id`（已软删除的记录）
- **THEN** 系统返回 404 错误

### Requirement: 字典数据排序调整
系统 SHALL 支持批量或单独调整字典数据的 sort 值以控制展示顺序。

#### Scenario: 单条修改排序值
- **WHEN** 管理员调用 `PUT /api/system/dict/data/:id` 仅修改 sort 字段
- **THEN** 系统更新排序值，再次查询时按新顺序返回

### Requirement: 表格展示规范（UI 重构）
字典数据表格 SHALL 按优化后的列结构和交互模式运行。

#### Scenario: 表格移除列头排序
- **WHEN** 用户查看字典数据表格
- **THEN** 所有列头不显示排序图标，不支持点击列头排序

#### Scenario: 表格移除搜索过滤
- **WHEN** 用户查看字典数据表格
- **THEN** 工具栏不包含搜索框，表格直接展示全部数据（无前端过滤层）

#### Scenario: 操作按钮不换行
- **WHEN** 用户查看操作列
- **THEN** 编辑和删除按钮以 link 类型显示，在一行内排列不换行
