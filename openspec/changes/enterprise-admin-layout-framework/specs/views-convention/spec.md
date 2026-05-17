## ADDED Requirements

### Requirement: views 目录组织规范

views 目录 SHALL 采用模块化的目录组织方式。每个业务模块一个目录，入口文件统一命名为 index.vue，模块内部的私有子组件放在 components 子目录。

#### Scenario: 标准模块目录结构

- **WHEN** 创建新的业务模块 "系统管理 → 角色管理"
- **THEN** 目录结构 SHALL 为:
  ```
  views/system/role/
  ├── index.vue          # 模块入口（必须）
  └── components/        # 模块私有子组件（可选）
      ├── RoleForm.vue
      └── RoleTable.vue
  ```

#### Scenario: 入口文件命名约定

- **WHEN** 后端菜单数据的 component 字段值为 `"system/role"`
- **THEN** 前端动态导入的目标文件 SHALL 为 `views/system/role/index.vue`
- **AND** 目录内允许存在额外的非入口 .vue 文件（如 components/ 下的子组件）

---

### Requirement: Component 路径映射规则

后端菜单 DTO 的 component 字段值 SHALL 与 views 目录下的文件路径建立一一映射关系。映射规则 SHALL 统一且可预测。

#### Scenario: 标准路径映射

- **WHEN** component = `"dashboard"`
- **THEN** 映射到 `@/views/dashboard/index.vue`
- **WHEN** component = `"monitor/log"`
- **THEN** 映射到 `@/views/monitor/log/index.vue`

#### Scenario: 特殊组件不走映射

- **WHEN** component = `"Layout"`
- **THEN** 映射到硬编码的 `@/layouts/BasicLayout.vue`（不在 views 目录下）
- **WHEN** 路由是 404/403/Login
- **THEN** 使用各自独立的硬编码组件引用

#### Scenario: 映射失败时的降级

- **WHEN** component 指向的文件在 views 目录中不存在
- **THEN** 降级映射到 404 兜底组件
- **AND** 控制台输出 WARNING: `[Router] Component mapping failed: {path}`

---

### Requirement: 特殊目录说明

以下目录有特殊的渲染规则，不属于动态菜单映射范围：

| 目录 | 用途 | 路由归属 |
|------|------|---------|
| `login/` | 登录页面 | 静态路由，独立于 Layout |
| `error/404.vue` | 404 兜底页面 | Layout 内的通配符子路由 |
| `error/403.vue` | 403 无权限页面 | Layout 内的静态子路由 |
| `profile/` | 个人中心 | 嵌入在 AvatarDrawer 中，非独立路由 |

#### Scenario: 特殊目录不被动态路由覆盖

- **WHEN** 动态路由生成器遍历后端返回的菜单数据
- **THEN** 生成器 SHALL NOT 修改或覆盖上述特殊目录对应的静态路由配置
- **AND** 404 路由 SHALL 作为最后一条通配符路由确保兜底
