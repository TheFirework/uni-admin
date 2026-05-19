# Route Adapter Delta Spec

## ADDED Requirements

### Requirement: 多模式路由数据源适配

系统 SHALL 支持三种路由数据源模式，通过环境变量 `VITE_ROUTER_MODE` 一键切换：

- **frontend**: 从本地 `.ts` 文件加载静态路由（开发/离线场景）
- **backend**: 从后端 `/system/menus` API 加载动态路由（生产环境）
- **mixed**: 先加载静态基础路由，再用动态路由覆盖（灰度/测试场景）

#### Scenario: Frontend 模式加载静态路由

- **WHEN** `VITE_ROUTER_MODE=frontend`
- **AND** 调用 `RouteAdapter.fetchRoutes()`
- **THEN** 系统 SHALL 使用 Vite glob 自动聚合 `modules/*.ts` 文件
- **AND** 返回 `UniAdminRouteRecord[]` 类型的静态路由数组
- **AND** 控制台输出 `[RouteAdapter] 使用前端静态路由`

#### Scenario: Backend 模式加载 API 路由

- **WHEN** `VITE_ROUTER_MODE=backend`
- **AND** 调用 `RouteAdapter.fetchRoutes()`
- **THEN** 系统 SHALL 调用 `getMenus()` API 获取菜单数据
- **AND** 使用 `generateRoutesFromMenus()` 转换为 `RouteRecordRaw[]`
- **AND** 控制台输出 `[RouteAdapter] 使用后端 API 路由`

#### Scenario: Mixed 模式合并路由

- **WHEN** `VITE_ROUTER_MODE=mixed`
- **AND** 调用 `RouteAdapter.fetchRoutes()`
- **THEN** 系统 SHALL 先加载静态路由作为 base
- **AND** 再加载动态路由作为 override
- **AND** 执行深度合并算法（见下方 Requirement）

#### Scenario: 无效模式降级处理

- **WHEN** `VITE_ROUTER_MODE` 设置为非预期值（如 'invalid'）
- **THEN** 系统 SHALL 输出警告日志
- **AND** 自动降级为 `backend` 模式
- **AND** 继续正常执行

---

### Requirement: 混合模式深度合并算法

MixedAdapter SHALL 实现字段级优先级的深度合并策略，确保静态和动态路由的正确融合。

#### Scenario: 相同 key 的路由执行深度合并

- **WHEN** 静态路由和动态路由存在相同 name 或 path
- **THEN** 系统 SHALL 对 children 进行递归合并
- **AND** 对 meta 字段按优先级矩阵决定取值

#### Scenario: Meta 字段优先级矩阵

系统 SHALL 按以下规则合并 meta 字段：

| 字段类别 | 示例字段 | 优先级 |
|---------|---------|--------|
| **权限类** (DYNAMIC) | access, authority, permission, roles | 🔄 动态优先 |
| **显示类** (DYNAMIC) | title, icon, hidden | 🔄 动态优先 |
| **行为类** (STATIC) | keepAlive, affix, order | 🔵 静态优先 |

#### Scenario: 权限字段标准化

- **WHEN** 合并后的 meta 包含 authority、roles、permission 等遗留字段
- **THEN** 系统 SHALL 统一转换为标准 `access` 字段
- **AND** 删除原始的 authority/roles/permission 字段

#### Scenario: 仅存在于动态的新路由追加

- **WHEN** 动态路由包含静态路由中不存在的路径或名称
- **THEN** 该路由 SHALL 追加到结果数组末尾

---

### Requirement: 路由配置中心

系统 SHALL 提供统一的路由配置管理，通过环境变量注入配置项。

#### Scenario: 配置项定义

RouterConfig 接口 SHALL 包含以下配置项：

```typescript
interface RouterConfig {
  mode: RouterMode;              // 路由模式: 'frontend' | 'backend' | 'mixed'
  cacheEnabled: boolean;         // 是否启用菜单缓存
  cacheTTL: number;             // 缓存过期时间（毫秒），默认 1800000 (30分钟)
  prefetchEnabled: boolean;      // 是否启用悬停预加载
  hoverDelay: number;            // 悬停预加载延迟（毫秒），默认 150
  maxPrefetchCache: number;      // 最大预加载数量，默认 10
}
```

#### Scenario: 配置验证和容错

- **WHEN** 环境变量值缺失或格式错误
- **THEN** 系统 SHALL 使用安全的默认值
- **AND** 在开发环境输出警告日志

#### Scenario: 导出只读单例

- **WHEN** 模块被导入
- **THEN** 导出的 `routerConfig` 对象 SHALL 为只读（Object.freeze）
- **AND** 防止运行时意外修改

---

### Requirement: 扩展路由类型系统

系统 SHALL 定义扩展的路由 Meta 类型，统一字段命名并消除歧义。

#### Scenario: UniAdminRouteMeta 接口

接口 SHALL 包含以下字段分组：

- **基础信息**: title, icon?
- **显示控制**: hidden?, hideInMenu?, hideChildrenInMenu?, hideInTab?, hideInBreadcrumb?
- **权限控制**: access?, ignoreAccess? （支持 string | string[] | 函数）
- **缓存与行为**: keepAlive?, noCache?, affix?, affixTabOrder?
- **排序**: order?, sort?
- **特殊类型**: iframeSrc?, link?, externalLink?, activePath?, query?, noBasicLayout?

#### Scenario: 权限字段标准化函数

- **WHEN** 调用 `normalizeAuthority(meta)`
- **THEN** 函数 SHALL 按 access → authority → permission → roles 优先级查找
- **AND** 返回标准化的 `string | string[] | undefined`
