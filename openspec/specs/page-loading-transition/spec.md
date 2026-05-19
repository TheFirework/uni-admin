# Page Loading Transition Spec

## Purpose

定义**混合模式页面加载过渡**系统规范，实现刷新/首访时显示全屏 Loading（品牌文字 + CSS 动画），路由切换时显示骨架屏（复用 LayoutSkeleton），消除白屏问题并提升感知性能。

> **设计理念**: 根据用户操作类型智能选择过渡界面
> - 🔄 **刷新/首访** → 全屏 Loading（用户预期等待）
> - 🔀 **路由切换** → 骨架屏（保持 Layout 结构可见性）

---

## Requirements

### Requirement: Full Screen Loading Display

当页面处于 **刷新（refresh）** 或 **首次访问（initial）** 状态且动态路由尚未加载完成时，系统 SHALL 显示一个全屏 Loading 过渡界面，覆盖整个视口，直到应用初始化完成。

#### Scenario: F5 刷新页面显示全屏 Loading
- **WHEN** 用户按下 F5 或 Cmd+R 刷新页面
- **AND** Vue 应用完成初始化并挂载到 DOM
- **AND** 动态路由（Stage 3）尚未加载完成
- **THEN** 系统 SHALL 显示全屏 Loading 界面，包含 "UniAdmin" 品牌文字和加载动画
- **AND** Loading 界面 SHALL 覆盖整个浏览器视口（z-index 足够高以遮挡所有内容）

#### Scenario: 首次访问显示全屏 Loading
- **WHEN** 用户首次访问应用（直接输入 URL 或从外部链接进入）
- **AND** 应用检测到 `pageLoadType === 'initial'`
- **AND** 动态路由尚未加载完成
- **THEN** 系统 SHALL 显示全屏 Loading 界面
- **AND** Loading 文案可显示 "正在初始化系统..." 以区分刷新场景

#### Scenario: 动态路由加载完成隐藏 Loading
- **WHEN** 路由守卫 Stage 3 (`checkDynamicRoutes`) 成功完成
- **AND** `menuStore.fetchMenus()` 返回结果
- **AND** 所有动态路由已通过 `addRoute()` 注册
- **THEN** 系统 SHALL 立即隐藏全屏 Loading 界面
- **AND** 正常渲染 BasicLayout 和目标页面内容
- **AND** 过渡过程 SHALL 平滑（无突然闪白或跳动）

---

### Requirement: Route Switch Skeleton Display

当用户在已加载的应用内进行 **路由导航**（如点击侧边栏菜单、编程式导航）且目标页面组件尚未就绪时，系统 SHALL 在 BasicLayout 的内容区域显示骨架屏（Skeleton），而非空白或闪烁。

#### Scenario: 点击侧边栏菜单显示骨架屏
- **WHEN** 用户已登录且动态路由已加载完成（`isRoutesLoaded === true`）
- **AND** 用户点击侧边栏的一个菜单项
- **AND** 目标页面组件正在进行懒加载（`import()` 尚未 resolve）
- **THEN** 系统 SHALL 在 BasicLayout 的内容区显示 LayoutSkeleton 骨架屏
- **AND** 侧边栏和顶栏 SHALL 保持可见和可交互（不被骨架屏遮挡）

#### Scenario: 组件加载完成切换到实际内容
- **WHEN** 目标页面的异步组件完成加载
- **AND** Vue Router 准备渲染该组件
- **THEN** 系统 SHALL 用实际页面内容替换骨架屏
- **AND** 替换过程 SHALL 使用 fade 过渡动画（mode="out-in"）
- **AND** 不允许出现布局偏移（layout shift）

#### Scenario: keep-alive 缓存命中不显示骨架屏
- **WHEN** 用户导航到一个已被 keep-alive 缓存的页面
- **AND** 该页面组件实例存在于内存中
- **THEN** 系统 SHALL 直接显示缓存的内容
- **AND** NOT 显示骨架屏（无需等待加载）

---

### Requirement: Global Application State Management

系统 SHALL 提供一个全局的 App Store（Pinia），用于统一管理页面加载相关的 UI 状态，包括全屏 Loading 开关、路由切换 Loading 开关、以及页面加载类型。

