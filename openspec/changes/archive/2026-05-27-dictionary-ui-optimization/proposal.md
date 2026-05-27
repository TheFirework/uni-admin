## Why

字典管理页面（`enterprise-dict-module` 基础模块）的 UI 存在多项问题：左侧列表信息密度低、缺少分页导致数据量增长后性能堪忧、右侧表格列结构不合理（无复选框/ID/时间格式化）、操作按钮换行影响视觉整洁度。同时后端 `getDictTypeList` API 不支持分页参数，前端分页控件形同虚设。需要一次全面的 UI 优化 + 后端分页改造，使字典管理页面达到企业级可用标准。

## What Changes

### 后端 (NestJS + Prisma)
- **DictTypeQueryDto** 新增 `page` / `pageSize` 查询参数（字符串类型，兼容 URL query string）
- **DictionaryService.findTypeList()** 重构为 skip/take 分页查询：并行执行 findMany + count，返回 `{ list, total }` 分页对象
- 参数转换层做 parseInt + Math 边界约束（page≥1, 1≤pageSize≤100）

### 前端 (Vue 3 + Element Plus)
- **API 层** (`system.api.ts`)：`getDictTypeList` 签名从 `DictTypeItem[]` 改为 `PaginatedResult<DictTypeItem>`，新增泛型 `PaginatedResult<T>` 接口
- **布局比例** 调整：左右分栏从 `el-col :span="8|16"` 改为 `"6|18"`（25% : 75%）
- **左侧面板** 精简：
  - 列表项改为紧凑「名称·编码」格式（一行显示），选中项右侧显示箭头 `→`
  - 移除 hover 操作按钮（编辑/删除/启用禁用）
  - 移除标题栏折叠按钮
  - 保留：搜索框（防抖 300ms）、ElScrollbar 美化滚动条、底部分页控件
  - 系统预置类型（isSystem=1）名称后显示橙色圆点标识
- **右侧面板** 增强：
  - 标题栏精简为「刷新」+ 标题（移除折叠/全屏按钮）
  - 工具栏保留：刷新 | 新增(蓝) | 批量删除(红)
  - **移除**工具栏搜索框及前端过滤逻辑
- **表格** 结构升级：
  - 新增 ☐ 复选框列（支持批量操作）
  - 新增 ID 列
  - 新增标签类型列（el-tag 渲染 tagType）
  - 新增状态列（el-switch 启用/禁用切换）
  - 日期列格式化为 `YYYY-MM-DD HH:mm`（替代原始 ISO 字符串）
  - **移除**所有列头 `sortable` 排序功能
  - 操作列使用 `fixed="right"` 悬浮右侧，按钮改为 `link` 类型避免换行
  - 列顺序重排：☐ 名称 → ID → 值 → 标签类型 → 排序 → 备注 → 状态 → 创建时间 → 更新时间 → 操作
- **对话框** 调整：字典类型对话框仅保留新增模式（移除编辑入口）

### 非目标（Non-goals）
- 不涉及 Redis 缓存策略变更
- 不涉及 DictSelect / DictTag 公共组件修改
- 不涉及菜单路由配置变更
- 不涉及权限控制逻辑变更

## Capabilities

### New Capabilities
- `dict-type-pagination`: 字典类型列表后端分页能力——DTO 分页参数定义、Service 层 skip/take 分页查询、返回分页结果对象
- `dictionary-ui-redesign`: 字典管理页面 UI 全面重构——左右分栏布局优化、左侧紧凑列表、右侧增强表格、操作列悬浮固定

### Modified Capabilities
- `dict-type-management`: 字典类型管理能力——前端交互简化（移除列表项内联操作按钮）、API 返回值签名变更（数组→分页对象）
- `dict-data-management`: 字典数据管理能力——表格列结构调整（新增复选框/ID/标签类型/状态/日期格式化列）、操作方式变更（link 按钮+固定列）

## Impact

### 受影响的代码文件
| 层级 | 文件 | 变更类型 |
|------|------|----------|
| 后端 DTO | `apps/server/src/modules/dictionary/dto/type.dto.ts` | 新增 page/pageSize 字段 |
| 后端 Service | `apps/server/src/modules/dictionary/dictionary.service.ts` | findTypeList 重构为分页查询 |
| 前端 API | `apps/web/src/api/modules/system.api.ts` | 新增 PaginatedResult 泛型接口，getDictTypeList 签名变更 |
| 前端页面 | `apps/web/src/views/system/dictionary/index.vue` | 全面重构（模板+脚本+样式） |

### 受影响的 API
| 接口 | 变更说明 |
|------|----------|
| `GET /api/system/dict/type/list` | **Breaking**: 返回值从 `DictTypeItem[]` 变为 `{ list: DictTypeItem[], total: number }`；新增可选查询参数 `page` / `pageSize` |

### 依赖变更
- **新增依赖**: 无
- **移除依赖**: 无

### 回滚计划
1. 后端：恢复 `findTypeList()` 为全量数组返回，移除 DTO 中 page/pageSize 字段
2. 前端：恢复 `getDictTypeList` 签名为旧版数组类型，还原 index.vue 到优化前版本（git 可回溯）
3. API 兼容性：如存在其他调用方需同步更新适配新的分页响应格式
