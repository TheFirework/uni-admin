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

#### Scenario: 表单验证集成
- **GIVEN** 用户未填写用户名字段并提交
- **WHEN** LoginSchema.safeParse() 验证失败
- **THEN** 显示 ElMessage.warning("用户名不能为空")
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
