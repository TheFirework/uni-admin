## ADDED Requirements

### Requirement: 用户可以通过用户名和密码完成登录认证

系统 SHALL 提供用户名/密码登录表单，允许用户输入凭证并调用后端 `POST /auth/login` 接口完成身份验证。登录成功后，系统 SHALL 存储 AccessToken 到内存，并将 RefreshToken 通过 HttpOnly Cookie 持久化。系统 SHALL 在登录成功后自动跳转到目标页面（优先跳转到之前访问的页面，否则跳转到首页 `/`）。

#### Scenario: 成功登录（无验证码）
- **GIVEN** 用户在登录页面
- **WHEN** 用户输入正确的用户名和密码并点击"登录"按钮
- **THEN** 系统调用 `POST /auth/login` 接口发送凭证
- **AND** 接口返回成功响应（包含 accessToken、expiresIn、user 信息）
- **AND** 系统将 accessToken 存储到 Pinia AuthStore
- **AND** 系统设置 refreshToken 到 HttpOnly Cookie（由后端响应头设置）
- **AND** 系统显示"登录成功"提示消息
- **AND** 页面自动跳转到首页或之前访问的页面

#### Scenario: 登录失败 - 凭证错误
- **GIVEN** 用户在登录页面
- **WHEN** 用户输入错误的用户名或密码并点击"登录"按钮
- **THEN** 系统调用 `POST /auth/login` 接口
- **AND** 接口返回 401 Unauthorized 错误
- **AND** 系统显示错误提示："用户名或密码错误"
- **AND** 表单验证码输入框显示（如果之前未显示）
- **AND** 系统自动加载新的验证码图片
- **AND** 用户保持在登录页面，可重新输入凭证

#### Scenario: 登录失败 - 网络异常
- **GIVEN** 用户在登录页面
- **WHEN** 用户点击"登录"按钮但网络连接不可用
- **THEN** 系统捕获网络错误（ERR_NETWORK 或 timeout）
- **AND** 系统显示友好错误提示："网络连接失败，请检查网络后重试"
- **AND** 登录按钮恢复可用状态（移除 loading）
- **AND** 用户可重新尝试登录

#### Scenario: 登录失败 - 服务器内部错误
- **GIVEN** 用户在登录页面
- **WHEN** 后端服务返回 500 Internal Server Error
- **THEN** 系统捕获服务器错误
- **AND** 系统显示错误提示："服务器繁忙，请稍后再试"
- **AND** 记录错误日志到控制台（开发环境）或上报监控系统（生产环境）

---

### Requirement: 表单验证必须使用 vee-validate + Zod Schema 实现类型安全的校验

系统 SHALL 使用 `vee-validate` 库进行声明式表单验证，并结合 `zod-validator` 适配器复用 `@uni-admin/shared-types` 中定义的 `LoginSchema`。验证规则 SHALL 包括：用户名不能为空、密码不能为空、密码最小长度 6 位（可选）、验证码格式校验（4-6位数字，当显示时）。系统 SHALL 在字段失去焦点（blur）时触发验证，并在提交表单时再次验证所有字段。

#### Scenario: 必填字段验证 - 用户名为空
- **GIVEN** 用户在登录页面且用户名输入框为空
- **WHEN** 用户点击"登录"按钮或用户名输入框失去焦点
- **THEN** 系统显示验证错误消息："用户名不能为空"
- **AND** 用户名输入框边框变为红色（Element Plus 错误样式）
- **AND** 阻止表单提交

#### Scenario: 必填字段验证 - 密码为空
- **GIVEN** 用户在登录页面且密码输入框为空
- **WHEN** 用户点击"登录"按钮或密码输入框失去焦点
- **THEN** 系统显示验证错误消息："密码不能为空"
- **AND** 密码输入框边框变为红色
- **AND** 阻止表单提交

#### Scenario: 验证码格式验证（当验证码显示时）
- **GIVEN** 验证码输入框已显示
- **WHEN** 用户输入非数字字符（如字母 abc）到验证码字段
- **AND** 验证码字段失去焦点或用户提交表单
- **THEN** 系统显示验证错误消息："验证码必须为数字"
- **OR** 如果验证码长度不足4位，显示："验证码至少4位"

