# Login UI Components

## Purpose

定义企业级登录页面的 UI 组件架构规范，包括 BrandSection、LoginCard、CaptchaInput 和 RememberMe 四个独立组件的接口、行为和样式约定。组件化架构确保代码可复用、可测试和可维护。

---

## Requirements

### Requirement: LoginCard 组件必须封装登录表单的核心 UI 结构和交互逻辑

系统 SHALL 提供 `LoginCard` Vue 组件作为登录表单的容器组件。组件 SHALL 包含以下子元素：产品标题、副标题、表单容器（用户名输入框、密码输入框、验证码输入框[条件显示]、记住我选项、忘记密码链接、登录按钮）。组件 SHALL 使用 vee-validate 的 `Form`/`Field` 组件进行声明式表单验证，并结合 Zod Schema 实现类型安全。组件 SHALL 支持 props 自定义：`title` (string, 默认 "欢迎回来")、`subtitle` (string, 默认 "请输入您的账号信息以登录系统")、`showCaptcha` (boolean)、`loading` (boolean)、`captchaImage` (string)、`captchaLoading` (boolean)。组件 SHALL 触发事件：`@submit` (携带表单数据)、`@captcha-refresh` (用户点击刷新验证码)、`@forgot-password` (用户点击忘记密码)。

#### Scenario: 基础渲染
- **GIVEN** 使用 `<LoginCard />` 组件且不传任何 props
- **WHEN** 组件渲染
- **THEN** 显示默认标题 "欢迎回来"
- **AND** 显示默认副标题 "请输入您的账号信息以登录系统"
- **AND** 显示用户名输入框（placeholder: "请输入用户名"，prefix-icon: mdi:account-outline）
- **AND** 显示密码输入框（type: "password", placeholder: "请输入密码", prefix-icon: mdi:lock-outline, show-password 切换）
- **AND** 隐藏验证码输入框（v-if=false）
- **AND** 显示 RememberMe 子组件
- **AND** 显示"忘记密码？"链接
- **AND** 显示"登录"按钮（type: "primary", size: "large", width: 100%）

#### Scenario: 自定义标题和副标题
- **GIVEN** 使用 `<LoginCard title="企业管理系统" subtitle="安全 · 高效 · 智能" />`
- **WHEN** 组件渲染
- **THEN** 标题显示为 "企业管理系统"
- **AND** 副标题显示为 "安全 · 高效 · 智能"

#### Scenario: 条件显示验证码
- **GIVEN** 使用 `<LoginCard :show-captcha="true" />`
- **WHEN** 组件渲染
- **THEN** 在密码输入框下方显示验证码区域（fade 动画过渡）
- **AND** 使用 CaptchaInput 子组件

#### Scenario: Loading 状态
- **GIVEN** 使用 `<LoginCard :loading="true" />`
- **WHEN** 组件渲染
- **THEN** 登录按钮处于 disabled 状态
- **AND** 按钮文字变为 "登录中..."

#### Scenario: 表单提交事件
- **GIVEN** 用户填写完表单并点击"登录"按钮
- **WHEN** vee-validate 表单验证通过
- **THEN** 组件 emit `submit` 事件，携带数据：
  ```typescript
  { username: string, password: string, captcha?: string, rememberMe: boolean }
  ```

#### Scenario: 表单验证集成 - 内联错误提示模式（更新）
- **GIVEN** 用户未填写用户名字段并提交
- **WHEN** LoginSchema.safeParse() 验证失败
- **THEN** **不再调用** `ElMessage.warning(firstError.message)`
- **AND** 改为让 VeeValidate 的 `errorMessage` 通过 `v-if` 自然控制内联错误提示区域的显示/隐藏
- **AND** 在用户名输入框下方**内联显示**错误提示（非全局 ElMessage 弹窗）
- **AND** 错误提示包含警告图标（mdi:alert-circle-outline）和红色文字（#EF4444）
- **AND** 错误提示伴随淡入+下滑动画（0.2s ease）
- **AND** 可同时显示多个字段的错误（而非仅显示第一个）
- **AND** 阻止表单提交（不 emit submit 事件）

