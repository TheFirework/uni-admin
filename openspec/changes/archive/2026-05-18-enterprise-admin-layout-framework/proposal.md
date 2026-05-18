## Why

当前 uni-admin 前端仅有登录页面和 3 个扁平路由，**缺少企业级管理后台的核心布局基础设施**。用户登录后看到的只是一个空白页面（Dashboard），没有侧边栏导航、没有顶栏、没有标签页、没有面包屑、没有 404 兜底。路由守卫是空壳，Storage 操作散落在各处无统一封装。这导致无法支撑后续业务模块的开发，必须先搭建主框架。

## What Changes

### 新增能力

- **固定可折叠侧边栏**: 基于 Element Plus el-menu，支持无限层级递归渲染，桌面端 240px 展开 / 64px 图标模式折叠，移动端抽屉弹出
- **固定顶部栏**: 包含面包屑导航、Tag 标签页栏、头像下拉/抽屉触发区，始终置顶
- **头像右侧抽屉 (AvatarDrawer)**: 点击头像弹出 el-drawer，内嵌个人中心、设置、退出登录
- **路由嵌套 (Layout)**: 两层嵌套结构 `App.vue → BasicLayout.vue → <router-view>`，Layout 仅包裹需认证页面，Login 页面独立
- **Tag 标签页 (TagsView)**: keep-alive 组件级缓存，支持关闭单个/关闭其他/关闭全部，关闭即销毁实例，标签列表存 sessionStorage
- **响应式布局**: 4 档桌面断点 (xl≥1200 / lg 992-1199 / md 768-991 / sm<768)，使用 @vueuse/core 驱动
- **404 页面**: 未匹配路由兜底，友好 UI 提示，支持返回首页/返回上一步
- **面包屑导航**: 自动读取当前路由 matched 链路的 meta.title 生成，支持点击跳转
- **无限层级动态菜单**: 后端接口返回完整菜单树，前端递归渲染 el-sub-menu / el-menu-item，支持 icon、隐藏、外链等 meta 配置
- **中间件式路由守卫**: 四级守卫链 — 白名单检查 → Token 校验(Storage) → 动态路由生成(懒加载) → 权限校验(meta)
- **生产级 Storage 封装**: 统一工厂入口，泛型约束+默认值兜底+TTL 过期+AES-GCM 加密+容量监控(5MB 预警)+命名空间隔离(前缀 ua:)+自动 JSON 序列化，区分 localStorage(持久)/sessionStorage(临时)
- **views 目录规范**: 约定式组件映射 `views/{module}/[sub]/index.vue`，特殊组件(Layout/404/403/Login)硬编码

### 修改项

- **App.vue**: 从单层 `<router-view />` 改为条件渲染（登录页直出 / Layout 嵌套）
- **router/index.ts**: 重构为静态基础路由 + 动态路由注册机制，移除硬编码受保护路由列表
- **stores/auth.store.ts**: 联动 Storage 封装层进行 Token/用户信息读写，logout 时一键清空关联命名空间
- **api/modules/**: 新增菜单获取接口 (`GET /system/menus` 或 `GET /auth/menus`)
- **main.ts**: 注册新增 Store (menu store / tags store / app store)

### Non-Goals (本次不实现)

- **第三方登录** (GitHub/GitLab/OAuth)
- **多标签页持久化跨刷新保持** (刷新后标签清空，符合后台系统习惯)
- **手机端专门适配** (仅做桌面分辨率响应，不做移动端专属交互)
- **国际化 i18n**
- **暗色模式** (预留接口，本次不实现切换 UI)
- **拖拽排序菜单/标签**

## Capabilities

### New Capabilities

- `admin-layout`: 主布局框架 — BasicLayout 组件及其子组件(Sidebar/Header/TagsView/Breadcrumb/AvatarDrawer)的结构、职责、通信方式
- `dynamic-menu`: 无限层级动态菜单 — 后端菜单数据结构约定、前端递归渲染策略、component 字符串到真实组件的映射机制
- `tags-view`: Tag 标签页 — keep-alive 缓存策略、标签生命周期管理(打开/切换/关闭/销毁)、与路由的联动
- `route-guard`: 中间件式路由守卫 — 守卫链执行流程、白名单配置、Token 校验逻辑、动态路由懒加载触发时机、权限校验规则
- `storage-encapsulation`: 生产级 Storage 封装 — 工厂 API 设计、类型安全方案、TTL/AES-GCM/容量监控/命名空间实现细节、与 Pinia 和路由守卫的联动协议
- `views-convention`: views 目录规范 — 文件组织约定、路径映射规则、特殊组件处理
- `responsive-layout`: 响应式布局 — 断点定义、侧边栏行为变化、@vueuse 集成方式
- `error-page`: 错误页面 — 404/403 页面设计、兜底路由配置

### Modified Capabilities

- `enterprise-login`: 登录成功后的跳转逻辑需要适配新 Layout 结构（从跳转 `/` 改为跳转第一个有效菜单或首页）
- `jwt-auth`: Token 存储从 Store 内存改为通过 Storage 封装层写入 localStorage（加密），登出时通过 Storage 封装层清除

## Impact

### 受影响代码范围

| 区域 | 影响程度 | 说明 |
|------|---------|------|
| `apps/web/src/App.vue` | **重写** | 添加 Layout 条件渲染 |
| `apps/web/src/router/index.ts` | **重写** | 扁平路由 → 嵌套+动态 |
| `apps/web/src/stores/auth.store.ts` | **修改** | 联动 Storage 层 |
| `apps/web/src/main.ts` | **小改** | 注册新 Store |
| `apps/web/src/views/` | **扩展** | 新增 error/、profile/ 目录 |
| `apps/web/api/modules/` | **新增** | 菜单接口 |

### 受影响 API

- **新增**: `GET /system/menus` (或 `GET /auth/menus`) — 返回当前用户的菜单树
- **可能影响**: 登录接口返回值可能需要包含 `defaultRoute` (登录后默认跳转路径)

### 新增依赖

- **零新增运行时依赖**: AES-GCM 使用 Web Crypto API（浏览器原生），响应式使用 @vueuse/core（已依赖）
- **开发依赖**: 无新增

### 回滚计划

如果新框架引入问题：
1. 回退 `router/index.ts` 到原始扁平路由版本
2. 回退 `App.vue` 到原始 `<router-view />` 版本
3. 删除 `layouts/` 目录及相关 Store
4. 系统恢复到"仅有登录页+Dashboard"的可运行状态