#### Scenario: 所有字段验证通过
- **GIVEN** 用户填写了有效的用户名（非空）、密码（非空，≥6位）
- **AND** 如果验证码显示，填写了有效的验证码（4-6位数字）
- **WHEN** 用户点击"登录"按钮
- **THEN** 系统不显示任何验证错误
- **AND** 表单正常提交，调用登录 API

---

### Requirement: 图形验证码必须在首次登录失败后条件性显示以防止暴力破解攻击

系统 SHALL 采用渐进式安全策略：首次登录失败后立即显示图形验证码输入框。验证码 SHALL 通过调用 `GET /auth/captcha` 接口获取，接口返回 `captchaKey`（验证码标识）和 `captchaImage`（Base64 编码的图片）。用户 SHALL 能够点击验证码图片刷新获取新的验证码。验证码有效期 SHALL 为 120 秒（由后端控制），过期后需重新获取。系统 SHALL 在提交登录请求时携带 `captcha` 和 `captchaKey` 参数（当验证码显示时）。

#### Scenario: 首次访问登录页 - 不显示验证码
- **GIVEN** 用户首次访问登录页面
- **WHEN** 页面渲染完成
- **THEN** 登录表单仅显示用户名和密码输入框
- **AND** 验证码输入框隐藏（display: none 或 v-if=false）
- **AND** 不调用 `/auth/captcha` 接口

#### Scenario: 首次登录失败 - 显示验证码
- **GIVEN** 用户首次提交登录表单但凭证错误
- **WHEN** 后端返回 401 Unauthorized
- **THEN** 系统将 `showCaptcha` 状态设置为 true
- **AND** 验证码输入框显示（带动画过渡效果）
- **AND** 系统自动调用 `GET /auth/captcha` 获取验证码图片
- **AND** 验证码图片渲染到 `<img>` 标签（使用 Base64 Data URL）
- **AND** 存储 captchaKey 到组件状态（用于后续提交）

#### Scenario: 点击刷新验证码
- **GIVEN** 验证码输入框已显示且当前有验证码图片
- **WHEN** 用户点击验证码图片
- **THEN** 系统调用 `GET /auth/captcha` 获取新的验证码
- **AND** 替换当前的验证码图片（带淡入淡出动画）
- **AND** 更新 captchaKey 为新值
- **AND** 清空验证码输入框的内容（可选，提升用户体验）

#### Scenario: 验证码提交
- **GIVEN** 验证码输入框已显示且用户已填写验证码
- **WHEN** 用户点击"登录"按钮
- **THEN** 系统将以下数据发送到 `POST /auth/login`：
  ```json
  {
    "username": "admin",
    "password": "123456",
    "captcha": "1234",
    "captchaKey": "uuid-xxxx"
  }
  ```
- **AND** 如果验证码错误，后端返回特定错误码
- **AND** 系统显示"验证码错误"提示并自动刷新验证码

#### Scenario: 验证码过期处理
- **GIVEN** 验证码输入框已显示且验证码已超过 120 秒未使用
- **WHEN** 用户提交包含过期 captchaKey 的登录请求
- **THEN** 后端返回 400 Bad Request 或 422 Unprocessable Entity
- **AND** 系统显示"验证码已过期，请重新获取"提示
- **AND** 自动刷新验证码图片

---

### Requirement: "记住我"功能必须使用浏览器原生 Credential Management API 并支持自动填充用户名

系统 SHALL 提供"记住我"复选框（默认未选中）作为**视觉提示**，但实际凭证持久化依赖 **浏览器原生的 Credential Management API**。系统 SHALL 在用户名和密码输入框上设置正确的 `autocomplete` 属性（`username` 和 `current-password`），以启用浏览器的自动填充和密码管理器集成。当登录成功时，系统 SHOULD 调用 `navigator.credentials.store()` 提示浏览器保存凭证（如果支持）。系统 MUST 确保**即使浏览器不支持 Credential API 或用户拒绝保存密码，也能通过 autocomplete 机制实现用户名自动填充**。此外，系统 SHALL 提供**额外的帮助文本或 tooltip 说明**，向用户解释"记住我"功能的作用和安全保障，提升用户体验和理解度。

