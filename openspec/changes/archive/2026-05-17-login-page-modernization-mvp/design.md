## Context

### 当前状态分析

登录页面位于 `apps/web/src/views/login/` 目录下，采用组件化架构：

```
login/
├── index.vue              # 页面主组件（状态管理、API 协调）
└── components/
    ├── LoginCard.vue      # 核心登录表单组件 ⭐ 主要修改对象
    ├── BrandSection.vue   # 左侧品牌展示区（无需修改）
    ├── CaptchaInput.vue   # 验证码输入组件（需适配 clearable）
    └── RememberMe.vue     # 记住我复选框（无需修改）
```

**LoginCard.vue 当前实现特点：**
- 使用 VeeValidate 3.x + Zod 进行表单验证
- Element Plus `el-input` 组件作为输入框基础
- 密码框已支持 `show-password` 属性（可切换显示/隐藏）
- 错误处理通过 `ElMessage.warning()` 全局弹窗展示
- 样式使用 SCSS + 已有的设计变量系统（`_variables.scss`）

**技术约束：**
- 必须保持与 Vue 3 Composition API 兼容
- 不能破坏现有的表单验证逻辑（VeeValidate 集成）
- 需要遵循项目已有的代码规范（ESLint + Prettier）
- 样式修改应优先复用 `_variables.scss` 中的变量

**利益相关者：**
- 内部管理系统用户（管理员、运营人员）- 每日高频使用登录功能
- 前端开发团队 - 负责实施和维护
- QA 团队 - 需要覆盖多设备测试场景

## Goals / Non-Goals

**Goals:**

1. ✅ **提升输入效率**：通过清空图标让用户快速重置输入内容，减少手动删除操作时间
2. ✅ **增强视觉反馈**：聚焦效果提供清晰的状态指示，降低用户操作不确定性
3. ✅ **优化移动端体验**：响应式细节确保在手机/平板上也能舒适地完成登录
4. ✅ **提高键盘可访问性**：快捷键支持满足效率用户需求，同时符合无障碍标准
5. ✅ **改善错误信息可读性**：混合模式让字段级错误更精准定位，API 错误不被遮挡

**Non-Goals（明确不在此范围）：**

- ❌ 不重构整体布局结构（左右分栏保持不变）
- ❌ 不引入新的第三方 UI 库（仅使用 Element Plus 原生能力）
- ❌ 不实现浮动标签动画（Floating Label）- 计划第二轮迭代
- ❌ 不修改后端 API 或认证流程
- ❌ 不添加新的表单字段或业务逻辑
- ❌ 不实现暗色模式或多主题切换

## Decisions

### 决策 1：清空图标实现方案

**选择：** 使用 Element Plus 原生 `clearable` 属性

```vue
<!-- 实现方式 -->
<el-input
  v-bind="field"
  placeholder="请输入用户名"
  size="large"
  clearable           <!-- 一行代码搞定 -->
>
```

**为什么选这个方案：**
- ✅ **零成本**：Element Plus 内置支持，无需自定义组件
- ✅ **行为一致**：自动处理显示/隐藏逻辑（有值时显示 × 图标，点击清空内容并触发 clear 事件）
- ✅ **可访问性好**：自动添加 aria-label 和键盘支持
- ✅ **样式统一**：与其他系统中的 el-input 行为保持一致

**考虑过的替代方案：**

| 替代方案 | 描述 | 弃用原因 |
|---------|------|---------|
| A. 自定义 slot | 在 suffix slot 手动放一个图标按钮 | 工作量大，需要自己管理显示/隐藏逻辑 |
| B. 封装新组件 | 创建 ClearableInput.vue 包裹 el-input | 过度工程化，当前场景不需要 |
| C. 仅用户名加清空 | 只给 username 加 clearable | 不一致体验差；密码和验证码同样需要快速清空能力 |

