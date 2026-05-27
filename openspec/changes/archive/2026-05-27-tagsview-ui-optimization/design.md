## Context

### 当前状态

TagsView 组件位于 `apps/web/src/layouts/components/TagsView/index.vue`，当前实现为传统的「胶囊状标签页」设计：

- 标签使用 `border: 1px solid #d8dce5` + `border-radius: 3px` 形成胶囊外观
- 激活态通过 `:before` 伪元素在顶部绘制 2px 蓝色条 + 浅蓝背景 `#ecf5ff`
- 关闭按钮默认 `opacity: 0`，hover 或激活时淡入
- 标签间通过 `margin-right: 6px` 间距分隔
- 右侧仅有一个下拉操作按钮（显示标签数量）

### 约束条件

- 技术栈：Vue 3 + Element Plus + SCSS
- 必须保持现有功能不变（标签增删、路由联动、keep-alive、右键菜单等）
- 需兼容响应式布局（移动端可能隐藏或简化）
- 不引入新的外部依赖

### 利益相关方

- 前端开发团队（实施与维护）
- 最终用户（操作体验提升）

## Goals / Non-Goals

**Goals:**

1. 将激活标签的视觉风格从「顶部蓝条 + 边框」升级为「浅蓝实心背景」
2. 新增左侧导航快捷按钮组（后退/刷新/首页），提升页面导航效率
3. 激活标签关闭按钮始终可见，降低用户交互认知成本
4. 非激活标签轻量化为文字链接风格，使用竖线分隔符替代间距

**Non-Goals:**

- 不改变标签的核心功能逻辑（打开/切换/关闭/缓存管理）
- 不引入双层标签结构（子功能分类层）
- 不修改标签数据模型或 store 结构
- 不涉及暗色模式适配（预留但不实施）
- 不做拖拽排序功能

## Decisions

### Decision 1: 激活标签采用浅色实心背景

**选择**: `background-color: #e6f0ff` + `color: #409eff` + 无边框

**替代方案对比**:

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. 浅色实心（选中）** | `#e6f0ff` 底 + 蓝字 | 与当前风格接近，柔和过渡 | 对比度略低 |
| B. 深色实心 | `#409eff` 底 + 白字 | 视觉焦点强烈 | 与整体风格跳跃太大 |
| C. 底边线式 | 仅底部蓝色粗线 | 极简 | 信息层次弱 |

**理由**: 选择方案 A 是为了在「现代化升级」和「保持一致性」之间取得平衡。浅色实心比当前的「顶部蓝条+边框」更简洁，又不会像深色实心那样突兀。

---

### Decision 2: 导航按钮组使用 el-tooltip 包裹

**选择**: 每个 `<el-icon>` 外层包裹 `<el-tooltip>`，content 为提示文字

**替代方案对比**:

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. 纯图标 + tooltip（选中）** | 图标 + hover 显示文字 | 最紧凑，信息按需展示 | 新用户需探索 |
| B. 图标 + 文字标签 | 如图片中 `<` 后退 | 直观无需探索 | 占用空间大 |
| C. 下拉菜单整合 | 一个按钮展开三个选项 | 极简 | 操作步骤多 |

**理由**: 方案 A 在紧凑性和可用性间最佳平衡。tooltip 是 Element Plus 原生能力，零额外依赖。

---

### Decision 3: 竖线分隔符的实现方式

**选择**: 使用 CSS `::after` 伪元素或独立的 `<span class="tag-separator">` 元素

**具体方案**: 使用 `span.tag-separator` 元素（非伪元素），便于控制显隐和响应式

```html
<router-link ...>标签1</router-link>
<span class="tag-separator">|</span>
<router-link ...>标签2</router-link>
```

**理由**: 伪元素方式在 v-for 循环中难以精确控制「最后一个标签后不显示分隔符」，使用真实元素配合 `v-if="index < tags.length - 1"` 更可靠。

---

### Decision 4: 导航按钮的事件处理 — redirect 中间页方案

**选择**:
- **后退**: 直接调用 `router.back()`
- **刷新**: 通过 `/redirect` 中间页清除 keep-alive 缓存后重建组件（`router.replace('/redirect' + path)`）
- **首页**: 跳转至第一个 affix 标签或 `/`

**Redirect 路由注册位置**: `/redirect/:path(.*)*` 必须作为 `BasicLayout` 的**子路由**（`protectedRoutes`）注册，而非顶层 `publicRoutes`。原因：
- keep-alive 仅缓存 Layout 内部的 route.name
- 作为子路由时，导航离开目标路由 → keep-alive 销毁缓存 → RedirectView 组件挂载 → replace 回目标路径 → 组件全新重建
- 作为顶层路由时，keep-alive 无法控制其生命周期，导致 replace 导航可能失败

**共享策略**: `handleNavRefresh()`（导航栏刷新按钮）与 `refreshSelectedTag()`（右键菜单刷新）采用完全相同的 `/redirect` 路由策略。

**理由**: 完全复用同一套经过验证的缓存刷新机制，无新逻辑引入，降低风险。

---

### Decision 5: 整体布局结构调整

**当前布局**:
```
[滚动容器 (flex: 1)] [操作区 (固定宽度)]
```

**目标布局**:
```
[导航按钮组 (固定)] [分隔线] [滚动容器 (flex: 1)] [操作区 (固定宽度)]
```

**实现**: 在 `.tags-view-container` 内部，`.tags-scroll-container` 前插入 `.tags-nav-buttons` 区块。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 竖线分隔符在小屏幕下可能导致标签区域过窄 | 中 | 移动端隐藏 TagsView 或改回间距模式（已有 `shouldSimplifyTagsView` 断点） |
| 激活标签实心背景可能与某些自定义主题冲突 | 低 | 使用 CSS 变量或主题色 token，而非硬编码色值 |
| 导航按钮的「刷新」功能依赖 redirect 路由，需确认该路由存在 | 低 | 复用已验证的 refreshSelectedTag 逻辑 |
| 关闭按钮始终显示可能增加视觉噪音 | 低 | 仅激活标签常显，非激活保持 hover 显示 |

## Migration Plan

1. **实施顺序**: A(样式) → C(关闭按钮) → D(轻量化) → B(导航按钮) — 样式改动先行，功能新增最后
2. **验证方式**: 每完成一个优化点进行视觉回归测试
3. **回滚策略**: 单次 Git revert 即可完全恢复，无数据库或配置变更

## Open Questions

（暂无 — 所有设计决策已在 Explore 阶段确认）