#### Scenario: 启用浏览器自动填充（勾选"记住我"）
- **GIVEN** 用户勾选了"记住我"复选框
- **WHEN** 表单渲染或复选框状态变更
- **THEN** 用户名输入框设置 `autocomplete="username"`
- **AND** 密码输入框设置 `autocomplete="current-password"`
- **AND** 浏览器可在后续访问时自动填充之前保存的用户名和密码
- **AND** 如果浏览器已保存该站点的凭证，页面加载时可能显示自动填充下拉菜单

#### Scenario: 自动填充用户名（核心需求）
- **GIVEN** 用户之前成功登录且浏览器已保存凭证（或用户名）
- **WHEN** 用户再次访问登录页面
- **THEN** **用户名输入框应自动填充之前使用的用户名**（这是必须保证的核心行为）
- **AND** 密码输入框可能为空（取决于浏览器是否保存了密码）
- **AND** 用户仅需输入密码即可完成登录（提升用户体验）
- **实现机制**：
  - **优先级1**：浏览器 PasswordCredential API 自动填充（最安全、最无缝）
  - **优先级2**：浏览器基于 `autocomplete="username"` 的内置表单记忆功能
  - **降级方案**：如果以上两种方式均不可用，可考虑使用 LocalStorage 存储用户名（非密码）作为最后手段

#### Scenario: 禁用浏览器自动填充（未勾选"记住我"）
- **GIVEN** 用户未勾选"记住我"复选框
- **WHEN** 表单渲染或复选框状态为 false
- **THEN** 用户名输入框设置 `autocomplete="off"` 或移除 autocomplete 属性
- **AND** 密码输入框设置 `autocomplete="off"` 或 `new-password`
- **AND** 浏览器不会提示保存凭证或自动填充

#### Scenario: 登录成功后保存凭证到浏览器
- **GIVEN** 用户勾选了"记住我"且使用支持 Credential API 的现代浏览器（Chrome/Firefox/Edge/Safari）
- **AND** 输入了有效的用户名和密码并成功登录
- **WHEN** 登录成功回调执行
- **THEN** 系统检测 `'PasswordCredential' in window` 为 true
- **AND** 创建 `new PasswordCredential({ id, password, name, iconURL })` 对象
- **AND** 调用 `await navigator.credentials.store(credential)`
- **AND** 浏览器可能弹出确认对话框询问用户是否保存密码
- **OR** 如果用户拒绝或浏览器不支持，静默失败（不阻断流程）

#### Scenario: 降级处理 - 不支持 Credential API 的旧浏览器
- **GIVEN** 用户使用不支持 Credential Management API 的旧版浏览器（如 IE11）
- **WHEN** 系统检测到 `'credentials' in navigator` 为 false
- **THEN** 系统不调用 `navigator.credentials.store()`
- **AND** 仅依赖 HTML `autocomplete` 属性的基础行为（浏览器仍可记忆用户名）
- **AND** 控制台输出 info 级别日志："[Auth] 当前浏览器不支持 Credential API"
- **AND** 登录流程正常完成，不影响用户体验

#### Scenario: 安全性验证 - 凭证存储位置
- **GIVEN** 用户成功登录且浏览器保存了凭证
- **WHEN** 检查凭证存储机制
- **THEN** 凭证由操作系统级安全存储管理：
  - macOS: Keychain Access
  - Windows: Credential Manager
  - Linux: Secret Service API (GNOME Keyring/KWallet)
  - iOS: iCloud Keychain
  - Android: Android Keystore System
- **AND** JavaScript 无法直接读取存储的密码（沙箱隔离）
- **AND** 遵循同源策略（仅在相同 origin 下自动填充）