---

### Requirement: CaptchaInput 组件必须封装验证码输入和图片展示的交互逻辑

系统 SHALL 提供 `CaptchaInput` Vue 组件用于验证码输入场景。组件 SHALL 包含：**验证码文本输入框（支持字母和数字组合）**、验证码图片展示区（`<img>` 标签，Base64 Data URL）、刷新按钮（可与图片合并，点击图片即刷新）。组件 SHALL 支持 props：`modelValue` (string, v-model 绑定)、`captchaImage` (string, 后端返回的完整 data URI 格式)、`loading` (boolean, 图片加载状态)。组件 SHALL 触发事件：`@update:modelValue` (输入变化)、`@refresh` (请求刷新验证码)、`@error` (图片加载失败)。

> **设计决策说明**: 验证码允许字母和数字组合（而非仅数字），因为 svg-captcha 生成的验证码包含字母字符，且混合字符提供更高的安全性。

#### Scenario: 基础渲染
- **GIVEN** 使用 `<CaptchaInput v-model="captcha" :captcha-image="imageData" />`
- **WHEN** 组件渲染
- **THEN** 显示一个输入框（type: "text", placeholder: "请输入验证码", maxlength: 6）
- **AND** 输入框右侧显示验证码图片（width: 120px）
- **AND** 鼠标悬停在图片上时显示手型光标（cursor: pointer）

#### Scenario: 输入支持字母和数字
- **GIVEN** 验证码输入框已聚焦
- **WHEN** 用户输入任意字符（如 "A3xK"、"abc123"）
- **THEN** 输入框接受所有可打印字符（不限制为纯数字）
- **AND** maxlength="6" 限制最大长度

#### Scenario: 点击刷新验证码
- **GIVEN** 验证码图片已加载显示
- **WHEN** 用户点击验证码图片
- **THEN** 组件 emit `refresh` 事件
- **AND** 图片显示 loading 占位符（旋转图标 + "加载中..."）
- **等待父组件传入新的 captchaImage prop**

#### Scenario: 图片加载失败处理
- **GIVEN** 验证码图片 src 无效或网络错误
- **WHEN** `<img>` 标签触发 onerror 事件
- **THEN** 组件 emit `error` 事件
- **AND** 显示错误占位符："点击刷新"（带刷新图标）
- **AND** 用户点击占位符可重新触发 refresh 事件

---

### Requirement: RememberMe 组件必须封装"记住我"复选框并集成浏览器 Credential Management API

系统 SHALL 提供 `RememberMe` Vue 组件用于"记住我"功能。组件 SHALL 包含：复选框（`<el-checkbox>`）、标签文字（"记住登录状态"）、帮助图标（Iconify: mdi:information-outline）和 Tooltip 提示。组件 SHALL 支持 v-model 双向绑定（boolean 值）。组件通过控制父组件表单的 `autocomplete` 属性来启用/禁用浏览器的原生凭证管理功能（不在组件内部直接操作 autocomplete）。

#### Scenario: 默认未选中状态
- **GIVEN** 使用 `<RememberMe v-model="rememberMe" />`
- **WHEN** 组件挂载且未传入初始值
- **THEN** 复选框未选中（modelValue = false）
- **AND** 显示帮助图标（mdi:information-outline）

#### Scenario: 勾选 - 启用浏览器自动填充
- **GIVEN** 复选框当前未选中
- **WHEN** 用户点击勾选"记住我"
- **THEN** modelValue 变为 true
- **AND** 触发 `update:modelValue` 事件通知父组件
- **AND** 父组件响应地将用户名输入框的 autocomplete 改为 "username"
- **AND** 父组件将密码输入框的 autocomplete 改为 "current-password"

#### Scenario: 取消勾选 - 禁用浏览器自动填充
- **GIVEN** 复选框当前已选中
- **WHEN** 用户取消勾选"记住我"
- **THEN** modelValue 变为 false
- **AND** 触发 `update:modelValue` 事件
- **AND** 父组件将输入框 autocomplete 改为 "off" 或 "new-password"

