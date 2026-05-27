## 1. 激活标签样式重构 (优化点 A)

- [x] 1.1 移除 `.tags-view-item.is-active` 的 `:before` 伪元素（顶部 2px 蓝条）
- [x] 1.2 将激活态背景色从 `#ecf5ff` 改为 `#e6f0ff`（更饱满的浅蓝实心）
- [x] 1.3 移除激活态的 `border: 1px solid #409eff`（无边框或仅保留极细底边框）
- [x] 1.4 确认激活态文字颜色为 `#409eff`

## 2. 关闭按钮显示逻辑调整 (优化点 C)

- [x] 2.1 修改 `.is-active .tag-close` 的 `opacity` 从条件显示改为 `opacity: 1`（始终可见）
- [x] 2.2 设置激活态关闭按钮颜色 `color: inherit`（继承标签文字颜色）
- [x] 2.3 验证非激活标签 hover 显示逻辑保持不变

## 3. 标签形态轻量化改造 (优化点 D)

- [x] 3.1 移除非激活 `.tags-view-item` 的 `border: 1px solid #d8dce5`（去掉胶囊边框）
- [x] 3.2 在 template 的 `v-for` 循环中添加 `<span class="tag-separator">|</span>` 分隔符（最后一个标签后不显示）
- [x] 3.3 编写 `.tag-separator` 样式（颜色 `#dcdfe6`、padding、不参与交互）
- [x] 3.4 移除或减小非激活标签的 `margin-right: 6px`（改用分隔符控制间距）
- [x] 3.5 调整标签 padding 使整体更紧凑（可选：左右各 12px）

## 4. 左侧导航快捷按钮组 (优化点 B)

- [x] 4.1 在 template 中 `.tags-scroll-container` 前插入 `.tags-nav-buttons` 区块
- [x] 4.2 添加后退按钮：`<el-icon><ArrowLeft /></el-icon>` + `<el-tooltip content="后退">`
- [x] 4.3 添加刷新按钮：`<el-icon><Refresh /></el-icon>` + `<el-tooltip content="刷新">`
- [x] 4.4 添加首页按钮：`<el-icon><HomeFilled /></el-icon>` + `<el-tooltip content="首页">`
- [x] 4.5 在 script 中实现三个按钮的事件处理函数（`handleNavBack` / `handleNavRefresh` / `handleNavHome`）
- [x] 4.6 编写 `.tags-nav-buttons` 样式（固定宽度、竖线右侧分隔、图标大小/间距）
- [x] 4.7 调整 `.tags-view-container` 整体布局为 `[导航组] [分隔] [滚动区] [操作区]`

## 5. 样式细节打磨与适配

- [x] 5.1 调整 `.tags-view-container` 高度/内边距以适应新布局（如有需要）
- [x] 5.2 验证响应式表现：小屏幕下 TagsView 行为符合预期
- [x] 5.3 确认右键上下文菜单样式与新标签风格协调
- [x] 5.4 确认下拉菜单（tags-action）样式与整体一致

## 6. 验证与回归测试

- [x] 6.1 手动验证四个优化点的视觉效果符合设计稿
- [x] 6.2 验证标签核心功能未受影响（打开/切换/关闭/缓存/滚动）
- [x] 6.3 验证导航按钮组的三个功能正常工作
- [x] 6.4 浏览器兼容性快速检查（Chrome/Safari/Firefox）
