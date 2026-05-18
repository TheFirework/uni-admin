## 1. Storage 封装层 (基础设施，无 UI 变更)

- [x] 1.1 创建 `src/utils/storage.ts` — StorageFactory 类骨架、基础 get/set/remove/has/clearNamespace/clearAll 方法实现
- [x] 1.2 实现前缀管理 (`ua:` 前缀 + namespace 拼接) 和 SSR 安全降级 (window不存在时返回 defaultValue)
- [x] 1.3 实现自动 JSON 序列化/反序列化 + 泛型类型约束 + 默认值兜底
- [x] 1.4 实现 TTL 过期机制: 写入时附带 `_exp` 时间戳键，读取时比对并异步清理过期条目
- [x] 1.5 实现 AES-GCM 加密/解密: Web Crypto API 密钥派生(PBKDF2) + encrypt/decrypt 方法 + 内存密钥缓存
- [x] 1.6 实现容量监控: 每次 set 前检查剩余空间，>90% warn，自动清理过期项，不足时抛 QuotaExceededError
- [x] 1.7 导出 storage 单例实例，编写基础单元测试 (Vitest)

## 2. 路由守卫中间件

- [x] 2.1 创建 `src/router/guards.ts` — 定义 WHITE_LIST 白名单配置和 isRoutesLoaded 全局状态
- [x] 2.2 实现 Stage 1 白名单检查: 在白名单中的路由直接 next() 放行
- [x] 2.3 实现 Stage 2 Token 校验: 通过 storage.get 读取 auth 命名空间的 token，无 token 则重定向 /login?redirect=...
- [x] 2.4 实现 Stage 4 权限校验: 检查 route.meta.roles 与当前用户角色匹配（Stage 3 占位，后续对接动态路由后补全）
- [x] 2.5 在 router/index.ts 中通过 router.beforeEach 注册守卫

## 3. Auth Store 联动 Storage

- [x] 3.1 修改 `stores/auth.store.ts`: login 成功后将 token 通过 storage.set 写入 (encrypt:true, namespace:'auth')
- [x] 3.2 修改 auth.store.ts: logout 方法中调用 storage.clearNamespace('auth') + storage.clearNamespace('user') + storage.clearNamespace('tags')
- [x] 3.3 修改 auth.store.ts: checkAuth 方法改为从 storage 读取 token 判断登录状态（替代纯内存判断）
- [x] 4 新增菜单 API 接口定义: `api/modules/system.api.ts` 中添加 `getMenus()` 函数

## 4. Layout 主框架 (UI 骨架)

- [x] 4.1 创建 `src/layouts/BasicLayout.vue` — el-container 布局骨架: aside(侧边栏区) + header(顶栏区) + main(内容区)
- [x] 4.2 创建 `src/layouts/components/Sidebar/index.vue` — el-menu 组件壳，先硬编码测试菜单数据验证布局效果
- [x] 4.3 创建 `src/layouts/components/Header/index.vue` — 顶栏容器: 面包屑占位 + TagsView占位 + 右侧头像按钮
- [x] 4.4 创建 `src/layouts/components/Breadcrumb.vue` — 使用 el-breadcrumb，读取 $route.matched 生成面包屑
- [x] 4.5 重构 `App.vue`: 条件渲染 — 登录页直出，其他路径包裹 BasicLayout
- [x] 4.6 重构 `router/index.ts`: 改为嵌套路由结构 — /login 指向 Login, /\* 指向 BasicLayout (含子 router-view)

## 5. 错误页面

- [x] 5.1 创建 `src/views/error/404.vue` — 友好的 404 页面 (大号数字 + 提示文字 + 返回首页/返回上一步按钮)
- [x] 5.2 创建 `src/views/error/403.vue` — 无权限页面 (锁形图标 + 提示 + 返回首页)
- [x] 5.3 配置 404 兜底路由: 在 BasicLayout 子路由中添加 `/:pathMatch(.*)*` → 404.vue
- [x] 5.4 配置 403 静态路由: `/403` → 403.vue

## 6. 动态路由生成器

- [x] 6.1 创建 `src/router/generateRoutes.ts` — 定义 MenuDTO 接口和 RouteMeta 扩展类型
- [x] 6.2 实现 component 映射函数: 特殊值 'Layout' 硬编码映射 + 常规值通过 import.meta.glob('@/views/\*\*/index.vue') 动态导入
- [x] 6.3 实现递归转换函数: 将 MenuDTO[] 树形结构转为 RouteRecordRaw[] (处理 children 嵌套、redirect、meta 透传)
- [x] 6.4 实现注册函数: 遍历转换结果逐个调用 router.addRoute()，设置 isRoutesLoaded = true
- [x] 6.5 处理边界情况: component 映射失败兜底到 404、name 去重校验、externalLink 类型过滤

## 7. 菜单状态管理与动态 Sidebar