#### Scenario: Tooltip 帮助文本
- **GIVEN** 用户在登录页面且"记住我"组件可见
- **WHEN** 用户鼠标悬停在帮助图标上
- **THEN** 显示 tooltip："勾选后，浏览器将记住您的登录状态，下次访问时自动填充用户名"
- **AND** 延迟 300ms 后显示，2000ms 后自动隐藏

---

### Requirement: BrandSection 组件必须封装左侧品牌展示区域的视觉内容和布局（纯文字 + 图标方案）

系统 SHALL 提供 `BrandSection` Vue 组件用于左侧品牌展示区（桌面端布局）。**组件 SHALL 采用纯文字 + Iconify 图标方案，默认不依赖外部图片资源**。组件 SHALL 包含：**Iconify 图标区域**（替代传统 Logo 图片）、产品名称标题、Slogan 副标题、**柔和渐变背景（现代简约风格）**。组件 SHALL 支持 props 自定义：`icon` (string, Iconify 图标标识符)、`title` (string)、`slogan` (string)。组件 SHALL 支持插槽（slots）：`icon` (自定义图标区域)、`default` (自定义内容区域)、`footer` (底部附加内容如版权信息)。桌面端（≥992px）显示，移动端（<992px）隐藏。

#### Scenario: 默认渲染 - 纯文字 + Iconify 图标（现代简约风格）
- **GIVEN** 使用 `<BrandSection />` 不传任何 props
- **WHEN** 组件渲染（桌面端）
- **THEN** 显示**柔和渐变背景**（linear-gradient(135deg, #E8F4FD 0%, #F0E6FA 100%)）
- **AND** 显示默认 **Iconify 图标**（mdi:office-building-outline，64px，颜色 #5B9BD5）
- **AND** 显示默认标题 "Uni-Admin"（32px, 字重 600, 颜色 #1F2937）
- **AND** 显示默认副标题 "统一企业管理平台"（16px, 颜色 #6B7280）

#### Scenario: 自定义 Iconify 图标
- **GIVEN** 使用 `<BrandSection icon="mdi:rocket-launch-outline" title="MySystem" slogan="创新驱动未来" />`
- **WHEN** 组件渲染
- **THEN** 显示自定义的 Iconify 图标和文字
- **AND** 渐变背景保持不变

#### Scenario: 移动端自适应隐藏
- **GIVEN** 视口宽度 < 992px（移动端）
- **WHEN** 父容器渲染 BrandSection
- **THEN** 组件隐藏（display: none）

#### Scenario: 使用插槽自定义内容
- **GIVEN** 使用 `#icon` 插槽替换默认图标
- **THEN** 插槽内容替换默认的 Iconify 图标
- **AND** 其他内容仍使用 props 或默认值

---

### Requirement: 登录表单的所有文本输入框必须支持一键清空功能

系统 SHALL 为用户名输入框、密码输入框和验证码输入框启用 Element Plus 的 `clearable` 属性。当输入框**有内容时**，右侧 SHALL 显示清空图标（×）；当输入框为空时，清空图标 SHALL 隐藏。点击清空图标 SHALL 立即清空输入框内容并隐藏图标。

> **能力来源**: login-input-enhancements (MVP Phase 1)

#### Scenario: 用户名输入框的清空行为
- **GIVEN** 用户名输入框处于初始状态（空值）
- **WHEN** 用户未输入任何内容
- **THEN** 输入框右侧**不显示**清空图标

#### Scenario: 输入内容后出现清空图标
- **GIVEN** 用户名输入框处于初始状态
- **WHEN** 用户输入 "admin"
- **THEN** 输入框右侧**立即显示** × 清空图标

#### Scenario: 点击清空图标清除内容
- **GIVEN** 用户名输入框包含文字 "admin" 且显示 × 图标
- **WHEN** 用户点击 × 清空图标
- **THEN** 输入框内容被**立即清空**
- **AND** × 清空图标**消失**

#### Scenario: 密码框清空与显示密码图标共存
- **GIVEN** 密码输入框已启用 `show-password` 属性（眼睛图标）
- **AND** 已启用 `clearable` 属性
- **WHEN** 用户在密码框输入内容
- **THEN** 同时显示两个图标：× 清空图标（左侧）和 👁 显示/隐藏密码图标（右侧）
- **AND** 两个图标**不重叠或拥挤**

#### Scenario: 验证码输入框支持清空
- **GIVEN** CaptchaInput 组件内的验证码文本输入框
- **WHEN** 组件启用 clearable 属性
- **THEN** 验证码输入框行为与其他输入框一致（有值时显示 ×，点击可清空）
- **AND** 刷新验证码图片不影响清空图标的显示逻辑

---

### Requirement: 登录表单的输入框必须在聚焦时提供增强的视觉反馈

系统 SHALL 使用 CSS `:deep()` 样式穿透技术为所有 el-input 组件添加聚焦效果。聚焦状态 SHALL 包含三个视觉变化：
1. **边框颜色渐变**：从默认灰色 (#E5E7EB) 变为主色调蓝色 (#5B9BD5)
2. **柔和阴影环**：`box-shadow: 0 0 0 3px rgba(91, 155, 213, 0.15)`
3. **微妙上浮动画**：`transform: translateY(-1px)`

所有过渡效果 SHALL 使用 `transition: all 0.2s ease` 实现平滑动画。

> **能力来源**: login-input-enhancements (MVP Phase 1)

#### Scenario: 未聚焦状态的默认样式
- **GIVEN** 用户名输入框处于未聚焦状态
- **WHEN** 视觉检查
- **THEN** 边框颜色为 #E5E7EB（浅灰色）
- **AND** 无阴影效果（box-shadow: none）
- **AND** 无位移（transform: none）

#### Scenario: 聚焦时的完整视觉效果
- **GIVEN** 用户点击或 Tab 聚焦到用户名输入框
- **WHEN** 输入框获得焦点
- **THEN** 边框颜色**平滑过渡**到 #5B9BD5（蓝色）
- **AND** 出现柔和的蓝色阴影环（透明度 15%）
- **AND** 整体**轻微上浮**约 1px
- **AND** 所有变化在 **200ms 内**完成过渡

#### Scenario: 失去焦点时平滑恢复
- **GIVEN** 用户名输入框处于聚焦状态（蓝色边框 + 阴影 + 上浮）
- **WHEN** 用户点击其他区域使输入框失去焦点
- **THEN** 所有视觉效果在 200ms 内**平滑过渡回默认状态**
- **AND** 不出现突变或闪烁

#### Scenario: 快速切换焦点无卡顿
- **GIVEN** 页面包含多个输入框（用户名、密码、验证码）
- **WHEN** 用户快速依次点击每个输入框
- **THEN** 聚焦效果流畅切换，FPS 保持 ≥55
- **AND** 无长时间任务 (>50ms) 阻塞主线程

---

### Requirement: 登录卡片组件必须支持响应式布局以适配不同设备尺寸

系统 SHALL 为 `.login-card` 容器添加媒体查询规则以优化移动端体验：

| 设备类型 | 断点 | 卡片内边距 | 圆角 | 标题字号 | 输入框高度 |
|---------|------|-----------|------|---------|-----------|
| Desktop | 默认 (>768px) | 48px 40px | 16px | 28px | 48px |
| Tablet | ≤768px | 32px 24px | 12px | 28px | 48px |
| Mobile | ≤576px | 24px 16px | 8px | **24px** | **52px** |

移动端输入框高度 SHALL ≥52px 以符合触摸友好标准（Apple HIG 推荐 ≥44px）。

> **能力来源**: login-input-enhancements (MVP Phase 1)

#### Scenario: 桌面端默认样式
- **GIVEN** 视口宽度 ≥768px（桌面端或平板横屏）
- **WHEN** 登录卡片渲染
- **THEN** 卡片内边距为 48px 40px
- **AND** 圆角半径为 16px
- **AND** 标题字号为 28px
- **AND** 输入框高度为 48px

#### Scenario: 平板及以下设备的紧凑布局
- **GIVEN** 视口宽度 ≤768px 且 >576px（平板竖屏）
- **WHEN** 登录卡片渲染
- **THEN** 卡片内边距缩小至 32px 24px
- **AND** 圆角半径缩小至 12px
- **AND** 标题字号保持 28px
- **AND** 输入框高度保持 48px

#### Scenario: 移动端触摸优化
- **GIVEN** 视口宽度 ≤576px（手机设备，如 iPhone SE）
- **WHEN** 登录卡片渲染
- **THEN** 卡片内边距进一步缩小至 24px 16px
- **AND** 圆角半径缩小至 8px
- **AND** 标题字号缩小至 24px（节省垂直空间）
- **AND** 输入框高度增大至 **52px**（便于手指触摸）

#### Scenario: 移动端无横向滚动条
- **GIVEN** 视口宽度为 375px（iPhone SE 标准）
- **WHEN** 登录卡片渲染且包含所有表单元素
- **THEN** 页面**不出现**横向滚动条
- **AND** 登录按钮宽度保持 100%（易于点击）

---

### Requirement: 登录表单必须遵循符合逻辑的 Tab 键导航顺序

系统 SHALL 确保登录表单内的可聚焦元素按照以下顺序排列（符合用户从上到下、从左到右的阅读习惯）：

```
用户名输入框 → 密码输入框 → [验证码输入框] → 记住我复选框 → "忘记密码？"链接 → 登录按钮
```

Tab 顺序 SHALL 通过 HTML DOM 自然顺序实现，**不使用负值 tabindex**。当用户按 Tab 键到达最后一个元素后再次按 Tab，焦点 SHALL 循环回到第一个元素（用户名输入框）。Shift+Tab SHALL 支持反向遍历。

> **能力来源**: login-keyboard-accessibility (MVP Phase 1)

#### Scenario: 正向 Tab 遍历所有表单元素
- **GIVEN** 登录页面已加载且用户名输入框获得初始焦点
- **WHEN** 用户连续按 Tab 键遍历所有可聚焦元素
- **THEN** 焦点依次经过：用户名 → 密码 → [验证码] → 记住我 → 忘记密码? → 登录按钮

#### Scenario: 反向 Shift+Tab 遍历
- **GIVEN** 焦点当前在登录按钮上
- **WHEN** 用户按 Shift+Tab
- **THEN** 焦点移动到"忘记密码？"链接（上一个元素）

#### Scenario: Tab 循环回到起始位置
- **GIVEN** 焦点当前在登录按钮（最后一个元素）
- **WHEN** 用户按 Tab
- **THEN** 焦点循环回到用户名输入框（第一个元素）

---

### Requirement: 登录表单必须支持 Enter 键快速提交

系统 SHALL 支持在任意输入框内按 Enter 键提交表单（通过 VeeValidate Form 的原生 `@submit` 事件处理）。当登录按钮处于 loading 状态时，Enter 键 SHALL 被忽略以防止重复提交。

> **设计决策**: 不添加全局 keydown 监听器，VeeValidate `<Form>` 已原生支持 Enter 提交。
> **能力来源**: login-keyboard-accessibility (MVP Phase 1)

#### Scenario: 在输入框按 Enter 提交
- **GIVEN** 用户已填写有效的用户名和密码
- **WHEN** 焦点在用户名输入框且用户按 Enter 键
- **THEN** 表单触发验证并尝试提交（与点击登录按钮行为一致）

#### Scenario: Loading 状态下 Enter 键被忽略
- **GIVEN** 登录按钮处于 loading 状态（disabled）
- **WHEN** 用户在任意输入框按 Enter 键
- **THEN** 不触发表单重复提交

#### Scenario: Tab 顺序不受验证码显示/隐藏影响
- **GIVEN** 初始状态 `showCaptcha=false`（验证码隐藏）
- **WHEN** 登录失败后 `showCaptcha=true`（验证码显示）
- **THEN** Tab 顺序自动调整：在密码输入框后插入验证码输入框
- **AND** 其他元素的相对顺序保持不变

---

### Requirement: API 级错误必须使用 ElMessage 全局通知展示

对于非字段验证的错误（如 401 未授权、422 验证失败、网络超时等），系统 SHALL 继续使用 `ElMessage.error()` 或 `ElMessage.warning()` 进行全局通知。这些通知 SHALL 显示在页面顶部中央位置，3-5 秒后自动消失，**不遮挡表单区域**以便用户可继续操作。

> **设计决策**: API 错误是全局性的，不属于特定字段，不适合用内联提示。
> **能力来源**: login-error-display (MVP Phase 1)

#### Scenario: 401 未授权错误的全局通知
- **GIVEN** 用户输入了错误的用户名或密码
- **WHEN** 后端返回 HTTP 401 状态码
- **THEN** 页面顶部弹出红色全局通知："用户名或密码错误"
- **AND** 通知持续约 3-5 秒后自动消失

#### Scenario: 网络连接失败的友好提示
- **GIVEN** 用户设备网络断开或服务器不可达
- **WHEN** 登录请求失败（ERR_NETWORK）
- **THEN** 弹出警告通知："网络连接失败，请检查网络后重试"
- **AND** 不影响用户重新尝试提交表单

#### Scenario: 混合模式共存 - 字段错误和 API 错误同时处理
- **GIVEN** 用户未填写任何内容并点击登录
- **WHEN** 前端字段验证通过（假设必填校验被绕过）但后端返回 422 错误
- **THEN** 如果有前端字段验证错误 → 以内联方式显示在对应字段下方
- **AND** 如果有后端 API 错误 → 以 ElMessage 全局通知显示
- **AND** 两种错误展示方式**不冲突**

---

### Requirement: 字段级验证错误必须以内联方式显示在对应输入框下方（详细规范）

系统 SHALL 在每个 Field 组件的 el-form-item 下方添加错误提示区域，包含：
- 警告图标（Iconify: `mdi:alert-circle-outline`，16px）
- 错误文本（13px，颜色 #EF4444 红色）

错误提示区域 SHALL 使用 Vue `<transition name="error-fade">` 包裹，实现淡入+下滑动画效果（0.2s ease）。

> **能力来源**: login-error-display (MVP Phase 1)

#### Scenario: 提交空表单显示多个内联错误
- **GIVEN** 用户未填写用户名和密码，直接点击"登录"按钮
- **WHEN** LoginSchema 验证失败
- **THEN** 用户名输入框下方显示红色错误："用户名不能为空"
- **AND** 密码输入框下方同时显示红色错误："密码不能为空"
- **AND** 两个错误提示**同时可见**，互不遮挡
- **AND** 每个错误提示都带有警告图标

#### Scenario: 单个字段错误的精准定位
- **GIVEN** 用户已填写密码但未填写用户名
- **WHEN** 点击"登录"按钮触发验证
- **THEN** 仅在用户名输入框下方显示错误提示
- **AND** 密码输入框下方无任何错误信息

#### Scenario: 错误出现的动画效果
- **GIVEN** 字段验证失败且 errorMessage 有值
- **WHEN** v-if="errorMessage" 条件满足
- **THEN** 错误提示以**淡入 + 下滑**动画出现（200ms 内完成）
- **AND** 初始状态为透明度 0 且向上偏移 4px

#### Scenario: 修正输入后错误自动消失
- **GIVEN** 用户名输入框下方显示"用户名不能为空"错误
- **WHEN** 用户开始在用户名输入框输入内容
- **THEN** 一旦输入内容通过验证（非空），错误立即**淡出消失**
- **AND** 消失动画与出现动画对称（200ms, opacity + translateY）
