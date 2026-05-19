# Page Loading Transition - Implementation Tasks

## 1. 基础设施层（核心组件与状态管理）

- [ ] 1.1 创建 `src/stores/app.store.ts` — 全局应用状态 Pinia Store
  - 定义 `AppState` 接口（isFullLoading, isRouteLoading, pageLoadType, enabled）
  - 实现 `setFullLoading()` / `setRouteLoading()` / `setPageLoadType()` actions
  - 添加特性开关逻辑：读取 `VITE_PAGE_LOADING` 环境变量控制 enabled 默认值
  - 当 `enabled === false` 时，getter 拦截返回 false

- [ ] 1.2 创建 `src/components/PageLoading.vue` — 全屏 Loading 组件
  - 实现纯文字品牌展示：居中显示 "UniAdmin" 大号文字
  - 实现 CSS 脉冲动画效果（品牌文字呼吸动画 + 三点加载指示器）
  - 支持动态文案切换（通过 prop 或 slot 接收提示文字）
  - 全屏覆盖样式：fixed 定位、z-index: 9999、半透明深色背景
  - 保持组件轻量（<100 行），不依赖额外 UI 库

- [ ] 1.3 修改 `src/main.ts` — 集成页面类型检测逻辑
  - 在 `app.use(router)` 之后、`app.mount('#app')` 之前执行检测
  - 实现 `detectPageLoadType()` 函数：
    - 优先读取 `performance.navigation.type`（type=1 为刷新）
    - 降级检查 `sessionStorage.__uni_admin_init__` 标志位
    - 首次访问时写入 sessionStorage 标志
  - 调用 `appStore.setPageLoadType(检测结果)` 初始化状态

## 2. UI 集成层（条件渲染与状态联动）

- [ ] 2.1 修改 `src/App.vue` — 集成全屏 Loading 条件渲染
  - 导入 `useAppStore` 和 `PageLoading` 组件
  - 在 `<router-view>` 外层添加条件判断：
    - 当 `appStore.isFullLoading === true` 时渲染 `<PageLoading />`
    - 否则正常渲染 `<router-view>`（保持现有的 transition 和 layout 逻辑）
  - 确保 Loading 层级正确（不干扰后续的 BasicLayout 渲染）

- [ ] 2.2 修改 `src/layouts/BasicLayout.vue` — 集成骨架屏 + 移除重复加载
  - 导入 `useAppStore` 和 `LayoutSkeleton` 组件
  - 在 `<el-main class="content-main"> 内部添加条件渲染：
    - 当 `appStore.isRouteLoading === true` 时渲染 `<LayoutSkeleton :model-value="true" />`
    - 否则渲染原有的 `<router-view>` + `<transition>` + `<keep-alive>`
  - **移除** `onMounted()` 中的 `menuStore.fetchMenus()` 调用及其相关 try-catch 逻辑
  - 保留 `onMounted()` 中的 `updateSidebarWidth()` 调用

- [ ] 2.3 修改 `src/router/guards.ts` — 对接 App Store 控制 Loading 状态
  - 在文件顶部导入 `useAppStore`
  - 在 `checkDynamicRoutes()` 函数中：
    - **进入时**（`isRoutesLoaded === false` 分支）：在 `await menuStore.fetchMenus()` 之前调用
      - `appStore.setFullLoading(true)`
      - `appStore.setRouteLoading(true)`
    - **成功完成时**（fetchMenus 之后、return true 之前）调用
      - `appStore.setFullLoading(false)`
      - `appStore.setRouteLoading(false)`
    - **异常捕获时**（catch 块中、next({path: '/login'}) 之前）调用
      - `appStore.setFullLoading(false)` （确保清理）
      - `appStore.setRouteLoading(false)` （确保清理）

## 3. 测试验证与体验优化

- [ ] 3.1 手动测试：页面刷新流程
  - 打开浏览器访问任意受保护页面（如 /dashboard）
  - 按 F5 刷新 → 确认先显示全屏 Loading（"UniAdmin" + 动画）
  - 等待动态路由加载完成 → 确认 Loading 消失，完整后台界面出现
  - 确认过程无白屏闪烁、无布局跳动
  - 控制台确认 loading 状态变化日志符合预期

- [ ] 3.2 手动测试：路由切换流程
  - 登录后点击侧边栏的不同菜单项
  - 确认内容区短暂显示 LayoutSkeleton 骨架屏（侧边栏和顶栏保持可见）
  - 确认目标页面加载完成后骨架屏平滑切换为实际内容
  - 快速连续点击多个菜单 → 确认无重复请求、无 UI 错乱

- [ ] 3.3 手动测试：边界情况与降级
  - 弱网环境（Chrome Network 面板限速 3G）→ 确认 Loading 正常显示和隐藏
  - 直接在地址栏输入受保护 URL 回车 → 确认流程与 F5 一致
  - 访问白名单页面（/login, /404）→ 确认 NOT 显示 Loading
  - 设置 `VITE_PAGE_LOADING=false` 重启 → 确认所有 Loading 功能禁用，行为与改造前一致

- [ ] 3.4 代码质量检查
  - 运行 `pnpm typecheck`（或等效命令）→ 确认无新增 TypeScript 类型错误
  - 运行 `pnpm lint`（或等效命令）→ 确认无新增 ESLint 报错
  - 确认新文件遵循项目现有代码风格（import 顺序、命名规范、注释语言）
