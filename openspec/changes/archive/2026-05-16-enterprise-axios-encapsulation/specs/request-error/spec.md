## ADDED Requirements

### Requirement: 错误分类处理策略
系统 MUST 根据错误类型采用不同的处理策略：CANCEL 类错误静默处理不弹窗；401 走加锁跳转逻辑；其他错误根据配置决定是否弹窗提示。

#### Scenario: 取消请求静默处理
- **WHEN** 请求被 cancel（手动/防重复/路由切换/组件卸载）
- **THEN** Promise reject 但不弹出任何错误提示
- **AND** Loading 计数正确递减

#### Scenario: 超时错误提示
- **WHEN** 请求超时（ECONNABORTED）
- **THEN** 弹出「请求超时，请稍后重试」提示（除非 showError=false）

#### Scenario: 网络错误提示
- **WHEN** 设备断网或 DNS 解析失败
- **THEN** 弹出「网络连接失败，请检查网络」提示

#### Scenario: 403 无权限提示
- **WHEN** 服务端返回 403
- **THEN** 弹出「没有权限访问该资源」提示

#### Scenario: 429 限流友好提示
- **WHEN** 服务端返回 429
- **THEN** 弹出「操作过于频繁，请稍后再试」提示

#### Scenario: 5xx 服务端错误提示
- **WHEN** 服务端返回 500/502/503/504
- **THEN** 弹出「服务器繁忙，请稍后重试」提示

#### Scenario: 业务错误码提示
- **WHEN** 后端返回 `{ code: 40001, message: '用户名已存在' }`
- **THEN** 弹出后端返回的 message 内容

---

### Requirement: 抽象错误通知接口
系统 MUST 定义抽象的错误通知接口 ErrorNotifier，默认提供 Element Plus 实现，允许替换为自定义 UI。

#### Scenario: 默认 Element Plus 提示
- **WHEN** 未自定义 notifier，触发错误提示
- **THEN** 使用 ElMessage.error() 显示

#### Scenario: 自定义错误通知实现
- **WHEN** 创建实例时传入自定义 `errorNotifier: customNotifier`
- **THEN** 所有错误提示使用自定义实现

---

### Requirement: 接口级关闭错误提示
系统 MUST 支持在每个请求级别通过 `showError: false` 关闭错误提示，由调用方自行处理 error。

#### Scenario: 关闭单个请求的错误提示
- **WHEN** 调用 `instance.get('/check', { showError: false })` 且该请求失败
- **THEN** 不弹出任何错误提示
- **AND** Promise 仍然 reject，调用方可 catch 处理

#### Scenario: 关闭错误提示但不影响其他请求
- **WHEN** 请求 A 设置 showError=false 失败，请求 B 正常配置失败
- **THEN** A 不弹窗，B 正常弹窗
