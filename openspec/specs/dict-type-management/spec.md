# dict-type-management Specification

## Purpose
定义字典类型的完整生命周期管理能力——包含列表查询（含分页）、新增、以及前端交互简化规范。

## Requirements

### Requirement: 字典类型列表查询（含分页）
系统 SHALL 支持分页查询字典类型列表，返回分页结果对象 `{ list, total }`。支持按 dict_code、dict_name 模糊匹配及 status 条件筛选。分页参数使用字符串类型以兼容 URL query string。

#### Scenario: 默认分页查询全部字典类型
- **WHEN** 管理员调用 `GET /api/system/dict/type/list` 不带筛选参数
- **THEN** 系统返回第 1 页、每页 10 条的分页结果，包含 id、dictCode、dictName、status、isSystem、remark、createTime、updateTime 字段，按 createTime DESC 排序

#### Scenario: 按名称模糊搜索并分页
- **WHEN** 管理员调用 `GET /api/system/dict/type/list?keyword=用户&page=1&pageSize=20`
- **THEN** 系统返回 dict_name 或 dict_code 包含"用户"的前 20 条记录，total 为匹配总数

#### Scenario: 按状态筛选字典类型
- **WHEN** 管理员调用 `GET /api/system/dict/type/list?status=1`
- **THEN** 系统返回 status=1 且 is_deleted=0 的字典类型分页结果

#### Scenario: 分页参数边界自动修正
- **WHEN** 管理员传入非法分页参数（page=0, page=-1, pageSize=999）
- **THEN** 系统自动修正为合法值（page≥1, 1≤pageSize≤100）后执行查询

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

### Requirement: 前端交互简化
字典类型管理的前端交互 SHALL 简化为纯导航选择模式，操作入口集中在对话框。

#### Scenario: 左侧列表仅支持选择
- **WHEN** 用户点击左侧字典类型列表项
- **THEN** 仅触发选中状态变更并加载右侧对应数据，不显示任何内联操作按钮（编辑/删除/启用禁用）

#### Scenario: 字典类型仅支持新增
- **WHEN** 用户通过标题栏或工具栏入口操作字典类型
- **THEN** 仅提供「新增字典类型」对话框，不提供编辑/删除/启用禁用的快捷入口
