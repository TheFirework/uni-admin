## 1. 后端分页改造

- [x] 1.1 DictTypeQueryDto 新增 `page`(string) 和 `pageSize`(string) 字段，添加 ApiPropertyOptional 装饰器
- [x] 1.2 DictionaryService.findTypeList() 重构：用 parseInt 转换分页参数 + Math 边界约束，改用 skip/take 分页查询
- [x] 1.3 findTypeList() 返回值从 `DictTypeItem[]` 改为 `{ list: DictTypeItem[], total: number }`，使用 Promise.all 并行查询

## 2. 前端 API 层适配

- [x] 2.1 system.api.ts 新增 `PaginatedResult<T>` 泛型接口定义
- [x] 2.2 getDictTypeList 签名改为返回 `Promise<PaginatedResult<DictTypeItem>>`，新增 page/pageSize 参数

## 3. 左侧面板 UI 重构

- [x] 3.1 布局比例调整：el-col 从 span=8|16 改为 6|18（25% : 75%）
- [x] 3.2 列表项改为紧凑「名称·编码」单行格式，选中项显示右箭头 →
- [x] 3.3 移除 hover 操作按钮区域（编辑/删除/启用禁用按钮及对应样式）
- [x] 3.4 移除标题栏折叠按钮(Minus)，仅保留刷新(Refresh)
- [x] 3.5 系统预置类型(isSystem=1)名称后显示橙色圆点 CSS 伪元素标识
- [x] 3.6 ElScrollbar 美化滚动条（4px 宽度 + hover 变色过渡）
- [x] 3.7 分页控件对接后端分页接口（fetchTypeList 传 page/pageSize，处理 {list, total} 响应）

## 4. 右侧面板 UI 重构

- [x] 4.1 标题栏精简：移除折叠/全屏按钮，保留刷新+标题
- [x] 4.2 工具栏精简：保留 刷新 | 新增(蓝) | 批量删除(红)，移除搜索框及 dataKeyword/filteredDataList/handleDataSearch
- [x] 4.3 表格列结构调整：
  - 新增 ☐ 复选框列 (type="selection", width=42)
  - 新增 ID 列 (width=60, align=center)
  - 新增标签类型列 (el-tag 渲染 tagType, width=90)
  - 新增状态列 (el-switch 开关, width=70)
  - 日期列使用 formatTime() 格式化为 YYYY-MM-DD HH:mm
  - 移除所有列的 sortable 属性
  - 操作列 fixed="right", width=160, 使用 link 类型按钮避免换行
  - 最终列顺序：☐ 名称 → ID → 值 → 标签类型 → 排序 → 备注 → 状态 → 创建时间 → 更新时间 → 操作
- [x] 4.4 新增 formatTime 工具函数（日期字符串 → 格式化输出，空值返回 `-`）
- [x] 4.5 操作列 sticky 样式（背景色继承避免滚动穿透）

## 5. 对话框与交互简化

- [x] 5.1 字典类型对话框改为仅「新增」模式（移除编辑入口 editingType 逻辑）
- [x] 5.2 清理无用导入和函数：移除 Edit/Delete/CircleClose/CircleCheck/Minus/FullScreen 图标导入、toggleDictTypeStatus/deleteDictType/updateDictType 导入、handleDeleteType/toggleTypeStatus 函数、typeDialog 的编辑模式分支
- [x] 5.3 移除 dataDialog 中操作列的「新增」按钮（工具栏已有全局新增入口）