**特殊处理：**
- **密码框**：虽然密码有 `show-password`（眼睛图标），但 `clearable` 会显示在眼睛图标左侧，两者可以共存
- **验证码框**：CaptchaInput 组件内部也需要添加 `clearable` 支持

---

### 决策 2：聚焦效果实现方案

**选择：** CSS `:deep()` 样式穿透 + CSS 变量过渡动画

```scss
// LoginCard.vue <style> 中新增
:deep(.el-input__wrapper) {
  // 基础样式
  transition: all $transition-base;  // 复用已有变量 0.2s ease
  border-radius: $input-border-radius; // 10px 圆角

  // 聚焦状态
  &:focus-within {
    border-color: $primary-color;      // 边框变蓝 #5B9BD5
    box-shadow: $input-focus-shadow;   // 柔和阴影环
    transform: translateY(-1px);       // 微妙上浮效果
  }
}
```

**为什么选这个方案：**
- ✅ **性能优秀**：纯 CSS 实现，无 JavaScript 开销
- ✅ **浏览器兼容好**：`:focus-within` 伪类现代浏览器均支持（IE 除外，但项目已不考虑 IE）
- ✅ **易于维护**：集中管理样式，符合 Element Plus 官方推荐的样式定制方式
- ✅ **变量驱动**：复用 `_variables.scss` 中已有的设计令牌

**视觉效果说明：**

```
默认状态 (Default)          聚焦状态 (Focus)
┌──────────────────┐       ╔═════════════════╗
│ 📍                │       ║ 📍               ║
│ 请输入用户名       │  →    ║ admin            ║
└──────────────────┘       ╚═════════════════╝
  Border: #E5E7EB             Border: #5B9BD5 (蓝色)
  Shadow: none                Shadow: 0 0 0 3px rgba(91,155,213,0.15)
  Transform: none             Transform: translateY(-1px)
```

**考虑过的替代方案：**

| 替代方案 | 描述 | 弃用原因 |
|---------|------|---------|
| A. JavaScript 监听 focus 事件 | 用 @focus/@blur 动态切换 class | 增加复杂度，CSS 伪类已足够 |
| B. Element Plus 自定义主题 | 通过 CSS 变量覆盖全局主题 | 影响范围过大，只想改登录页 |
| C. 第三方动画库（如 animate.css） | 引入外部依赖实现复杂动画 | 过度设计，简单过渡即可 |

**性能考量：**
- `transform` 和 `box-shadow` 触发 GPU 合成层，不会导致重排（reflow）
- `transition: all` 可能影响性能，但此处属性数量少，可接受
- 如后续发现卡顿，可精确指定 `transition-property: border-color, box-shadow, transform`

---

### 决策 3：响应式断点策略

**选择：** 采用项目已有的断点变量 + 移动端优先（Mobile-First）增强

```scss
// 复用 _variables.scss 中的断点
$breakpoint-sm: 576px;   // 手机横屏
$breakpoint-md: 768px;   // 平板竖屏
$breakpoint-lg: 992px;   // 平板横屏 / 小桌面

.login-card {
  padding: 48px 40px;  // 默认桌面端样式

  @media (max-width: $breakpoint-md) {  // ≤768px 平板及以下
    padding: 32px 24px;
    border-radius: 12px;
  }

  @media (max-width: $breakpoint-sm) {  // ≤576px 手机
    padding: 24px 16px;
    border-radius: 8px;

    .card-title {
      font-size: 24px;  // 从 28px 缩小
    }
  }
}

// 输入框高度调整
:deep(.el-input__inner) {
  height: $input-height;  // 默认 48px

  @media (max-width: $breakpoint-sm) {
    height: 52px;  // 移动端增大至 52px（触摸友好）
  }
}
```

**为什么选这个方案：**
- ✅ **一致性**：复用项目统一的断点体系，避免碎片化
- ✅ **渐进增强**：从桌面端向下适配，保证核心体验
- ✅ **符合 HIG 标准**：52px 高度满足 Apple Human Interface Guidelines 最小 44px 触摸目标要求
- ✅ **易于测试**：三个关键断点覆盖主流设备尺寸