#### Scenario: App Store 初始状态
- **WHEN** 应用首次创建 App Store 实例
- **THEN** Store 的初始状态 SHALL 为:
  - `isFullLoading`: `false`
  - `isRouteLoading`: `false`
  - `pageLoadType`: `'navigate'`（默认值，将被 main.ts 覆盖）

#### Scenario: 设置全屏 Loading 状态
- **WHEN** 调用 `appStore.setFullLoading(true)`
- **THEN** `isFullLoading` 状态 SHALL 立即更新为 `true`
- **AND** 所有订阅该状态的组件（如 App.vue） SHALL 响应式重新渲染
- **WHEN** 调用 `appStore.setFullLoading(false)`
- **THEN** `isFullLoading` 状态 SHALL 立即更新为 `false`

#### Scenario: 设置路由切换 Loading 状态
- **WHEN** 调用 `appStore.setRouteLoading(true)`
- **THEN** `isRouteLoading` 状态 SHALL 立即更新为 `true`
- **AND** BasicLayout.vue SHALL 响应式地显示骨架屏
- **WHEN** 调用 `appStore.setRouteLoading(false)`
- **THEN** `isRouteLoading` 状态 SHALL 立即更新为 `false`

#### Scenario: 设置页面加载类型
- **WHEN** 在 `main.ts` 中调用 `appStore.setPageLoadType('refresh')`
- **THEN** `pageLoadType` SHALL 被设置为 `'refresh'`
- **AND** 该值在整个会话生命周期内保持不变（除非手动修改）

---

### Requirement: Page Load Type Detection

系统 SHALL 在应用启动时（main.ts）自动检测当前页面加载的类型，并将检测结果写入 App Store，用于决定显示哪种类型的 Loading 界面。

#### Scenario: 检测到页面刷新
- **WHEN** 用户通过 F5、Cmd+R 或浏览器刷新按钮重新加载页面
- **AND** `performance.navigation.type === 1`（或者 sessionStorage 存在初始化标志）
- **THEN** 系统 SHALL 设置 `appStore.pageLoadType === 'refresh'`

#### Scenario: 检测到首次访问
- **WHEN** 用户首次访问应用（新标签页、直接输入 URL）
- **AND** `performance.navigation.type === 0`（或者 sessionStorage 不存在初始化标志）
- **THEN** 系统 SHALL 设置 `appStore.pageLoadType === 'initial'`
- **AND** 同时在 sessionStorage 中写入 `__uni_admin_init__ = '1'` 作为后续刷新的检测依据

#### Scenario: Performance API 不可用的降级处理
- **WHEN** `performance.navigation` API 抛出异常或返回 undefined（隐私模式/旧浏览器）
- **THEN** 系统 SHALL 降级使用 sessionStorage 检测方式
- **AND** 如果 sessionStorage 中存在 `__uni_admin_init__` 标志，判定为 `'refresh'`
- **AND** 否则判定为 `'initial'` 并写入标志

---

### Requirement: Feature Toggle Support

App Store SHALL 提供一个特性开关（feature toggle），允许通过环境变量 `VITE_PAGE_LOADING` 禁用整个页面加载过渡功能，用于紧急回退或 A/B 测试。

#### Scenario: 通过环境变量禁用 Loading 功能
- **WHEN** 环境变量 `VITE_PAGE_LOADING` 被设置为 `'false'`
- **THEN** App Store 的 `enabled` 状态 SHALL 为 `false`
- **AND** `isFullLoading` 和 `isRouteLoading` SHALL 始终返回 `false`
- **AND** 所有 Loading/Skeleton 相关的渲染逻辑 SHALL 被跳过
- **AND** 应用行为 SHALL 与改造前完全一致（无过渡界面）

#### Scenario: 默认启用 Loading 功能
- **WHEN** 环境变量 `VITE_PAGE_LOADING` 未定义或设置为其他值
- **THEN** App Store 的 `enabled` 状态 SHALL 为 `true`（默认启用）
- **AND** 所有 Loading 过渡功能 SHALL 正常工作
