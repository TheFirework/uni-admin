## ADDED Requirements

### Requirement: 404 兜底页面

当用户访问的路由无法匹配任何已注册路由（包括动态路由）时，SHALL 显示友好的 404 错误页面。404 页面 SHALL 在 BasicLayout 内部渲染（保留侧边栏和顶栏），提供返回首页和返回上一步的操作。

#### Scenario: 访问不存在的路由

- **WHEN** 用户在浏览器地址栏输入一个未注册的路径（如 `/nonexistent-page`）
- **THEN** 显示 404 页面，包含:
  - 大号 "404" 数字显示
  - 友好的错误提示文字（如 "抱歉，您访问的页面不存在"）
  - "返回首页" 按钮（跳转 /）
  - "返回上一步" 按钮（history.back()）
- **AND** 侧边栏和顶栏仍然正常显示

#### Scenario: 404 作为 Layout 子路由

- **WHEN** 404 路由被匹配
- **THEN** 它 SHALL 是 BasicLayout 的子路由（嵌套在 Layout 内部）
- **AND** 路由配置为 `{ path: '/:pathMatch(.*)*', component: NotFound }`

---

### Requirement: 403 无权限页面

当路由守卫判定当前用户无权访问目标路由时，SHALL 显示 403 无权限提示页面。

#### Scenario: 权限不足时显示 403

- **WHEN** 路由守卫 Stage 4 检测到用户缺少所需角色/权限
- **THEN** 显示 403 页面，包含:
  - "403" 或锁形图标
  - 提示文字 "抱歉，您没有权限访问此页面"
  - "返回首页" 按钮
  - 可选: "联系管理员" 提示

---

### Requirement: 全局 Loading 骨架屏

在动态路由加载期间（菜单接口请求中），BasicLayout SHALL 显示骨架屏占位，避免白屏体验。

#### Scenario: 动态路由加载中显示骨架屏

- **WHEN** 路由守卫正在请求菜单接口且 isRoutesLoaded = false
- **THEN** BasicLayout 显示 Skeleton 骨架屏
- **AND** 骨架屏模拟侧边栏轮廓 + 顶栏轮廓 + 内容区卡片轮廓
- **AND** 菜单接口返回后骨架屏消失，真实 Layout 渲染

#### Scenario: 骨架屏加载超时

- **WHEN** 骨架屏显示超过 3 秒（菜单接口超时）
- **THEN** 骨架屏区域显示错误提示 "加载失败" 和 "重试" 按钮
- **AND** 点击重试按钮重新发起菜单请求
