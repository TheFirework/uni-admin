# Admin Layout Spec

## Purpose

定义企业级管理后台主框架（BasicLayout）的结构、组件职责和布局规范，确保 Layout 系统提供一致的侧边栏、顶栏和内容区体验。

---

## Requirements

### Requirement: BasicLayout 组件结构

BasicLayout SHALL 提供企业级管理后台的主框架布局，包含固定侧边栏、固定顶栏和弹性内容区三个区域。Layout 组件 SHALL 仅在用户已认证的路由中渲染，登录页等公开页面 SHALL 直接渲染不经过 Layout。

#### Scenario: 已认证用户访问受保护路由时显示完整 Layout

- **WHEN** 用户已登录并访问 `/system/user` 等需要认证的路由
- **THEN** 页面 SHALL 显示完整的 Layout 结构：左侧可折叠侧边栏 + 右侧顶栏+内容区
- **AND** 顶栏 SHALL 始终置顶 (position: sticky 或 fixed)
- **AND** 侧边栏 SHALL 可配置为始终可见或可折叠

#### Scenario: 未认证用户访问登录页时不渲染 Layout

- **WHEN** 用户未登录并访问 `/login`
- **THEN** 页面 SHALL 仅渲染 Login 组件，SHALL NOT 显示侧边栏或顶栏
- **AND** App.vue SHALL 根据路由条件决定是否渲染 BasicLayout

---

### Requirement: Sidebar 侧边栏

Sidebar SHALL 基于 Element Plus 的 `el-menu` 组件实现，支持无限层级菜单递归渲染。Sidebar SHALL 支持展开/折叠两种模式，折叠后仅显示图标。

#### Scenario: 侧边栏正常展开状态

- **WHEN** 屏幕宽度 ≥ 1200px 且侧边栏处于展开状态
- **THEN** 侧边栏宽度 SHALL 为 240px
- **AND** 菜单项 SHALL 显示图标 + 文字标题
- **AND** 支持子菜单的展开/收起动画

#### Scenario: 侧边栏折叠为图标模式

- **WHEN** 用户点击折叠按钮或屏幕进入 lg 断点(992-1199px)
- **THEN** 侧边栏宽度 SHALL 缩窄至 64px
- **AND** 菜单项 SHALL 仅显示图标，鼠标 hover 时 tooltip 显示完整标题
- **AND** 折叠动画过渡时间 SHALL 为 0.3s ease

#### Scenario: 无限层级菜单递归渲染

- **WHEN** 后端返回的菜单数据包含多层嵌套 children（如 3 层或更深）
- **THEN** Sidebar SHALL 使用递归组件正确渲染所有层级
- **AND** 每一层级 SHALL 正确使用 el-sub-menu (有子项) 或 el-menu-item (无子项)
- **AND** 菜单层级深度 SHALL 不设硬性上限

#### Scenario: 移动端侧边栏变为抽屉

- **WHEN** 屏幕宽度 < 768px (sm 断点)
- **THEN** 侧边栏默认隐藏，显示汉堡菜单按钮
- **AND** 点击汉堡按钮后侧边栏以全屏覆盖式抽屉弹出
- **AND** 点击遮罩层或选择菜单项后抽屉自动关闭

---

### Requirement: Header 顶部栏

Header SHALL 固定于 Layout 顶部区域，包含面包屑导航、Tag 标签页容器、和右侧操作区（头像触发器）。Header 高度 SHALL 固定，内容区自适应剩余空间。

#### Scenario: Header 区域组成

- **WHEN** BasicLayout 渲染完成
- **THEN** Header SHALL 从上到下包含：面包屑行 + TagsView 标签页栏
- **AND** 面包屑行右侧 SHALL 包含头像下拉/抽屉触发按钮
- **AND** Header 总高度 SHALL 约为 100px (面包屑 40px + 标签栏 40px + 间距)

#### Scenario: Header 固定置顶

- **WHEN** 用户滚动内容区
- **THEN** Header SHALL 始终保持在可视区域顶部
- **AND** 内容区 SHALL 在 Header 下方独立滚动

---

### Requirement: AvatarDrawer 头像抽屉

点击 Header 右上角头像 SHALL 弹出 el-drawer 抽屉面板，包含个人中心信息展示、偏好设置入口、以及退出登录操作。

#### Scenario: 点击头像打开个人中心抽屉

- **WHEN** 用户点击 Header 右上角的头像
- **THEN** 从右侧滑出 Drawer 面板，宽度约 320px
- **AND** 面板内 SHALL 显示当前用户信息（头像、用户名、角色）
- **AND** 提供"个人设置"和"退出登录"两个操作项

#### Scenario: 退出登录联动清空

- **WHEN** 用户在 Drawer 中点击"退出登录"
- **THEN** 调用 auth.store.logout() 执行登出
- **AND** 自动清除 Storage 中 `auth` 和 `user` 命名空间的全部数据
- **AND** 清除 `tags` 命名空间的标签列表
- **AND** 跳转到 `/login` 页面
