# Request Loading（Loading 状态管理）

## Purpose

定义 HTTP 请求的 Loading 状态管理能力，包括实例级计数器、接口级开关、异常回收机制等。

---

## ADDED Requirements

### Requirement: 实例级 Loading 计数器
系统 MUST 在每个 AxiosInstance 内部维护独立的 Loading 计数器，多实例之间 Loading 状态完全隔离。

#### Scenario: 单个请求开始时 Loading 变为 true
- **WHEN** 发起一个 loading=true 的请求
- **THEN** 实例的 loading 状态变为 true

#### Scenario: 所有请求完成后 Loading 变为 false
- **WHEN** 进行中的 3 个请求全部完成
- **THEN** 实例的 loading 状态变为 false

#### Scenario: 多实例 Loading 隔离
- **WHEN** 主 API 实例有进行中的请求，文件实例无请求
- **THEN** 主 API 实例 loading=true，文件实例 loading=false

---

### Requirement: 接口级 Loading 开关
系统 MUST 支持在每个请求级别控制是否显示 Loading，默认值继承自实例配置。

#### Scenario: 默认开启 Loading
- **WHEN** 实例配置 `loading: true`，接口调用未指定 loading
- **THEN** 该请求参与 Loading 计数

#### Scenario: 接口级关闭 Loading
- **WHEN** 实例配置 `loading: true`，接口调用传入 `{ loading: false }`
- **THEN** 该请求不参与 Loading 计数

#### Scenario: 全局关闭 Loading
- **WHEN** 实例配置 `loading: false`
- **THEN** 该实例所有请求都不参与 Loading 计数（接口级不可覆盖为 true）

---

### Requirement: 异常/取消时 Loading 正确回收
系统 MUST 确保请求异常失败或被取消时，Loading 计数正确递减，避免 Loading 卡死。

#### Scenario: 请求失败时减计数
- **WHEN** 一个进行中的请求因网络错误失败
- **THEN** Loading 计数减 1

#### Scenario: 请求被取消时减计数
- **WHEN** 一个进行中的请求被手动 cancel 或防重复机制取消
- **THEN** Loading 计数减 1
- **AND** 不触发错误提示

#### Scenario: 超时时减计数
- **WHEN** 一个请求超过设定时间未响应
- **THEN** Loading 计数减 1
- **AND** 触发超时错误提示（除非 showError=false）
