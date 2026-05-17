# Login Input Enhancements (Delta Spec)

## Purpose

增强登录页面输入框的交互体验，包括一键清空功能、聚焦视觉反馈和移动端响应式优化。

---

## ADDED Requirements

### Requirement: 登录表单的所有文本输入框必须支持一键清空功能

系统 SHALL 为用户名输入框、密码输入框和验证码输入框启用 Element Plus 的 `clearable` 属性。当输入框**有内容时**，右侧 SHALL 显示清空图标（×）；当输入框为空时，清空图标 SHALL 隐藏。点击清空图标 SHALL 立即清空输入框内容并隐藏图标。

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

## MODIFIED Requirements

### Requirement: LoginCard 组件必须封装登录表单的核心 UI 结构和交互逻辑

#### Scenario: 表单验证集成（更新错误展示方式）
- **GIVEN** 用户未填写用户名字段并提交
- **WHEN** LoginSchema.safeParse() 验证失败
- **THEN** 在用户名输入框下方**内联显示**错误提示（非全局 ElMessage 弹窗）
- **AND** 错误提示包含警告图标（mdi:alert-circle-outline）和红色文字（#EF4444）
- **AND** 错误提示伴随淡入+下滑动画（0.2s ease）
- **AND** 阻止表单提交（不 emit submit 事件）
