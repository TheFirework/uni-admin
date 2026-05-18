## ADDED Requirements

### Requirement: 后端菜单数据结构

前端 SHALL 定义标准的 MenuDTO 接口作为与后端菜单接口的契约。后端返回的菜单数据 SHALL 包含路由所需的所有信息：路径、组件映射、元信息、排序权重、子菜单树。

#### Scenario: 后端返回标准格式的菜单树

- **WHEN** 前端调用 `GET /system/menus` 接口（携带有效 Token）
- **THEN** 后端 SHALL 返回 JSON 数组，每个元素符合 MenuDTO 结构
- **AND** 每个菜单项 SHALL 包含: id, name, path, component, meta(含 title/icon), sort, children(可选)
- **AND** children 数组 SHALL 支持任意层级的嵌套（无限层级）
- **AND** 返回的菜单树 SHALL 根据当前用户角色过滤（仅返回有权限的菜单）

#### Scenario: 特殊 component 值处理

- **WHEN** 菜单项的 component 字段值为 `'Layout'`
- **THEN** 前端 SHALL 将其映射到 `@/layouts/BasicLayout.vue` 组件
- **WHEN** 菜单项的 component 字段值为常规路径如 `'system/user/index'`
- **THEN** 前端 SHALL 将其映射到 `@/views/system/user/index.vue` 组件

---

### Requirement: 动态路由生成

前端 SHALL 实现 `generateRoutes(menuData: MenuDTO[])` 函数，将后端返回的菜单数据转换为 Vue Router 的 RouteRecordRaw 数组，并通过 `router.addRoute()` 动态注册。

#### Scenario: 登录成功后动态注册路由

- **WHEN** 用户登录成功且获得菜单数据
- **THEN** 前端 SHALL 调用 generateRoutes() 将菜单数组转换为路由配置
- **AND** 对转换后的每个路由调用 router.addRoute() 注册
- **AND** 设置 isRoutesLoaded = true 标记动态路由就绪
- **AND** 跳转后端指定的 defaultRoute 或第一个有效菜单路径

#### Scenario: 页面刷新后恢复动态路由

- **WHEN** 用户刷新浏览器页面且已登录（Storage 中有有效 Token）
- **THEN** 路由守卫检测到 isRoutesLoaded = false
- **AND** 守卫 SHALL 重新请求菜单接口获取最新菜单数据
- **AND** 重新执行 generateRoutes() + addRoute()
- **AND** 使用 next({ ...to, replace: true }) 重新导航到目标路由

#### Scenario: Component 映射失败兜底

- **WHEN** 后端返回的 component 路径在 views 目录中不存在对应文件
- **THEN** 该菜单项 SHALL 映射到 NotFound/404 兜底组件
- **AND** 控制台输出 WARNING 日志提示映射失败的路径

#### Scenario: 菜单项隐藏但路由仍存在

- **WHEN** 菜单项 meta.hidden = true
- **THEN** 该菜单项 SHALL NOT 在侧边栏中显示
- **AND** 但对应的路由 SHALL 仍然被注册（用户可通过直接 URL 访问）

---

### Requirement: 菜单外部链接支持

当菜单项配置了 externalLink 时，该菜单项 SHALL 在新窗口打开外部链接，而不是进行内部路由导航。

#### Scenario: 点击外链类型菜单项

- **WHEN** 用户点击 meta.externalLink 有值的菜单项
- **THEN** 系统 SHALL 使用 window.open(url, '_blank') 打开外部链接
- **AND** SHALL NOT 触发 vue-router 导航
