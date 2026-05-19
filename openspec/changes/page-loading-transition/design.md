## Context

### 当前状态

uni-admin 已完成企业级后台主框架搭建（参见 `enterprise-admin-layout-framework` 变更），包括完整的 Layout 体系、动态路由系统和四级路由守卫链。当前存在以下问题：

1. **白屏问题**：F5 刷新或首次访问时，从 JS 加载到动态路由注册完成期间（Stage 3: `fetchMenus()`），用户面对完全空白的页面
2. **无过渡反馈**：普通路由切换时组件懒加载导致短暂闪烁，缺乏平滑的视觉过渡
3. **资源闲置**：已有的 [LayoutSkeleton.vue](file:///Users/jiangbo/code/AI/uni-admin/apps/web/src/layouts/components/LayoutSkeleton.vue) 骨架屏组件未被任何地方引用使用
4. **重复加载风险**：[guards.ts](file:///Users/jiangbo/code/AI/uni-admin/apps/web/src/router/guards.ts) Stage 3 和 [BasicLayout.vue onMounted()](file:///Users/jiangbo/code/AI/uni-admin/apps/web/src/layouts/BasicLayout.vue#L66-L78) 都会调用 `fetchMenus()`，可能产生竞态

### 技术约束

- 前端技术栈: Vue 3.4 + Element Plus 2.5 + Pinia + Vue Router 4.2 + TypeScript 5.3 + Vite 5
- 已有依赖: @vueuse/core ^14.3.0, @iconify/vue ^5.0.1
- 现有骨架屏组件基于 Element Plus `<el-skeleton>` 实现

---

## Goals / Non-Goals

**Goals:**

1. 实现混合模式加载过渡界面——刷新/首访显示全屏 Loading（纯文字 "UniAdmin" + CSS 动画），路由切换显示骨架屏（复用已有 LayoutSkeleton）
2. 建立全局应用状态管理（app store），统一控制 loading 状态
3. 实现页面刷新检测机制，区分三种场景（initial / refresh / navigate）
4. 消除路由守卫与 BasicLayout 之间的重复加载调用
5. 提供特性开关支持紧急回退

**Non-Goals:**

1. ❌ 不实现 Service Worker 离线缓存 — 复杂度过高，L2 Storage 缓存已在 smart-router-system 变更中规划
2. ❌ 不引入额外的 UI 库依赖 — 全屏 Loading 使用纯 CSS 动画实现
3. ❌ 不改变路由守卫的核心校验逻辑 — 仅增加副作用（状态读写），不影响白名单/Token/权限检查流程
4. ❌ 不实现加载进度百分比 — 动态路由加载是离散步骤，精确进度难以估算且增加复杂度

---

## Decisions

### 决策 1: 状态管理方案 — 独立 App Store

**选择**: 创建独立的 `app.store.ts`（Pinia Store），而非扩展现有的 `menu.store.ts`

**理由**:
- **单一职责**: menu store 专注菜单数据管理，app store 专注全局 UI 状态，边界清晰
- **解耦合**: loading 状态不仅服务于路由加载，未来可能扩展到其他全局场景（如全局错误提示）
- **避免循环依赖**: 如果在 guards.ts 中 import menu store 来设置 loading，而 menu store 又依赖 router，容易形成循环引用

**替代方案对比**:

| 方案 | 优点 | 缺点 | 决定 |
|------|------|------|------|
| 扩展 menu.store.ts | 减少文件数量 | 职责混乱、menu store 膨胀 | ❌ |
| 使用 provide/inject | 无需 Store | 非响应式、调试困难 | ❌ |
| **独立 app.store.ts ✅** | 职责清晰、可扩展 | 多一个文件 | ✅ |

**Store 结构设计**:
```typescript
interface AppState {
  isFullLoading: boolean;      // 全屏 Loading 显示状态
  isRouteLoading: boolean;     // 路由切换骨架屏状态
  pageLoadType: 'initial' | 'refresh' | 'navigate';  // 页面加载类型
}
```

---

### 决策 2: 页面刷新检测策略 — Session 标志位

**选择**: 在 `main.ts` 初始化时通过 `sessionStorage` 设置一次性标志位，结合 `performance.navigation.type` 判断

**检测逻辑**:
```typescript
// main.ts 中执行一次
const navType = performance?.navigation?.type;
// 1 = 刷新, 0 = 首次访问, 2 = 前进/后退
const loadType = navType === 1 ? 'refresh' : 'initial';

// 写入 session 标志（刷新后仍保留）
sessionStorage.setItem('__uni_admin_init__', '1');
appStore.setPageLoadType(loadType);
```

**为什么不用其他方法?**

| 方法 | 可靠性 | 说明 |
|------|--------|------|
| `performance.navigation.type` | ⚠️ 中等 | 部分浏览器兼容性问题，需降级处理 |
| `sessionStorage` 标志位 | ✅ 高 | 首访设置 → 刷新保留 → 关闭标签清除 |
| `beforeunload` 事件 | ❌ 低 | 无法区分刷新和关闭标签页 |
| **组合策略 (推荐)** | ✅✅ 最高 | 先尝试 performance API，失败则 fallback 到 sessionStorage |

---

### 决策 3: 全屏 Loading 组件设计 — 纯 CSS 动画

**选择**: 不使用 Element Plus 的 `<el-loading>` 或第三方 spinner，而是手写轻量级 CSS 动画

**视觉设计**:
```
┌────────────────────────────────────┐
│                                    │
│            UniAdmin                │     ← 品牌文字（大号、居中）
│                                    │
│         ○ ○ ○  加载中...           │     ← 脉冲动画点 + 提示文字
│                                    │
└────────────────────────────────────┘
```

**动画效果**:
- **品牌文字**: 淡入淡出呼吸效果（opacity 0.5 ↔ 1.0，周期 2s）
- **脉冲点**: 三个圆点依次缩放动画（staggered scale，周期 1.5s）
- **提示文字**: 渐变切换不同阶段文案（"正在加载资源..." / "正在初始化系统..."）

**为什么不用 el-loading?**
- `<el-loading>` 是指令式 API（v-loading），适合局部遮罩，不适合全屏覆盖
- 自定义程度受限，无法实现品牌化设计
- 包裹元素需要 relative 定位，增加 DOM 层级复杂性

---

### 决策 4: 骨架屏集成位置 — BasicLayout 内容区

**选择**: 将 LayoutSkeleton 放置在 BasicLayout.vue 的 `<router-view>` 位置作为条件渲染

**渲染逻辑**:
```vue
<!-- BasicLayout.vue 内容区 -->
<el-main class="content-main">
  <!-- 路由切换时显示骨架屏 -->
  <LayoutSkeleton v-if="appStore.isRouteLoading" />

  <!-- 正常渲染路由组件 -->
  <router-view v-else v-slot="{ Component, route }">
    <transition name="fade-transform" mode="out-in">
      <keep-alive :include="cachedViews">
        <component :is="Component" :key="route.name" />
      </keep-alive>
    </transition>
  </router-view>
</el-main>
```

**为什么不在 App.vue 层面做?**
- App.vue 层面的骨架屏需要模拟整个 Layout 结构（侧边栏+顶栏+内容区），而 LayoutSkeleton 已经实现了这个结构
- 在 BasicLayout 内部渲染可以保持侧边栏和顶栏始终可见（它们不参与骨架屏切换），用户感知更自然
- 符合"路由切换仅内容区变化"的用户心智模型

---

### 决策 5: 竞态问题解决 — Guards 唯一入口

**选择**: 移除 BasicLayout.vue `onMounted()` 中的 `fetchMenus()` 调用，让路由守卫成为唯一的数据加载入口

**当前问题**:
```
时间线:
t=0ms   ──→ beforeEach 触发 → Stage 3: fetchMenus() 开始
t=?ms   ──→ BasicLayout onMounted → fetchMenus() 再次调用 ⚠️ 重复!
t=end  ──→ 两次 fetchMenus 竞争完成
```

**修复后**:
```
时间线:
t=0ms   ──→ beforeEach 触发 → Stage 3: fetchMenus() 开始
         │   ├── 设置 appStore.isFullLoading = true
         │   ├── 设置 appStore.isRouteLoading = true
         │   └── await menuStore.fetchMenus()
t=end  ──→ fetchMenus 完成
         │   ├── 设置 appStore.isFullLoading = false
         │   ├── 设置 appStore.isRouteLoading = false
         │   └── next() 放行 → BasicLayout 渲染（此时数据已就绪）
t>+1    ──→ BasicLayout onMounted → 检测到 isLoaded=true，跳过 ✅
```

**风险缓解**: 即使极端情况下 onMounted 先于守卫执行（理论上不可能，因为守卫阻塞了路由进入），menu store 内部的 `if (this.isLoaded) return` 防护也会阻止重复请求。

---

## Risks / Trade-offs

### 风险 1: 全屏 Loading 与白屏的界限模糊

**问题**: 如果全屏 Loading 本身的 JS/CSS 加载延迟较大，用户仍然会看到短暂白屏

**缓解措施**:
- PageLoading 组件代码量极小（<100行），会被 Vite 打包到主 chunk 或 async chunk 中
- 使用内联关键 CSS（critical CSS）确保样式即时生效
- HTML 骨架屏兜底：在 `index.html` 的 `#app` 中预埋一个静态的 loading 占位符，Vue mount 后替换

**权衡**: 对于现代浏览器和合理网络条件（<3s RTT），Loading 组件加载时间可忽略不计。极端弱网场景可通过后续 Service Worker 缓存解决。

---

### 风险 2: 性能导航（Performance Navigation API）兼容性

**问题**: `performance.navigation.type` 在部分旧浏览器或隐私模式下可能不可用

**缓解措施**:
```typescript
function detectPageLoadType(): 'initial' | 'refresh' {
  try {
    const type = performance?.navigation?.type;
    if (type === 1) return 'refresh';
  } catch {
    // 忽略错误
  }

  // Fallback: 检查 session 标志
  if (sessionStorage.getItem('__uni_admin_init__')) {
    return 'refresh';
  }
  sessionStorage.setItem('__uni_admin_init__', '1');
  return 'initial';
}
```

**权衡**: SessionStorage fallback 覆盖 99%+ 场景，边缘 case（禁用 sessionStorage）退化为 `initial` 类型，功能不受影响。

---

### 风险 3: Loading 状态未及时清理导致的 UI 卡死

**问题**: 如果 `fetchMenus()` 抛出异常但未被正确 catch，loading 状态可能永远为 `true`，页面卡在全屏 Loading

**缓解措施**:
- guards.ts 中 Stage 3 已有 try-catch，异常时会重定向到登录页
- 在 catch 块中显式设置 `appStore.setFullLoading(false)` 和 `setRouteLoading(false)`
- 可选：添加超时自动清理（如 10s 后强制关闭 loading 并显示错误提示）

**权衡**: 当前的 try-catch + 重定向机制已足够健壮，超时清理作为可选增强项。

---

### 风险 4: 路由切换闪烁（骨架屏 vs 实际内容）

**问题**: 骨架屏与实际内容之间的切换可能出现视觉跳跃（layout shift）

**缓解措施**:
- LayoutSkeleton 的布局结构与真实 BasicLayout 保持一致（侧边栏宽度、顶栏高度、内容区间距）
- 使用 CSS transition 平滑过渡（opacity 或 fade 效果）
- 避免骨架屏和实际内容的尺寸差异

**权衡**: 已有的 LayoutSkeleton.vue 已经按照真实布局尺寸设计，闪烁风险较低。

---

## Migration Plan

### 阶段划分（共 3 个阶段，预计 1-2 天）

#### 阶段 1: 基础设施层（0.5 天）

**目标**: 创建核心组件和状态管理，不影响现有功能

1. 创建 `src/stores/app.store.ts` — 全局应用状态 Store
2. 创建 `src/components/PageLoading.vue` — 全屏 Loading 组件
3. 修改 `src/main.ts` — 集成页面类型检测逻辑

**验证标准**:
- [ ] TypeScript 编译通过
- [ ] `pnpm dev` 启动正常，控制台输出正确的 pageLoadType
- [ ] 现有功能不受影响（登录、菜单展示、路由跳转均正常）

---

#### 阶段 2: 集成层（0.5 天）

**目标**: 将 Loading/Skeleton 集成到 App.vue、BasicLayout.vue、guards.ts

4. 修改 `src/App.vue` — 条件渲染 PageLoading
5. 修改 `src/layouts/BasicLayout.vue` — 条件渲染 LayoutSkeleton + 移除重复 fetchMenus
6. 修改 `src/router/guards.ts` — 对接 app store 控制状态

**验证标准**:
- [ ] F5 刷新后先显示全屏 Loading，再切换到完整后台界面
- [ ] 点击侧边栏菜单时内容区显示骨架屏，再切换到目标页面
- [ ] 控制台无重复的 fetchMenus 调用日志
- [ ] 直接访问 URL（非刷新）正常工作

---

#### 阶段 3: 测试与优化（0.5 天）

**目标**: 边界情况测试和体验打磨

7. 手动测试边界情况:
   - 弱网环境下的 Loading 表现
   - 快速连续点击菜单的去重效果
   - 登录后的首次加载流程
   - 错误场景（网络断开、API 500）
8. 可选优化:
   - Loading 超时提示（>5s 显示重试按钮）
   - 不同加载阶段的文案切换

**验证标准**:
- [ ] 所有测试用例通过
- [ ] ESLint + TypeScript 检查无新增报错
- [ ] 用户感知加载时间明显改善（主观评估）

---

### 回滚策略

每个阶段完成后建议打 git tag：

```bash
git tag -a v1.0.0-page-loading-phase1 -m "完成阶段1: 基础设施"
git tag -a v1.0.0-page-loading-phase2 -m "完成阶段2: 集成层"
git tag -a v1.0.0-page-loading-phase3 -m "完成阶段3: 测试优化"
```

**紧急回滚命令**:
```bash
# 回滚到阶段1之前的状态
git checkout v1.0.0-pre-page-loading -- \
  src/App.vue \
  src/main.ts \
  src/layouts/BasicLayout.vue \
  src/router/guards.ts

# 删除新增文件
rm -f src/components/PageLoading.vue
rm -f src/stores/app.store.ts
```

**特性开关（紧急兜底）**:
在 `app.store.ts` 中预留配置项：
```typescript
export const useAppStore = defineStore('app', {
  state: () => ({
    enabled: import.meta.env.VITE_PAGE_LOADING !== 'false',  // 默认开启
    // ... 其他状态
  }),
});
```
设置 `VITE_PAGE_LOADING=false` 可立即禁用所有 loading 过渡效果。

---

## Open Questions

1. **Loading 文案的多语言支持**: 当前是否需要 i18n？如果需要，文案如何管理（Vue I18n 还是简单的配置对象）？
2. **超时阈值设定**: 全屏 Loading 超时后是否显示重试按钮？超时时间设为多少合适（3s / 5s / 10s）？
3. **与 smart-router-system 变更的交互**: 该变更完成后，L2 缓存命中时 loading 时间将显著缩短（<100ms），是否需要在此时跳过全屏 Loading 直接显示骨架屏？
