## Why

当前 uni-admin 系统在 **F5 刷新页面** 或 **首次访问** 时，存在明显的 **白屏问题**：从浏览器开始加载 JS 资源到 Vue Router 完成动态路由注册（Stage 3: `fetchMenus()` → `generateRoutes()` → `addRoute()`），用户面对的是完全空白的页面，体验时长约 500ms-2s（取决于网络环境和菜单数据量）。同时，普通路由切换（如点击侧边栏菜单）也存在组件懒加载导致的短暂闪烁，缺乏平滑的过渡反馈。

**核心目标**：实现"混合模式"加载过渡界面——刷新/首访时显示全屏 Loading（纯文字 + 动画），路由切换时显示骨架屏（保持 Layout 结构轮廓），消除白屏并提升感知性能。

---

## What Changes

### 新增功能

1. **全屏 PageLoading 组件** (`src/components/PageLoading.vue`)
   - 居中显示 "UniAdmin" 品牌文字
   - CSS 动画效果（脉冲/渐变）
   - 可选的进度提示文字（如"正在加载资源..."、"正在初始化路由..."）

2. **全局应用状态管理** (`src/stores/app.store.ts`)
   - `isFullLoading`: 全屏 Loading 显示状态（布尔值）
   - `isRouteLoading`: 路由切换骨架屏显示状态（布尔值）
   - `pageLoadType`: 页面加载类型枚举（`'initial' | 'refresh' | 'navigate'`）
   - 提供 `setFullLoading()` / `setRouteLoading()` / `setPageLoadType()` 等 action

3. **页面刷新检测机制** (`src/main.ts` 增强)
   - 应用初始化时通过 `performance.navigation.type` 或 session 标志检测是否为刷新/首访
   - 将检测结果写入 `appStore.pageLoadType`

### 修改文件

4. **App.vue 集成全屏 Loading**
   - 当 `appStore.isFullLoading === true` 时，渲染 `<PageLoading />` 覆盖层
   - Loading 结束后切换为正常的 `<router-view>` 渲染

5. **BasicLayout.vue 集成骨架屏**
   - 在内容区 `<router-view>` 位置增加条件判断
   - 当 `appStore.isRouteLoading === true` 时，渲染已有的 `<LayoutSkeleton />`
   - 否则正常渲染路由组件

6. **Router Guards 对接 App Store**
   - Stage 3 开始前设置 `appStore.setFullLoading(true)` 和 `appStore.setRouteLoading(true)`
   - `fetchMenus()` 完成后设置两者为 `false`
   - 移除 BasicLayout.vue 中 `onMounted` 里的重复 `fetchMenus()` 调用（避免竞态）

---

## Capabilities

### New Capabilities

- **page-loading-transition**: 页面加载过渡界面系统，涵盖：
  - 全屏 Loading 组件（品牌文字 + CSS 动画）
  - 路由切换骨架屏集成（复用已有 LayoutSkeleton）
  - 全局应用状态管理（app store）
  - 页面刷新检测与场景区分逻辑
  - 路由守卫与 loading 状态的联动控制

### Modified Capabilities

- **route-guard**: 路由守卫的 Stage 3（动态路由就绪检查）需要增加对 app store 的状态读写操作，在 `checkDynamicRoutes()` 前后分别设置/清除 loading 标志。这不改变守卫的核心校验逻辑，仅增强其副作用（side-effect）。

---

## Impact

### 受影响的代码模块

| 模块 | 文件路径 | 变更类型 |
|------|---------|---------|
| 全局入口 | `apps/web/src/main.ts` | 修改（增加初始化逻辑） |
| 根组件 | `apps/web/src/App.vue` | 修改（条件渲染） |
| 布局组件 | `apps/web/src/layouts/BasicLayout.vue` | 修改（骨架屏集成） |
| 路由守卫 | `apps/web/src/router/guards.ts` | 修改（状态对接） |
| 状态管理 | `apps/web/src/stores/menu.store.ts` | 间接影响（移除重复调用） |

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `apps/web/src/components/PageLoading.vue` | 全屏 Loading 组件 |
| `apps/web/src/stores/app.store.ts` | 全局应用状态 Store |

### 复用资源

| 文件路径 | 复用方式 |
|---------|---------|
| `apps/web/src/layouts/components/LayoutSkeleton.vue` | 已有骨架屏组件，直接引入使用，无需修改 |

### 依赖变更

- **无新增外部依赖**：纯文字 Loading 使用原生 CSS 动画实现，无需额外 UI 库
- **内部依赖**：依赖 Pinia（已存在）、Vue Router（已存在）、Element Plus 的 Skeleton 组件（已在 LayoutSkeleton 中使用）

### 回滚策略

每个阶段完成后建议打 git tag：

```bash
# 回滚命令示例
git tag -a v1.0.0-page-loading -m "完成页面加载过渡功能"
git tag -a v1.0.0-pre-page-loading -m "功能前的快照"

# 紧急回滚
git checkout v1.0.0-pre-page-loading -- \
  src/App.vue \
  src/main.ts \
  src/layouts/BasicLayout.vue \
  src/router/guards.ts
# 删除新增文件
rm src/components/PageLoading.vue
rm src/stores/app.store.ts
```

**特性开关预留**：在 `app.store.ts` 中预留 `enabled` 配置项，设置为 `false` 可立即禁用所有 loading 过渡效果，恢复到改造前的行为。
