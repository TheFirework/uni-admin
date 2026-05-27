## Why

当前 TagsView 组件采用传统的胶囊状标签设计（border + 顶部蓝条 + 浅色背景），视觉风格偏老旧，与现代后台管理系统的简洁趋势存在差距。参考业界优秀实践（如 Cool Admin 的 TagBar 设计），通过 UI 层面的优化提升用户操作效率和视觉体验，使标签栏更紧凑、信息层次更清晰、交互更直观。

## What Changes

- **激活标签样式重构**：去掉 `:before` 伪元素实现的顶部 2px 蓝条，改为浅蓝色实心背景填充（`#e6f0ff`），文字颜色 `#409eff`，无边框或仅保留极细底边框
- **新增左侧导航快捷按钮组**：在标签列表左侧添加三个图标按钮 — 后退（`<`）、刷新（`↻`）、首页（`🏠`），采用纯图标展示 + `el-tooltip` 悬浮提示，与标签区域用竖线分隔
- **关闭按钮显示逻辑调整**：激活标签的关闭按钮从 hover 时淡入改为始终可见（`opacity: 1`），非激活标签保持 hover 显示逻辑不变
- **标签形态轻量化改造**：非激活标签去掉 `border: 1px solid #d8dce5` 边框，改为文字链接风格；标签之间用竖线分隔符 `|` 替代 `margin-right` 间距；减小 padding 使整体更紧凑

## Capabilities

### New Capabilities
（无新增 capability）

### Modified Capabilities
- `tags-view`: 标签栏 UI 交互需求变更 — 新增导航快捷按钮组要求、激活态视觉规范更新（实心背景替代顶部蓝条）、关闭按钮可见性规则调整、标签分隔方式从间距改为竖线分隔符

## Impact

### 受影响的代码文件
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/web/src/layouts/components/TagsView/index.vue` | **主要修改** | template 新增导航按钮组 + style 全面重写（约影响 200 行样式代码） |
| `apps/web/src/layouts/components/Header/index.vue` | 可能微调 | tabbar 容器高度/内边距适配新布局 |

### 受影响的测试
- 现有 TagsView 相关 e2e 测试可能需要更新选择器断言（激活态样式类名/结构变化）

### 依赖变更
- 无新增外部依赖（使用 Element Plus 已有组件：`el-tooltip`、`el-icon`）

### 回滚方案
- 通过 Git 回退到变更前的 commit 即可完全恢复原始样式，无数据迁移或 schema 变更风险
