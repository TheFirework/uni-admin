## ADDED Requirements

### Requirement: LoginCard 组件必须封装登录表单的核心 UI 结构和交互逻辑

系统 SHALL 提供 `LoginCard` Vue 组件作为登录表单的容器组件。组件 SHALL 包含以下子元素：产品标题、副标题、表单容器（用户名输入框、密码输入框、验证码输入框[条件显示]、记住我选项、忘记密码链接、登录按钮）。组件 SHALL 支持 props 自定义：`title` (string, 默认 "Uni-Admin 管理后台")、`subtitle` (string, 默认 "统一管理平台")、`showCaptcha` (boolean, 受控)、`loading` (boolean)。组件 SHALL 触发事件：`@submit` (携带表单数据)、`@captcha-refresh` (用户点击刷新验证码)、`@forgot-password` (用户点击忘记密码)。

#### Scenario: 基础渲染
- **GIVEN** 使用 `<LoginCard />` 组件且不传任何 props
- **WHEN** 组件渲染
- **THEN** 显示默认标题 "Uni-Admin 管理后台"
- **AND** 显示默认副标题 "统一管理平台"
- **AND** 显示用户名输入框（placeholder: "请输入用户名"，prefix-icon: User）
- **AND** 显示密码输入框（type: "password", placeholder: "请输入密码", prefix-icon: Lock, show-password 切换）
- **AND** 隐藏验证码输入框（v-if=false）
- **AND** 显示"记住我"复选框（默认未选中）
- **AND** 显示"忘记密码？"链接（href: "#", 可选）
- **AND** 显示"登录"按钮（type: "primary", size: "large", width: 100%）

#### Scenario: 自定义标题和副标题
- **GIVEN** 使用 `<LoginCard title="企业管理系统" subtitle="安全 · 高效 · 智能" />`
- **WHEN** 组件渲染
- **THEN** 标题显示为 "企业管理系统"
- **AND** 副标题显示为 "安全 · 高效 · 智能"

#### Scenario: 条件显示验证码
- **GIVEN** 使用 `<LoginCard :show-captcha="true" />`
- **WHEN** 组件渲染
- **THEN** 在密码输入框下方显示验证码输入框
- **AND** 验证码输入框右侧显示验证码图片（<img> 标签，可点击刷新）
- **AND** 验证码输入框 placeholder: "请输入验证码"

#### Scenario: Loading 状态
- **GIVEN** 使用 `<LoginCard :loading="true" />`
- **WHEN** 组件渲染
- **THEN** 登录按钮处于 disabled 状态
- **AND** 按钮显示 loading 旋转图标
- **AND** 按钮文字变为 "登录中..."

#### Scenario: 表单提交事件
- **GIVEN** 用户填写完表单并点击"登录"按钮
- **WHEN** 表单验证通过
- **THEN** 组件 emit `submit` 事件，携带数据：
  ```typescript
  {
    username: string,
    password: string,
    captcha?: string,      // 仅当 showCaptcha=true 时存在
    rememberMe: boolean
  }
  ```

---

### Requirement: CaptchaInput 组件必须封装验证码输入和图片展示的交互逻辑

系统 SHALL 提供 `CaptchaInput` Vue 组件用于验证码输入场景。组件 SHALL 包含：**验证码文本输入框（支持字母和数字组合）**、验证码图片展示区（<img> 标签，Base64 Data URL）、刷新按钮（可与图片合并，点击图片即刷新）。组件 SHALL 支持 props：`modelValue` (string, v-model 绑定)、`captchaImage` (string, Base64 图片数据)、`loading` (boolean, 图片加载状态)。组件 SHALL 触发事件：`@update:modelValue` (输入变化)、`@refresh` (请求刷新验证码)、`@load` (图片加载完成)、`@error` (图片加载失败)。

> **设计决策说明**: 验证码允许字母和数字组合（而非仅数字），因为 svg-captcha 生成的验证码可能包含字母字符，且混合字符提供更高的安全性。

#### Scenario: 基础渲染
- **GIVEN** 使用 `<CaptchaInput v-model="captcha" :captcha-image="imageData" />`
- **WHEN** 组件渲染
- **THEN** 显示一个输入框（type: "text", placeholder: "请输入验证码"）
- **AND** 输入框右侧显示验证码图片（width: 120px, height: 40px）
- **AND** 鼠标悬停在图片上时显示手型光标（cursor: pointer）
- **AND** 图片右下角显示刷新图标（🔄 或 Iconify icon）

