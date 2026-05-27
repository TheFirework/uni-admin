# Specs: dictionary-ui-optimization

## ADDED Requirements

### Requirement: dict-type-pagination

字典类型列表接口 SHALL 支持服务端分页查询。

#### Scenario: 默认分页查询
- **WHEN** 前端调用 `GET /api/system/dict/type/list` 不传分页参数
- **THEN** 后端默认返回第 1 页、每页 10 条的分页结果 `{ list, total }`

#### Scenario: 指定页码和每页条数
- **WHEN** 前端传入 `?page=2&pageSize=20`
- **THEN** 后端返回第 2 页、每页 20 条的数据，total 为匹配条件的总记录数

#### Scenario: 分页参数边界约束
- **WHEN** 前端传入非法分页参数（如 `page=0`, `page=-1`, `pageSize=999`）
- **THEN** 后端自动修正：page 最小值为 1，pageSize 限制在 1-100 之间

#### Scenario: 分页与搜索组合
- **WHEN** 前端同时传入 keyword 和 page/pageSize 参数
- **THEN** 后端先按 keyword 过滤，再对过滤结果进行分页，total 为过滤后的总数

---

### Requirement: dictionary-ui-redesign

字典管理页面 SHALL 采用优化后的 UI 布局和交互模式。

#### Scenario: 左侧面板紧凑列表
- **WHEN** 用户查看字典类型列表
- **THEN** 每个列表项以「名称·编码」单行紧凑格式展示，选中项显示蓝色背景+右边框+右箭头，系统预置项名称后显示橙色圆点标识

#### Scenario: 左侧面板分页生效
- **WHEN** 字典类型总数超过每页条数
- **THEN** 底部分页器正常工作，点击翻页调用后端分页接口并更新列表数据

#### Scenario: 左侧搜索防抖
- **WHEN** 用户在搜索框输入关键词
- **THEN** 300ms 防抖后触发搜索请求，自动重置到第 1 页

#### Scenario: 右侧表格完整列结构
- **WHEN** 用户选中一个字典类型后查看其数据
- **THEN** 表格按以下顺序展示列：☐ 复选框 → 名称 → ID → 值 → 标签类型 → 排序 → 备注 → 状态(开关) → 创建时间(格式化) → 更新时间(格式化) → 操作(编辑/删除链接)

#### Scenario: 日期格式化显示
- **WHEN** 表格渲染创建时间或更新时间列
- **THEN** 日期从 ISO 字符串格式化为 `YYYY-MM-DD HH:mm` 格式显示，空值显示 `-`

#### Scenario: 操作列悬浮固定
- **WHEN** 表格内容区域水平滚动时
- **THEN** 操作列始终固定在表格最右侧，不随内容滚动

#### Scenario: 批量删除字典数据
- **WHEN** 用户勾选多条字典数据后点击工具栏「删除」按钮
- **THEN** 弹出确认对话框显示待删除数量，确认后逐条调用删除接口并刷新表格

#### Scenario: 状态开关切换
- **WHEN** 用户点击某行的状态开关
- **THEN** 调用 updateDictData 接口更新状态字段，成功后刷新表格数据

## MODIFIED Requirements

### Requirement: dict-type-management (from enterprise-dict-module)

字典类型管理的前端交互 SHALL 简化为纯导航选择模式。

#### Scenario: 左侧列表仅支持选择
- **WHEN** 用户点击左侧字典类型列表项
- **THEN** 仅触发选中状态变更并加载右侧对应数据，不显示任何内联操作按钮

#### Scenario: 字典类型仅支持新增
- **WHEN** 用户通过标题栏或工具栏入口操作字典类型
- **THEN** 仅提供「新增字典类型」对话框，不提供编辑/删除/启用禁用的快捷入口

---

### Requirement: dict-data-management (from enterprise-dict-module)

字典数据管理的表格展示和操作方式 SHALL 按新的列结构和交互模式运行。

#### Scenario: 表格移除列头排序
- **WHEN** 用户查看字典数据表格
- **THEN** 所有列头不显示排序图标，不支持点击列头排序

#### Scenario: 表格移除搜索过滤
- **WHEN** 用户查看字典数据表格
- **THEN** 工具栏不包含搜索框，表格直接展示全部数据（无前端过滤层）

#### Scenario: 操作按钮不换行
- **WHEN** 用户查看操作列
- **THEN** 编辑和删除按钮以 link 类型显示，在一行内排列不换行
