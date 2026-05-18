## ADDED Requirements

### Requirement: Tag 标签页基本功能

TagsView SHALL 提供多标签页管理能力。每次用户访问一个新的可缓存页面时，SHALL 自动新增一个标签。标签列表 SHALL 存储在 sessionStorage (`tags` 命名空间)中，关闭浏览器标签后自动清除。

#### Scenario: 访问新页面自动添加标签

- **WHEN** 用户导航到一个新的非隐藏路由页面
- **THEN** TagsView SHALL 自动在该路由的 tags list 中新增一条记录
- **AND** 新增的标签 SHALL 包含: route.name, route.path, route.meta.title, route.query
- **AND** 新增的标签成为当前激活标签（高亮显示）

#### Scenario: 切换标签切换路由

- **WHEN** 用户点击一个非激活状态的标签
- **THEN** 系统 SHALL 执行 router.push({ path: tag.path, query: tag.query })
- **AND** 被点击的标签变为激活状态
- **AND** keep-alive 缓存的对应组件实例恢复显示

#### Scenario: 关闭单个标签

- **WHEN** 用户点击标签上的关闭按钮
- **THEN** 该标签从 tags list 中移除
- **AND** 如果关闭的是当前激活标签，自动激活相邻标签（优先右边，否则左边）
- **AND** 关闭后的标签对应的 keep-alive 缓存实例被销毁

#### Scenario: 关闭其他标签

- **WHEN** 用户右键点击某个标签并选择"关闭其他"
- **THEN** 除当前标签和 affix 标签外的所有标签被关闭
- **AND** affix 标签（如 Dashboard）不可被关闭

#### Scenario: 关闭全部标签

- **WHEN** 用户点击"关闭全部"操作
- **THEN** 除 affix 标签外的所有标签被关闭
- **AND** 自动跳转到 Dashboard（或最后一个 affix 标签）

---

### Requirement: keep-alive 缓存策略

标签页使用 Vue 的 `<keep-alive>` 组件实现页面级缓存。缓存的 key SHALL 使用 route.name（而非 path），以确保动态参数路由的缓存稳定性。

#### Scenario: keep-alive include 列表与标签列表同步

- **WHEN** tags store 中的 tags list 发生变化
- **THEN** computed 属性 cachedViews SHALL 自动更新为当前所有标签的 name 数组
- **AND** `<keep-alive :include="cachedViews">` 自动根据新列表管理缓存

#### Scenario: 关闭标签即销毁缓存

- **WHEN** 一个标签被关闭并从 tags list 中移除
- **THEN** 其 name 从 cachedViews 数组中移除
- **AND** keep-alive 自动销毁该 name 对应的组件实例
- **AND** 下次再次访问该路由时，组件重新执行 onCreate 生命周期

#### Scenario: noCache 标签不缓存

- **WHEN** 路由的 meta.noCache = true
- **THEN** 即使该路由在标签列表中，也 SHALL NOT 被 keep-alive 缓存
- **AND** 每次切换到该标签都重新渲染组件

---

### Requirement: 标签栏 UI 交互

标签栏 SHALL 显示在 Header 内部、面包屑下方。标签支持左右滚动（当标签数量超出容器宽度时），并显示上下文菜单（右键菜单）。

#### Scenario: 标签超出容器宽度时滚动

- **WHEN** 打开的标签数量较多导致总宽度超过标签栏容器
- **THEN** 标签栏 SHALL 出现水平滚动条或左右箭头按钮
- **AND** 当前激活标签自动滚动到可视区域

#### Scenario: 标签右键上下文菜单

- **WHEN** 用户右键点击某个标签
- **THEN** 弹出上下文菜单，包含: "刷新"、"关闭"、"关闭其他"、"关闭全部"
- **AND** 选择"刷新"时重新执行当前路由导航（清除 keep-alive 缓存后重新加载）
