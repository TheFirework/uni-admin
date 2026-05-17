# Login Error Display (Delta Spec)

## Purpose

定义登录页面错误信息的展示策略，采用混合模式：字段验证错误使用内联提示（精准定位），API 级错误使用全局通知（不遮挡视线）。

---

## ADDED Requirements

### Requirement: 字段级验证错误必须以内联方式显示在对应输入框下方

系统 SHALL 在每个 Field 组件的 el-form-item 下方添加错误提示区域。当字段验证失败时，该区域 SHALL 显示：
- 警告图标（Iconify: `mdi:alert-circle-outline`，16px）
- 错误文本（13px，颜色 #EF4444 红色）

错误提示区域 SHALL 使用 Vue `<transition name="error-fade">` 包裹，实现淡入+下滑动画效果（0.2s ease）。当用户开始修正输入且验证通过后，错误提示 SHALL 自动消失（淡出动画）。

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

---

### Requirement: API 级错误必须继续使用 ElMessage 全局通知展示

对于非字段验证的错误（如 401 未授权、422 验证失败、网络超时等），系统 SHALL 继续使用 Element Plus 的 `ElMessage.error()` 或 `ElMessage.warning()` 进行全局通知。这些通知 SHALL 显示在页面顶部中央位置，3-5 秒后自动消失，**不遮挡表单区域**以便用户可继续操作。

> **设计决策说明**: API 错误是全局性的，不属于特定字段，因此不适合用内联提示。ElMessage 的自动消失特性适合通知类消息，且不会阻止用户与表单交互。

#### Scenario: 401 未授权错误的全局通知
- **GIVEN** 用户输入了错误的用户名或密码
- **WHEN** 后端返回 HTTP 401 状态码
- **THEN** 页面顶部弹出红色全局通知："用户名或密码错误"
- **AND** 通知持续约 3-5 秒后自动消失
- **AND** 表单区域保持可交互状态

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

## MODIFIED Requirements

### Requirement: LoginCard 组件必须封装登录表单的核心 UI 结构和交互逻辑

#### Scenario: 表单验证集成（更新 - 移除 ElMessage 调用）
- **GIVEN** 用户未填写用户名字段并提交
- **WHEN** LoginSchema.safeParse() 验证失败
- **THEN** **不再调用** `ElMessage.warning(firstError.message)`
- **AND** 改为让 VeeValidate 的 `errorMessage` 通过 `v-if` 自然控制内联错误提示区域的显示/隐藏
- **AND** 可同时显示多个字段的错误（而非仅显示第一个）