#### Scenario: 显示帮助文本/Tooltip 说明（用户体验增强）
- **GIVEN** 用户在登录页面且"记住我"复选框可见
- **WHEN** 用户鼠标悬停（hover）在"记住我"复选框或标签文字上
- **THEN** 系统显示 tooltip 提示框（延迟 300ms 后显示，避免误触发）
- **AND** Tooltip 内容为："勾选后，浏览器将记住您的登录状态，下次访问时自动填充用户名"
- **OR** 替代方案：在复选框右侧显示小图标（ℹ️ 或 ❓），点击后展开帮助文本
- **AND** 帮助文本样式：12px 字体、颜色 $text-muted (#9CA3AF)、最大宽度 250px
- **AND** Tooltip 位置：复选框的上方或右侧（避免遮挡表单）

#### Scenario: 可选增强 - 展开式详细说明
- **GIVEN** 项目配置启用详细说明模式（`rememberMeHelpMode: 'expand'`）
- **WHEN** 用户点击帮助图标
- **THEN** 在复选框下方展开详细说明区域（高度动画过渡）
- **AND** 详细说明包含：
  - 标题："什么是\"记住我\"？"
  - 功能说明列表：
    - ✅ 自动填充用户名（下次登录更快捷）
    - ✅ 浏览器安全保存（使用系统级加密存储）
    - ⚠️ 不保存密码明文（遵循安全最佳实践）
    - 💡 公共设备建议关闭（防止他人访问您的账号）
  - "了解更多"链接（可选，指向公司安全政策文档）
- **AND** 再次点击帮助图标可收起说明区域

#### Scenario: 移动端适配 - 触摸交互
- **GIVEN** 用户在移动设备访问登录页面
- **WHEN** 用户触摸"记住我"帮助区域
- **THEN** Tooltip 改为点击触发（替代 hover，因为移动端无 hover 概念）
- **OR** 使用长按手势（长按 500ms）显示提示
- **AND** 提示显示在屏幕中央或作为底部弹出层（避免触摸目标被遮挡）
- **AND** 点击页面其他区域可关闭提示

---

### Requirement: "忘记密码"功能必须提供用户友好的提示信息

系统 SHALL 在登录表单区域提供"忘记密码？"链接（位于"记住我"复选框的右侧或下方）。当用户点击该链接时，系统 SHALL 显示友好的提示信息，告知用户如何重置密码。当前阶段 SHALL **不实现完整的密码重置流程**（如邮箱验证、短信验证等），而是显示静态提示或联系管理员的信息。链接样式 SHALL 符合现代简约设计：文字链接（非按钮）、主色调蓝色、hover 时下划线或颜色加深。

#### Scenario: 默认状态 - 显示"忘记密码？"链接
- **GIVEN** 用户在登录页面
- **WHEN** 页面渲染完成
- **THEN** 在"记住我"复选框的同一行（右侧）或下方显示"忘记密码？"链接
- **AND** 链接文字颜色为 $primary-color (#5B9BD5)
- **AND** 链接无下划线（默认状态）
- **AND** hover 时显示下划线或颜色加深至 #4A8BC4

#### Scenario: 点击"忘记密码？" - 显示提示信息（推荐方案）
- **GIVEN** 用户点击"忘记密码？"链接
- **WHEN** click 事件触发
- **THEN** 系统调用 `ElMessage.info()` 或 `ElMessageBox.alert()` 显示提示信息
- **AND** 提示内容包含：
  - 标题："忘记密码？"
  - 正文内容选项（可配置）：
    - 方案A（推荐）："请联系管理员重置您的密码。"
    - 方案B（详细）："如需重置密码，请联系系统管理员：<br/>📧 admin@company.com<br/>📞 400-xxx-xxxx"
  - 确认按钮："我知道了"
- **AND** 不触发页面跳转或路由变化

#### Scenario: 可选增强 - 弹窗模式（替代 ElMessage）
- **GIVEN** 项目配置使用弹窗模式（`forgotPasswordMode: 'dialog'`）
- **WHEN** 用户点击"忘记密码？"链接
- **THEN** 系统使用 `<el-dialog>` 显示模态对话框
- **AND** 对话框包含：
  - 标题："重置密码"
  - 图标：ℹ️ 信息图标或 🔑 钥匙图标
  - 内容：联系管理员的详细信息（邮箱、电话、工单系统链接）
  - 操作按钮："联系管理员"（可跳转邮件客户端）+ "关闭"
- **AND** 背景遮罩层（modal overlay）阻止与登录表单交互

#### Scenario: 无障碍访问支持
- **GIVEN** 屏幕阅读器用户访问登录页面
- **WHEN** 焦点移动到"忘记密码？"链接
- **THEN** 链接具有明确的 `aria-label`："忘记密码，点击获取重置密码帮助"
- **OR** 使用语义化 HTML：`<a href="#" role="button" aria-describedby="forgot-password-help">`
- **AND** 键盘可聚焦（Tab 键可达）
- **AND** Enter/Space 键可激活（触发提示显示）

---

### Requirement: 登录页面必须提供企业级的 UI/UX 设计和响应式布局

系统 SHALL 采用左右分栏布局（桌面端 ≥992px）：左侧品牌展示区（40%宽度），右侧登录表单区（60%宽度）。移动端（<992px）SHALL 切换为上下堆叠布局（品牌区在上，表单在下）。UI 设计 SHALL 符合企业级管理后台的专业形象：渐变背景、卡片阴影、圆角设计、清晰的视觉层次。系统 SHALL 支持键盘导航（Tab 键切换输入框、Enter 键提交表单）和无障碍访问（ARIA 标签、合适的颜色对比度）。

#### Scenario: 桌面端布局渲染（≥992px）
- **GIVEN** 用户在桌面设备访问登录页面（视口宽度 ≥ 992px）
- **WHEN** 页面渲染完成
- **THEN** 页面显示为左右分栏布局
- **AND** 左侧区域（40%宽度）展示品牌内容：
  - Logo 或产品图标
  - 产品名称 "Uni-Admin"
  - Slogan："统一企业管理平台"
  - 渐变背景（#667eea → #764ba2）
  - 可选：3-4 个核心特性图标列表
- **AND** 右侧区域（60%宽度）展示白色登录卡片：
  - 居中显示，最大宽度 420px
  - 包含完整的登录表单
  - 卡片阴影：0 8px 32px rgba(0, 0, 0, 0.1)
  - 圆角：12px

#### Scenario: 移动端布局渲染（<992px）
- **GIVEN** 用户在移动设备访问登录页面（视口宽度 < 992px）
- **WHEN** 页面渲染完成
- **THEN** 页面切换为上下堆叠布局
- **AND** 顶部区域显示简化的品牌内容（Logo + 产品名称）
- **AND** 品牌区高度缩小（约 150px）
- **AND** 下方显示登录表单（占满剩余空间）
- **AND** 表单卡片无边距或小边距（16px）
- **AND** 所有输入框和按钮适配触摸操作（最小高度 44px）

#### Scenario: 键盘导航支持
- **GIVEN** 用户在登录页面
- **WHEN** 用户按 Tab 键
- **THEN** 焦点按顺序在以下元素间循环：
  1. 用户名输入框
  2. 密码输入框
  3. 验证码输入框（如果显示）
  4. 验证码图片（如果显示，可聚焦用于刷新）
  5. "记住我"复选框
  6. "忘记密码"链接（如果有）
  7. "登录"按钮
- **AND** 当前聚焦元素有明显的高亮样式（outline 或 box-shadow）

#### Scenario: Enter 键提交表单
- **GIVEN** 用户在任意输入框（用户名、密码、验证码）
- **WHEN** 用户按下 Enter 键
- **THEN** 系统触发表单提交（等同于点击"登录"按钮）
- **AND** 如果表单验证失败，不提交并显示第一个错误

#### Scenario: 无障碍访问支持
- **GIVEN** 屏幕阅读器用户访问登录页面
- **WHEN** 屏幕阅读器解析页面
- **THEN** 所有输入框具有关联的 `<label>` 元素（通过 for/id 匹配）
- **AND** 关键元素具有 ARIA 标签：
  - 登录表单：`role="form"` + `aria-label="登录表单"`
  - 密码输入框：`aria-describedby="password-hint"`
  - 错误消息：`role="alert"` + `aria-live="assertive"`
- **AND** 颜色对比度符合 WCAG 2.1 AA 标准（文本对比度 ≥ 4.5:1）

---

### Requirement: Loading 状态管理必须防止重复提交并提供清晰的用户反馈

系统 SHALL 在用户点击"登录"按钮后立即进入 loading 状态：禁用登录按钮、显示 loading 动画（旋转图标或文字"登录中..."）、防止用户再次点击。Loading 状态 SHALL 持续到 API 请求完成（成功或失败）。如果 API 请求耗时超过 5 秒，系统 SHALL 显示超时提示。系统 SHALL 在任何情况下都能恢复到正常状态（finally 块确保按钮恢复可用）。

#### Scenario: 正常 Loading 流程
- **GIVEN** 用户填写完表单并点击"登录"按钮
- **WHEN** API 请求发起
- **THEN** 登录按钮立即进入 disabled 状态
- **AND** 按钮文字变为"登录中..."
- **AND** 按钮显示 Element Plus 的 loading 图标（旋转动画）
- **AND** 所有输入框设为 readonly（可选，防止修改）

#### Scenario: Loading 结束 - 登录成功
- **GIVEN** 当前处于 loading 状态
- **WHEN** API 请求成功返回（200 OK）
- **THEN** 按钮恢复正常状态（移除 disabled 和 loading）
- **AND** 显示成功提示消息
- **AND** 执行页面跳转（loading 状态自然结束）

#### Scenario: Loading 结束 - 登录失败
- **GIVEN** 当前处于 loading 状态
- **WHEN** API 请求失败（4xx/5xx 错误）
- **THEN** 按钮恢复正常状态
- **AND** 显示错误提示消息
- **AND** 用户可重新编辑表单并再次提交

#### Scenario: 超时处理
- **GIVEN** 当前处于 loading 状态
- **WHEN** API 请求超过 10 秒未响应（axios 默认超时）
- **THEN** axios 抛出 ECONNABORTED 错误
- **AND** @uni-admin/request 的错误中间件捕获该错误
- **AND** 系统显示超时提示："请求超时，请检查网络后重试"
- **AND** 按钮恢复正常状态

#### Scenario: 防止重复提交
- **GIVEN** 用户快速连续点击"登录"按钮两次（间隔 < 300ms）
- **WHEN** 第一次点击触发 API 请求并进入 loading 状态
- **THEN** 第二次点击被忽略（因为按钮已 disabled）
- **AND** 只发起一次 API 请求
- **AND** 不会出现重复登录或重复 Token 的问题

---

### Requirement: 错误处理必须区分不同错误类型并提供用户友好的中文提示

系统 SHALL 捕获登录过程中的所有异常，并根据错误类型显示对应的友好提示消息。错误分类 SHALL 包括：网络错误（无法连接服务器）、凭证错误（401 Unauthorized）、验证码错误（422 Unprocessable Entity）、账号锁定（403 Forbidden）、服务器错误（500 Internal Server Error）、请求超时（ECONNABORTED）。所有错误消息 SHALL 使用中文，避免技术术语（如不显示 HTTP 状态码或堆栈信息）。开发环境 SHALL 在控制台输出详细错误日志；生产环境 SHALL 仅显示用户友好提示。

#### Scenario: 网络错误提示
- **GIVEN** 设备断开网络连接或 DNS 解析失败
- **WHEN** 用户点击"登录"按钮
- **THEN** axios 抛出 ERR_NETWORK 错误
- **AND** 系统显示 ElMessage.error("网络连接失败，请检查网络后重试")
- **AND** 开发环境控制台输出完整错误对象

#### Scenario: 凭证错误提示（401）
- **GIVEN** 用户输入错误的用户名或密码
- **WHEN** 后端返回 401 Unauthorized
- **THEN** 系统显示 ElMessage.error("用户名或密码错误")
- **AND** 触发验证码显示逻辑（如果尚未显示）

#### Scenario: 验证码错误提示（422）
- **GIVEN** 用户输入了错误的验证码
- **WHEN** 后端返回 422 Unprocessable Entity 且 error message 包含 "captcha"
- **THEN** 系统显示 ElMessage.error("验证码错误，请重新输入")
- **AND** 自动刷新验证码图片
- **AND** 清空验证码输入框并聚焦

#### Scenario: 账号锁定提示（403）
- **GIVEN** 用户账号因多次登录失败被临时锁定
- **WHEN** 后端返回 403 Forbidden
- **THEN** 系统显示 ElMessage.warning("账号已被锁定，请 30 分钟后重试或联系管理员")
- **AND** 禁用登录按钮 30 秒倒计时（可选）

#### Scenario: 服务器错误提示（500）
- **GIVEN** 后端服务发生未预期的异常
- **WHEN** 后端返回 500 Internal Server Error
- **THEN** 系统显示 ElMessage.error("服务器繁忙，请稍后再试")
- **AND** 生产环境不上报敏感信息（仅记录到监控系统）

---

### Requirement: Pinia AuthStore 必须集中管理用户认证状态和会话生命周期

系统 SHALL 创建 `useAuthStore` (Pinia store) 来集中管理认证相关状态。Store SHALL 包含以下 state：`user` (User | null)、`accessToken` (string | null)、`isAuthenticated` (boolean)、`rememberMe` (boolean)。Store SHALL 提供以下 actions：`login(credentials)` - 执行登录并更新状态、`logout()` - 清除状态并调用登出 API、`checkAuth()` - 检查当前 Token 是否有效、`refreshToken()` - 刷新 AccessToken。Store SHALL 支持持久化插件（可选，持久化 user 基本信息，不持久化敏感 Token）。

#### Scenario: 登录成功后更新 Store 状态
- **GIVEN** AuthStore 处于初始状态（user=null, isAuthenticated=false）
- **WHEN** 调用 `authStore.login({ username: 'admin', password: '123456' })`
- **AND** API 返回成功响应 `{ accessToken: 'xxx', expiresIn: 900, user: { userId: '1', username: 'admin', ... } }`
- **THEN** Store 状态更新为：
  ```
  {
    user: { userId: '1', username: 'admin', email: '...', roles: ['admin'] },
    accessToken: 'xxx',
    isAuthenticated: true,
    rememberMe: false
  }
  ```

#### Scenario: 登出后清除 Store 状态
- **GIVEN** 用户当前已登录（isAuthenticated=true）
- **WHEN** 调用 `authStore.logout()`
- **THEN** 系统调用 `POST /auth/logout` 接口通知后端清除 RefreshToken
- **AND** Store 状态重置为初始值：
  ```
  {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    rememberMe: false
  }
  ```
- **AND** 页面跳转到登录页面

#### Scenario: 检查认证状态（页面刷新后恢复会话）
- **GIVEN** 用户之前已登录但刷新了页面（内存中的 AccessToken 丢失）
- **WHEN** 应用初始化时调用 `authStore.checkAuth()`
- **THEN** 系统检查是否存在有效的 RefreshToken Cookie
- **AND** 如果存在，调用 `POST /auth/refresh-token` 获取新的 AccessToken
- **AND** 更新 Store 状态为已认证
- **OR** 如果不存在或刷新失败，保持未认证状态并跳转到登录页

#### Scenario: Token 自动刷新（接近过期时）
- **GIVEN** 用户当前已登录且 AccessToken 即将在 5 分钟内过期
- **WHEN** 用户发起任意 API 请求
- **THEN** @uni-admin/request 的 TokenManager 检测到即将过期
- **AND** 自动调用 `POST /auth/refresh-token` 刷新 Token
- **AND** 更新 Store 中的 accessToken 为新值
- **AND** 原始 API 请求使用新 Token 重试（用户无感知）
