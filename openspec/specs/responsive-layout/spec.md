# Responsive Layout Spec

## Purpose

定义响应式布局规范，基于 4 个桌面分辨率断点控制 Layout 行为变化，确保在不同屏幕尺寸下提供最佳的用户体验。

---

## Requirements

### Requirement: 响应式断点定义

Layout 响应式行为 SHALL 基于 4 个桌面分辨率断点控制。断点值复用项目已有的 SCSS 变量体系 ($breakpoint-*)。

#### Scenario: xl 断点 (≥1200px) — 完整布局

- **WHEN** 视口宽度 ≥ 1200px
- **THEN** 侧边栏完整展开显示 (240px 宽度)
- **AND** 顶栏完整显示所有元素（面包屑 + 标签栏 + 头像区）
- **AND** 内容区自适应填充剩余空间

#### Scenario: lg 断点 (992px–1199px) — 可折叠布局

- **WHEN** 视口宽度在 992–1199px 之间
- **THEN** 侧边栏默认可折叠为图标模式 (64px)
- **OR** 保持展开但内容区变窄
- **AND** 顶栏保持完整显示

#### Scenario: md 断点 (768px–991px) — 隐藏侧边栏

- **WHEN** 视口宽度在 768–991px 之间
- **THEN** 侧边栏默认隐藏
- **AND** Header 左侧出现汉堡菜单按钮
- **AND** 点击汉堡按钮后侧边栏以 Overlay 抽屉形式临时弹出
- **AND** 顶栏简化显示（面包屑保留，标签栏可缩减）

#### Scenario: sm 断点 (<768px) — 最小化布局

- **WHEN** 视口宽度 < 768px
- **THEN** 侧边栏为全屏覆盖式抽屉 (width: 100%)
- **AND** 顶栏仅显示必要元素（汉堡按钮 + 页面标题 + 头像）
- **AND** 标签栏改为下拉菜单或隐藏

---

### Requirement: @vueuse/core 集成

响应式断点检测 SHALL 使用 @vueuse/core 的 useBreakpoints comable（项目已依赖 @vueuse/core ^14.3.0，无需新增依赖）。

#### Scenario: 断点状态响应式追踪

- **WHEN** 组件内调用 useBreakpoints 断点定义
- **THEN** 返回的 isMobile / isTablet / isDesktop 等 ref 值随窗口尺寸变化自动更新
- **AND** Layout 组件基于这些 ref 值响应式调整侧边栏和顶栏行为

#### Scenario: 断点变化平滑过渡

- **WHEN** 用户拖拽调整浏览器窗口跨越断点边界
- **THEN** Layout 行为变更伴随 CSS transition 过渡动画
- **AND** 不会出现布局闪跳或内容重叠