#### Scenario: 输入支持字母和数字
- **GIVEN** 验证码输入框已聚焦
- **WHEN** 用户输入任意字符（如 "A3xK"、"abc123"、特殊字符）
- **THEN** 输入框接受所有可打印字符（不限制为纯数字）
- **AND** maxlength="6" 限制最大长度

#### Scenario: 点击刷新验证码
- **GIVEN** 验证码图片已加载显示
- **WHEN** 用户点击验证码图片或刷新图标
- **THEN** 组件 emit `refresh` 事件
- **AND** 图片显示 loading 占位符（骨架屏或 spinner）
- **等待父组件传入新的 captchaImage prop**
- **AND** 新图片加载完成后替换旧图片（淡入淡出过渡效果）

#### Scenario: 图片加载失败处理
- **GIVEN** 验证码图片 src 无效或网络错误
- **WHEN** <img> 标签触发 onerror 事件
- **THEN** 组件 emit `error` 事件
- **AND** 显示错误占位符："加载失败，点击重试"
- **AND** 用户点击占位符可重新触发 refresh 事件

---

### Requirement: RememberMe 组件必须封装"记住我"复选框并集成浏览器 Credential Management API

系统 SHALL 提供 `RememberMe` Vue 组件（或直接在 LoginCard 内实现）用于"记住我"功能。组件 SHALL 包含：复选框（<el-checkbox>）、标签文字（"记住登录状态" 或 "记住我"）。组件 SHALL 支持 v-model 双向绑定（boolean 值）。**重要**：组件 SHALL 不直接操作 LocalStorage，而是通过控制父组件表单的 `autocomplete` 属性来启用/禁用浏览器的原生凭证管理功能。当值为 true 时，通知父组件设置 `autocomplete="username"` 和 `autocomplete="current-password"`；当值为 false 时，设置为 `autocomplete="off"`。

#### Scenario: 默认未选中状态
- **GIVEN** 使用 `<RememberMe v-model="rememberMe" />`
- **WHEN** 组件挂载且未传入初始值
- **THEN** 复选框未选中（modelValue = false）
- **AND** 组件 emit `update:autocomplete` 事件或调用父组件方法，建议设置 autocomplete="off"

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

#### Scenario: 浏览器兼容性提示（可选增强）
- **GIVEN** 组件渲染完成
- **WHEN** 检测到浏览器支持 Credential Management API
- **THEN** 可在复选框旁显示小图标提示："🔐 浏览器将安全保存您的登录信息"（tooltip 或帮助文本）
- **OR** 如果不支持，不显示额外提示（静默降级）

---

### Requirement: BrandSection 组件必须封装左侧品牌展示区域的视觉内容和布局（纯文字 + 图标方案）

系统 SHALL 提供 `BrandSection` Vue 组件用于左侧品牌展示区（桌面端布局）。**组件 SHALL 采用纯文字 + Iconify 图标方案，默认不依赖外部图片资源（Logo PNG/SVG）**。组件 SHALL 包含：**Iconify 图标区域**（替代传统 Logo 图片）、产品名称标题、Slogan 副标题、特性列表（可选，3-4 个核心特性图标+描述）、**柔和渐变背景（现代简约风格）**。组件 SHALL 支持 props 自定义：`icon` (string, **Iconify 图标标识符，如 'mdi:office-building-coutline'**)、`title` (string, 产品名称)、`slogan` (string, 标语)、`features` (Array<{icon, title, description}>, 特性列表)。组件 SHALL 使用 CSS Grid 或 Flexbox 实现垂直居中对齐。组件 SHALL 支持插槽（slots）：`icon` (**自定义图标区域，可替换为图片 Logo**)、`default` (自定义内容区域)、`footer` (底部附加内容如版权信息)。