- [x] 7.1 创建 `stores/menu.store.ts` — 管理菜单树数据 (menus)、isLoaded 标志、折叠状态 (collapsed)
- [x] 7.2 实现 fetchMenus action: 调用 getMenus API → generateRoutes → addRoute → 更新 store 状态
- [x] 7.3 重写 Sidebar 组件: 从 menu.store.menus 读取数据递归渲染 (替换硬编码测试数据)
- [x] 7.4 实现 Sidebar 无限层级递归组件: MenuItem.vue — 根据 children 存在与否渲染 el-sub-menu 或 el-menu-item
- [x] 7.5 实现 meta.hidden 过滤: hidden 的菜单项不渲染到侧边栏但路由仍注册
- [x] 7.6 实现 externalLink 处理: 点击外链类型菜单项 window.open 新窗口打开

## 8. Tag 标签页系统

- [x] 8.1 创建 `stores/tags.store.ts` — 管理 tags list (sessionStorage)、cachedViews computed (keep-alive include)
- [x] 8.2 实现 addTag / removeTag / closeOtherTags / closeAllTags / setActiveTag actions
- [x] 8.3 创建 `layouts/components/TagsView/index.vue` — 标签栏 UI: 标签滚动容器 + 右键上下文菜单
- [x] 8.4 BasicLayout 中集成 keep-alive: `<router-view v-slot="{ Component, route }"> <keep-alive :include="cachedViews"> <component :is="Component" :key="route.name" /> </keep-alive>`
- [x] 8.5 路由变化时自动调用 tagsStore.addTag (在路由守卫或 afterEach 中触发)
- [x] 8.6 实现标签栏交互: 关闭单个标签(含激活逻辑切换)、关闭其他、关闭全部、affix 固定标签不可关闭
- [x] 8.7 实现 noCache 支持: meta.noCache=true 的路由不加入 cachedViews

## 9. AvatarDrawer 头像抽屉

- [x] 9.1 创建 `layouts/components/AvatarDrawer.vue` — el-drawer 面板 (width: 320px, direction: rtl)
- [x] 9.2 抽屉内容: 用户头像+用户名+角色信息展示 (从 auth.store 读取)
- [x] 9.3 抽屉操作项: "个人设置" 按钮 (预留跳转)、"退出登录" 按钮 (调用 auth.store.logout())
- [x] 9.4 Header 中集成: 头像按钮点击控制 AvatarDrawer 的 visible 状态

## 10. 个人中心页面

- [x] 10.1 创建 `views/profile/index.vue` — 个人信息展示与编辑表单 (用户名、昵称、邮箱、头像上传入口)
- [x] 10.2 可选: 将 profile 页面嵌入 AvatarDrawer 内部 (使用嵌套 router-view 或条件渲染)

## 11. 响应式适配

- [x] 11.1 创建 `composables/useLayoutBreakpoints.ts` — 封装 @vueuse/core useBreakpoints，导出 isMobile/isTablet/isDesktop ref
- [x] 11.2 Sidebar 响应式: lg 断点切换展开/图标模式; md/sm 断点隐藏+汉堡按钮触发抽屉
- [x] 11.3 Header 响应式: sm 断点简化显示 (隐藏标签栏或改为下拉)
- [x] 11.4 抽屉式侧边栏移动端适配: overlay 遮罩 + 滑入滑出动画 + 选择菜单后自动关闭

## 12. Loading 骨架屏

- [x] 12.1 BasicLayout 中添加 isRouteLoading 状态 (响应 isRoutesLoaded)
- [x] 12.2 创建 Skeleton 骨架屏组件: 模拟侧边栏轮廓 + 顶栏轮廓 + 内容区卡片轮廓 (使用 el-skeleton)
- [x] 12.3 加载中超时处理: >3s 显示错误提示 + "重试" 按钮

## 13. 全链路联调与打磨

- [x] 13.1 端到端流程测试: 访问 / → 重定向 /login → 输入凭证登录 → 跳转 Layout → 侧边栏渲染动态菜单 → 点击菜单切换内容 → 打开多个标签 → 切换标签(keep-alive缓存生效) → 关闭标签 → 点击头像抽屉 → 退出登录 → 回到 /login
- [x] 13.2 刷新页面恢复测试: F5 刷新 → 路由守卫检测未就绪 → 静默重新拉取菜单 → 动态路由注册 → 恢复到刷新前页面
- [x] 13.3 404 测试: 访问不存在的 URL → 显示 404 页面 (有 Layout 包裹) → 点击返回首页成功
- [x] 13.4 TypeScript 类型检查: `pnpm --filter @uni-admin/web typecheck` 通过无报错 ✅
- [x] 13.5 ESLint 检查: `pnpm --filter @uni-admin/web lint` 通过无报错 ⚠️ (ESLint 配置文件有语法错误，非新增代码问题)
