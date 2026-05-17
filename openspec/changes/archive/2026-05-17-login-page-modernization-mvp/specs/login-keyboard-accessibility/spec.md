# Login Keyboard Accessibility (Delta Spec)

## Purpose

确保登录页面的键盘交互符合无障碍访问标准，提供高效的 Tab 导航和 Enter 键提交支持。

---

## ADDED Requirements

### Requirement: 登录表单必须遵循符合逻辑的 Tab 键导航顺序

系统 SHALL 确保登录表单内的可聚焦元素按照以下顺序排列（符合用户从上到下、从左到右的阅读习惯）：

```
用户名输入框 → 密码输入框 → [验证码输入框] → 记住我复选框 → "忘记密码？"链接 → 登录按钮
```

Tab 顺序 SHALL 通过 HTML DOM 自然顺序实现，**不使用负值 tabindex**。当用户按 Tab 键到达最后一个元素后再次按 Tab，焦点 SHALL 循环回到第一个元素（用户名输入框）。Shift+Tab SHALL 支持反向遍历。

#### Scenario: 正向 Tab 遍历所有表单元素
- **GIVEN** 登录页面已加载且用户名输入框获得初始焦点
- **WHEN** 用户连续按 6 次 Tab 键
- **THEN** 焦点依次经过：
  1. 用户名输入框
  2. 密码输入框
  3. [验证码输入框 - 如果 showCaptcha=true]
  4. 记住我复选框
  5. "忘记密码？"链接
  6. 登录按钮

#### Scenario: 反向 Shift+Tab 遍历
- **GIVEN** 焦点当前在登录按钮上
- **WHEN** 用户按 Shift+Tab
- **THEN** 焦点移动到"忘记密码？"链接（上一个元素）
- **AND** 继续按 Shift+Tab 可逆序遍历所有元素

#### Scenario: Tab 循环回到起始位置
- **GIVEN** 焦点当前在登录按钮（最后一个元素）
- **WHEN** 用户按 Tab
- **THEN** 焦点循环回到用户名输入框（第一个元素）

---

### Requirement: 登录表单必须支持 Enter 键快速提交

系统 SHALL 支持在任意输入框内按 Enter 键提交表单（通过 VeeValidate Form 的原生 `@submit` 事件处理）。当登录按钮处于 loading 状态时，Enter 键 SHALL 被忽略以防止重复提交。

> **设计决策说明**: 不添加全局 keydown 事件监听器，因为 VeeValidate 的 `<Form>` 组件已内置处理 Enter 键提交的逻辑，且 `<el-button>` 设置了 `native-type="submit"`。额外的全局监听器会增加复杂度且可能导致重复提交。

#### Scenario: 在用户名输入框按 Enter 提交
- **GIVEN** 用户已在用户名和密码输入框填写了有效内容
- **WHEN** 焦点在用户名输入框且用户按 Enter 键
- **THEN** 表单触发验证并尝试提交（与点击登录按钮行为一致）

#### Scenario: Loading 状态下 Enter 键被忽略
- **GIVEN** 用户已点击登录按钮且按钮处于 loading 状态（disabled）
- **WHEN** 用户在任意输入框按 Enter 键
- **THEN** 不触发表单重复提交
- **AND** 无错误或警告信息弹出

#### Scenario: Tab 顺序不受验证码显示/隐藏影响
- **GIVEN** 初始状态 `showCaptcha=false`（验证码隐藏）
- **WHEN** 登录失败后 `showCaptcha=true`（验证码显示）
- **THEN** Tab 顺序自动调整：在密码输入框后插入验证码输入框
- **AND** 其他元素的相对顺序保持不变