#### Scenario: 默认渲染 - 纯文字 + Iconify 图标（现代简约风格）
- **GIVEN** 使用 `<BrandSection />` 不传任何 props
- **WHEN** 组件渲染（桌面端，父容器宽度 40%）
- **THEN** 显示**柔和渐变背景**（linear-gradient(135deg, #E8F4FD 0%, #F0E6FA 100%)）- 明亮清新
- **AND** 内容垂直居中、水平居中
- **AND** 显示默认 **Iconify 图标**（`mdi:office-building-coutline` 或 `ph:building-office`，64px，颜色 #5B9BD5）
  - **重要**：不使用外部图片文件（无 <img src="/logo.png">）
  - **实现方式**：<Icon icon="mdi:office-building-coutline" />
- **AND** 显示默认标题 "Uni-Admin"（字体大小: 32px, 字重: 600, 颜色: #1F2937, margin-top: 20px）
- **AND** 显示默认副标题 "统一企业管理平台"（字体大小: 16px, 颜色: #6B7280, margin-top: 12px）

#### Scenario: 自定义 Iconify 图标
- **GIVEN** 使用 `<BrandSection icon="mdi:rocket-launch-outline" title="MySystem" slogan="创新驱动未来" />`
- **WHEN** 组件渲染
- **THEN** 显示自定义的 Iconify 图标（mdi:rocket-launch-outline, 64px, #5B9BD5）
- **AND** 标题显示为 "MySystem"（非默认的 "Uni-Admin"）
- **AND** 副标题显示为 "创新驱动未来"
- **AND** 渐变背景保持不变

#### Scenario: 使用插槽替换为图片 Logo（可选增强）
- **GIVEN** 用户希望使用自定义图片 Logo 而非 Iconify 图标
- **WHEN** 使用以下模板：
  ```vue
  <BrandSection>
    <template #icon>
      <img src="/logo.png" alt="Uni-Admin Logo" width="64" height="64" />
    </template>
  </BrandSection>
  ```
- **THEN** #icon 插槽内容替换默认的 Iconify 图标
- **AND** 显示自定义的 <img> 标签（需确保图片文件存在于 public/ 目录）
- **AND** 其他内容仍使用 props 或默认值（title, slogan, features）

#### Scenario: 自定义特性行表
- **GIVEN** 使用 `<BrandSection :features="featuresList" />` 其中 featuresList 为：
  ```typescript
  [
    { icon: 'shield-check', title: '安全可靠', description: '企业级权限管理' },
    { icon: 'chart-bar', title: '数据可视化', description: '实时监控面板' },
    { icon: 'cog', title: '自动化运维', description: '降低运维成本' },
  ]
  ```
- **WHEN** 组件渲染
- **THEN** 在副标题下方显示特性列表（margin-top: 40px）
- **AND** 每个特性项包含：
  - 图标（Iconify 图标，32px, 颜色: #5B9BD5, background: rgba(91,155,213,0.1), border-radius: 8px, padding: 8px）
  - 标题（14px, font-weight: 600, color: #1F2937, margin-top: 12px）
  - 描述（12px, color: #6B7280, margin-top: 4px, line-height: 1.5）
- **AND** 特性项水平排列（flex row, gap: 32px）或在窄屏幕下垂直排列（gap: 20px）

#### Scenario: 使用插槽自定义内容
- **GIVEN** 使用以下模板：
  ```vue
  <BrandSection>
    <template #logo>
      <img src="/logo.png" alt="Logo" />
    </template>
    <template #footer>
      <p class="copyright">© 2026 Uni-Admin. All rights reserved.</p>
    </template>
  </BrandSection>
  ```
- **WHEN** 组件渲染
- **THEN** Logo 区域显示自定义的 <img> 标签
- **AND** 底部 footer 区域显示版权信息（字体大小: 12px, 颜色: #9CA3AF, margin-top: auto）
- **AND** 其他内容仍使用默认渲染（title, slogan, features）

#### Scenario: 移动端自适应隐藏
- **GIVEN** 视口宽度 < 992px（移动端）
- **WHEN** 父容器决定不渲染 BrandSection（或将其改为顶部横幅模式）
- **THEN** 组件本身不负责响应式逻辑（由父组件控制 v-if/v-show）
- **OR** 组件接受 `variant` prop（"full" | "compact" | "hidden"）控制显示模式
- **AND** variant="compact" 时：缩小为顶部横幅（height: 120px, padding: 20px, 仅显示 Logo + Title）
