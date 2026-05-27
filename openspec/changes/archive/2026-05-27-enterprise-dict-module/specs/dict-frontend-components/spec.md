## ADDED Requirements

### Requirement: DictSelect 下拉选择组件
系统 SHALL 提供 DictSelect 可复用 Vue 组件，接收 dictCode 属性后自动加载字典数据并渲染为 Element Plus el-select 下拉框。

#### Scenario: 基础渲染
- **WHEN** 开发者在模板中使用 `<DictSelect v-model="form.status" dict-code="user_status" />`
- **THEN** 组件自动调用公开查询接口获取 user_status 的字典项，渲染为 el-select + el-option 下拉框，选项 label 为 dictLabel、value 为 dictValue

#### Scenario: 支持常用 props
- **WHEN** 开发者传入 placeholder、disabled、clearable、filterable 等 prop
- **THEN** 这些 prop 透传给底层 el-select 组件生效

#### Scenario: v-model 双向绑定
- **WHEN** 用户在下拉框中选择一个选项
- **THEN** v-model 绑定值更新为对应选项的 dictValue；外部修改 v-model 值时下拉框选中状态同步更新

#### Scenario: 字典数据请求去重
- **WHEN** 页面中多个 DictSelect 使用相同 dictCode
- **THEN** 相同 dictCode 的字典数据只请求一次（组件内部共享缓存）

### Requirement: DictTag 标签渲染组件
系统 SHALL 提供 DictTag Vue 组件，根据 dictCode + value 自动渲染带颜色的 Element Plus el-tag 标签。

#### Scenario: 正常渲染标签
- **WHEN** 开发者在表格列中使用 `<DictTag :dict-code="'user_status'" :value="row.status" />`
- **THEN** 组件渲染 el-tag，文本为对应的 dictLabel，type 属性来自 tagType（如 "success" 渲染绿色标签）

#### Scenario: 值无匹配时回退
- **WHEN** value 在指定 dictCode 的字典项中找不到匹配
- **THEN** 组件直接显示原始 value 值作为纯文本（不带 tag 样式）

#### Scenario: tagType 为空时使用默认样式
- **WHEN** 匹配到的字典项 tagType 为 null
- **THEN** 组件使用默认的 info 类型（灰色）渲染 el-tag

### Requirement: 左右分栏字典管理页面
系统 SHALL 提供字典管理主页面，采用 Master-Detail 左右分栏布局。

#### Scenario: 页面初始加载
- **WHEN** 管理员访问字典管理页面
- **THEN** 左侧展示字典类型列表（含搜索框），右侧默认展示第一个类型的数据列表或空状态提示

#### Scenario: 左侧点击切换类型
- **WHEN** 管理员在左侧点击某个字典类型
- **THEN** 右侧刷新为该类型下的字典数据列表，高亮当前选中的类型

#### Scenario: 左侧搜索类型
- **WHEN** 管理员在左侧搜索框输入关键词
- **THEN** 左侧列表实时过滤匹配的字典类型（按 dictCode 或 dictName 模糊匹配）

#### Scenario: 右侧新增字典数据
- **WHEN** 管理员在右侧点击"新增"按钮并填写表单提交
- **THEN** 系统调用新增接口，成功后右侧列表刷新，显示新添加的数据项

#### Scenario: 右侧编辑字典数据
- **WHEN** 管理员在右侧点击某行的"编辑"按钮，修改表单后提交
- **THEN** 系统调用修改接口，成功后该行数据更新

#### Scenario: 右侧删除字典数据
- **WHEN** 管理员在右侧点击某行的"删除"并确认
- **THEN** 系统调用删除接口（软删除），成功后该行从列表移除

#### Scenario: 新增字典类型
- **WHEN** 管理员在左侧点击"新增字典类型"按钮
- **THEN** 弹出对话框填写类型信息，提交成功后左侧列表刷新显示新类型

### Requirement: 前端 API 层
系统 SHALL 在前端 API 模块中提供字典相关的接口调用函数。

#### Scenario: 提供管理接口函数
- **WHEN** 业务代码需要操作字典数据
- **THEN** 可导入 getDictTypeList / createDictType / updateDictType / deleteDictType / toggleDictTypeStatus 等函数

#### Scenario: 提供查询接口函数
- **WHEN** 业务代码需要获取字典数据用于渲染
- **THEN** 可导入 getDictItems / getDictLabel / getDictBatch 等函数调用公开查询接口