**设备覆盖矩阵：**

| 设备类型 | 屏幕宽度 | 断点 | 卡片内边距 | 输入框高度 | 标题字号 |
|---------|---------|------|-----------|-----------|---------|
| Desktop (iMac) | ≥992px | 默认 | 48px 40px | 48px | 28px |
| Tablet (iPad) | 768px | md | 32px 24px | 48px | 28px |
| Mobile (iPhone 12) | 375px | sm | 24px 16px | 52px | 24px |

**考虑过的替代方案：**

| 替代方案 | 描述 | 弃用原因 |
|---------|------|---------|
| A. Container Queries | 使用容器查询替代媒体查询 | 浏览器支持度不足（2024年才广泛支持） |
| B. JS 动态检测 | 用 window.innerWidth 动态计算 | 增加 runtime 开销，CSS 足够 |
| C. 固定像素值 | 为每种设备写死具体数值 | 维护困难，不够灵活 |

---

### 决策 4：键盘事件监听架构

**选择：** 在 LoginCard 组件内使用 `onMounted`/`onUnmounted` 管理生命周期

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const loading = ref(false);

/**
 * 处理全局键盘事件
 * - Enter: 提交表单（如果不在输入框内，则聚焦到第一个输入框）
 * - Tab/Shift+Tab: 由浏览器原生处理（通过 tabindex 控制顺序）
 */
const handleGlobalKeydown = (e: KeyboardEvent) => {
  // 仅在非加载状态且按下 Enter 时触发
  if (e.key === 'Enter' && !loading.value) {
    // 如果当前焦点不在按钮上，阻止默认行为避免重复提交
    const target = e.target as HTMLElement;
    if (!target.closest('button[type="submit"]')) {
      // 可选：让 VeeValidate Form 的 submit 处理
      // 或者手动触发表单提交
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>
```

**Tab 切换顺序控制：**

通过 HTML 结构自然顺序 + `tabindex` 确保正确的焦点流：

```
1. 用户名输入框 (tabindex="0"，默认)
2. 密码输入框 (tabindex="0")
3. 验证码输入框 (条件渲染，tabindex="0")
4. 记住我复选框 (tabindex="0")
5. "忘记密码？"链接 (tabindex="0" 或 href="#")
6. 登录提交按钮 (tabindex="0", type="submit")
→ 循环回 1
```

**为什么选这个方案：**
- ✅ **封装性好**：事件监听器随组件创建/销毁，避免内存泄漏
- ✅ **不影响其他页面**：仅在 LoginCard 挂载时生效
- ✅ **符合 Vue 生命周期**：使用官方推荐的方式
- ✅ **无障碍友好**：Tab 顺序遵循 DOM 自然顺序，屏幕阅读器友好

**考虑过的替代方案：**

| 替代方案 | 描述 | 弃用原因 |
|---------|------|---------|
| A. 全局 mixin/composable | 抽取为 useKeyboardShortcut() | 当前仅一处使用，过度抽象 |
| B. 在 index.vue 监听 | 将事件监听提到父组件 | 违反组件职责单一原则 |
| C. 使用 vue-use 库 | 如 @vueuse/core 的 useMagicKeys | 增加依赖，原生 API 足够 |

**安全措施：**
- 在 `loading.value === true` 时忽略 Enter 键，防止重复提交
- 在 `onUnmounted` 中必须移除监听器，防止内存泄漏
- 使用 passive 选项优化滚动性能（如需要）

---

### 决策 5：错误提示混合模式

**选择：** 字段验证错误 → 内联展示；API 错误 → ElMessage 通知

#### 5.1 字段级错误（内联展示）

**当前实现问题：**
```javascript
// LoginCard.vue 第124-127行
if (!result.success) {
  const firstError = result.error.issues[0];
  ElMessage.warning(firstError.message);  // ❌ 全局弹窗遮挡视线
  return;
}
```

**优化后实现：**
```vue
<template>
  <!-- 用户名输入框 -->
  <Field name="username" v-slot="{ field, errorMessage }">
    <el-form-item :error="errorMessage" class="form-item">
      <el-input
        v-bind="field"
        placeholder="请输入用户名"
        size="large"
        clearable
      >
        <template #prefix>
          <Icon icon="mdi:account-outline" />
        </template>
      </el-input>

      <!-- 新增：内联错误提示 -->
      <transition name="error-fade">
        <div v-if="errorMessage" class="field-error">
          <Icon icon="mdi:alert-circle-outline" class="error-icon" />
          <span>{{ errorMessage }}</span>
        </div>
      </transition>
    </el-form-item>
  </Field>
</template>

<style scoped>
.field-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  color: #EF4444;  // 使用 _variables.scss 中的 $danger

  .error-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.2s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
```

**为什么选这个方案：**
- ✅ **精准定位**：用户一眼看到哪个字段出错
- ✅ **不遮挡视线**：紧贴输入框下方，不影响其他区域
- ✅ **多错误同显**：如果有多个字段出错，可以同时显示所有错误信息（而非只显示第一个）
- ✅ **动画平滑**：淡入淡出动画减少突兀感

#### 5.2 API 错误（保留 ElMessage）

**位置：** `index.vue` 的 `handleSubmit` catch 块（第129-173行）

**保持不变的原因：**
- API 错误（401 未授权、422 验证失败、网络超时等）是全局性的，不适合绑定到某个特定字段
- ElMessage 的自动消失特性（3-5秒）适合通知类消息
- 用户可能需要在错误提示的同时查看或修改表单内容

**可选增强（不在 MVP 范围）：**
- 后续可为 ElMessage 添加自定义图标或更详细的错误描述链接

**考虑过的替代方案：**

| 替代方案 | 描述 | 弃用原因 |
|---------|------|---------|
| A. 全部用内联 | 在表单顶部显示一个 error banner | API 错误不属于任何字段，语义不清 |
| B. 全部用 ElMessage | 保持现状不变 | 字段错误被遮挡的问题未解决 |
| C. 使用 Notification | 右下角弹出通知 | 与 ElMessage 功能重叠，增加学习成本 |
| D. Toast 组件库 | 引入 vue-toastification 等 | 增加依赖体积，Element Plus 已够用 |

---

## Risks / Trade-offs

### 风险 1：Element Plus 样式穿透失效

**风险描述：** `:deep()` 选择器在某些情况下可能无法正确穿透 Scoped Styles，导致自定义样式不生效

**概率：** 低（Element Plus 官方推荐方式）

**缓解措施：**
- 在 Chrome DevTools Elements 面板中验证选择器是否匹配到目标元素
- 如遇问题，尝试使用 `:deep(.el-input__wrapper)` 或 `::v-deep()` （Vue 2 语法兼容）
- 最终兜底方案：在 `<style>` 标签去掉 `scoped`（不推荐，但可用）

**测试检查点：**
- [ ] 聚焦时边框颜色是否变为蓝色
- [ ] 阴影是否正确显示
- [ ] 上浮动画是否流畅

---

### 风险 2：移动端浏览器兼容性

**风险描述：** `:focus-within` 伪类或 `transform` 在旧版移动浏览器（如 iOS Safari < 13）可能表现异常

**概率：** 低（iOS 13 发布于 2019年，覆盖率 > 95%）

**缓解措施：**
- 在 BrowserStack 或真实设备上测试 iOS Safari、Android Chrome
- 如发现问题，可降级为仅改变边框颜色（去掉 transform 和 box-shadow）
- 使用 `@supports` 特性查询做渐进增强：

```scss
@supports (selector(:focus-within)) {
  :deep(.el-input__wrapper):focus-within {
    // 完整聚焦效果
  }
}
```

---

### 风险 3：clearable 与 show-password 图标冲突

**风险描述：** 密码框同时启用 `clearable` 和 `show-password` 时，右侧会出现两个图标（× 和 👁），可能导致拥挤

**概率：** 中（取决于输入框宽度）

**缓解措施：**
- Element Plus 已内置处理逻辑：clearable 图标在左，show-password 图标在右
- 在小屏幕设备上，可通过媒体查询适当增加输入框宽度或 padding
- 实际测试验证视觉效果，必要时微调间距

**备选方案：**
- 如确实拥挤，可在移动端对密码框禁用 `clearable`（仅保留 show-password）

---

### 风险 4：键盘事件重复触发

**风险描述：** 当用户在输入框内按 Enter 时，既触发了 input 的原生 submit 事件，又触发了我们监听的 keydown 事件，导致重复提交

**概率：** 中

**缓解措施：**
- 方案 A：**移除全局 Enter 监听**（推荐）
  - VeeValidate 的 `<Form>` 组件已经处理了 Enter 键提交
  - 只需确保表单的 `@submit` 事件正确绑定即可
  - 我们只需要关注 Tab 顺序优化（这由 HTML 结构自然决定）

- 方案 B：**防抖处理**
  ```javascript
  let isSubmitting = false;
  const handleSubmit = async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    try { ... } finally { isSubmitting = false; }
  };
  ```

**最终建议：** 采用方案 A，简化实现，避免过度设计

---

### 权衡 1：性能 vs 视觉效果

**决策：** 选择适度的视觉效果，不过度追求华丽

**理由：**
- 登录页面停留时间短（通常 < 30秒），用户关注的是快速完成任务而非欣赏动画
- 复杂动画会增加 CPU/GPU 开销，在低端设备上可能掉帧
- 内部管理系统用户更看重效率和稳定性

**具体取舍：**
- ✅ 保留：边框颜色渐变、柔和阴影、轻微上浮（性能开销极低）
- ❌ 放弃：弹性动画（spring animation）、粒子背景、3D 效果

---

### 权衡 2：开发速度 vs 代码质量

**决策：** 优先保证代码质量，适度牺牲开发速度

**理由：**
- 登录页面是系统的门面，代码质量直接影响维护成本
- 本次改动集中在单个文件（LoginCard.vue），即使仔细打磨也不会拖延太久
- 遵循项目的 ESLint/Prettier 规范，确保代码风格统一

**质量保障措施：**
- 所有新增代码必须有 TypeScript 类型注解
- 样式代码遵循 BEM 命名规范或 Scoped Styles 最佳实践
- 提交前运行 `npm run lint` 和 `npm run typecheck` 确保无报错

## Migration Plan

### 部署步骤

由于本次变更仅为前端 UI 优化，无数据库迁移或 API 变更，部署流程非常简单：

#### 步骤 1：本地开发和测试（预计 0.5 天）

```bash
# 1. 切换到 feature 分支
git checkout -b feature/login-page-modernization-mvp

# 2. 启动开发服务器
cd apps/web && npm run dev

# 3. 手动测试清单（详见 tasks.md）
```

**测试重点：**
- [ ] 清空图标在三种输入框上的行为
- [ ] 聚焦效果在不同浏览器的表现
- [ ] Chrome DevTools 响应式模拟（iPhone SE, iPad, Desktop）
- [ ] Tab 键切换顺序是否符合预期
- [ ] 错误提示的内联展示是否正常

#### 步骤 2：代码审查（预计 0.5 天）

- 提交 Pull Request 到主仓库
- 至少 1 位前端同事 Review
- 检查项：
  - TypeScript 类型安全
  - ESLint/Prettier 规范
  - 无性能回归（可使用 Lighthouse Audit）
  - 无障碍访问合规（可使用 axe DevTools 扩展）

#### 步骤 3：灰度发布（可选，预计 0.5 天）

如果担心影响范围大，可采用灰度策略：

- **方案 A：Feature Flag**
  ```typescript
  // 在 config 中添加开关
  const ENABLE_LOGIN_ENHANCEMENTS = import.meta.env.VITE_ENABLE_LOGIN_ENHANCEMENTS !== 'false';
  ```
  先在测试环境开启，生产环境默认关闭，观察 1-2 天后再全量开放

- **方案 B：直接发布**（推荐）
  - 变更范围可控（仅 LoginCard.vue 一个文件）
  - 所有新特性均为渐进式增强，不破坏原有功能
  - 回滚成本低（git revert 即可）

#### 步骤 4：全量上线（预计 0.5 天）

- 合并 PR 到主分支
- 触发 CI/CD 流水线（构建、测试、部署）
- 生产环境验证：
  - [ ] 访问线上登录页面，确认无白屏/报错
  - [ ] 用测试账号完成一次完整登录流程
  - [ ] 检查浏览器控制台无 Error 级别日志

### 回滚方案

**紧急回滚（5分钟内）：**
```bash
# 1. 找到上一个稳定版本的 commit hash
git log --oneline -10

# 2. Revert 本次变更的 commit
git revert <commit-hash-of-login-page-modernization-mvp>

# 3. 推送并触发重新部署
git push origin main
```

**验证回滚成功：**
- 登录页面恢复到优化前的样式
- 清空图标消失
- 聚焦效果恢复正常（无阴影和上浮）
- 错误提示回到 ElMessage 全局弹窗模式

**数据影响：** 无（纯前端变更，不影响数据库或用户数据）

## Open Questions

### 问题 1：CaptchaInput 组件的 clearable 支持

**问题描述：** CaptchaInput 是独立组件，其内部实现未知（尚未深入阅读）。需要确认：
- 是否已经支持 `clearable` prop？
- 如果不支持，是否需要修改该组件？还是在外层包裹一层？

**建议行动：** 在实施阶段先阅读 CaptchaInput.vue 源码，根据实际情况决定：
- 若已支持 → 直接传入 `clearable` 属性
- 若不支持 → 在 CaptchaInput 内部添加支持（改动量预计 < 10行）

**截止决策时间：** 任务开始前（Tasks 阶段会明确）

---

### 问题 2：错误信息的国际化（i18n）

**问题描述：** 当前错误信息硬编码为中文（如 `'用户名不能为空'`）。如果系统未来需要支持多语言，这些内联错误文本如何处理？

**建议方案（不在 MVP 范围）：**
- 后续可引入 vue-i18n，将错误信息提取到 locale 文件
- 当前 MVP 阶段保持中文硬编码，标记 TODO 注释待后续优化

**示例：**
```vue
<div v-if="errorMessage" class="field-error">
  <Icon icon="mdi:alert-circle-outline" />
  <!-- TODO: 未来接入 i18n 后替换为 {{ t(errorMessage) }} -->
  <span>{{ errorMessage }}</span>
</div>
```

---

### 问题 3：是否需要自动化测试覆盖

**问题描述：** 项目使用 Vitest（单元测试）和 Playwright（E2E 测试）。本次 UI 优化是否需要补充测试用例？

**建议：**
- **单元测试（Vitest）：** 可选
  - 测试键盘事件监听器的注册/注销
  - 测试错误信息的格式化逻辑（如有抽取为 composable）
- **E2E 测试（Playwright）：** 强烈推荐
  - 测试完整的登录流程（填写 → 清空 → 提交 → 错误处理）
  - 测试响应式布局在不同视口下的表现
  - 测试 Tab 键导航顺序

**工作量评估：** 约 0.5-1 天（取决于测试覆盖率要求）

**决策时机：** Tasks 阶段确定是否纳入实施范围
