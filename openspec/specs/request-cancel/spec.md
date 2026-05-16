# Request Cancel（请求取消）

## Purpose

定义 HTTP 请求的取消管理能力，包括 CancelManager 内置管理、防重复请求机制、手动取消、页面级批量取消等场景。

---

## ADDED Requirements

### Requirement: CancelManager 内置管理
系统 MUST 在每个 AxiosInstance 内置 CancelManager，统一管理四种取消场景：防重复请求、路由切换批量取消、组件卸载自动取消、手动取消。

#### Scenario: 注册请求并获取 AbortController
- **WHEN** 发起请求时经过请求拦截器
- **THEN** CancelManager 自动注册该请求，生成唯一 requestKey
- **AND** 返回关联的 AbortController 并注入 config.signal

#### Scenario: 清理已完成请求
- **WHEN** 请求完成（成功或失败）后进入响应拦截器 finally 块
- **THEN** CancelManager 从 pendingMap 中移除该请求记录

---

### Requirement: 防重复请求机制
系统 MUST 实现基于请求特征（URL + Method + Params + Data）的防重复机制，短时间内相同请求自动取消前一个。

#### Scenario: 相同 GET 请求自动取消前一个
- **WHEN** 在 2s 内对同一 URL+Params 发起第二次 GET 请求
- **THEN** 第一个请求被自动 abort
- **AND** 第二个请求正常发出

#### Scenario: 不同参数请求不互斥
- **WHEN** 对 `/users?page=1` 和 `/users?page=2` 分别发起请求
- **THEN** 两个请求同时进行，互不影响

#### Scenario: 关闭防重复
- **WHEN** 调用时传入 `{ dedupe: false }`
- **THEN** 即使相同请求也不取消前一个

---

### Requirement: 手动取消请求
系统 MUST 支持通过 API 手动取消指定请求。

#### Scenario: 通过 requestKey 取消
- **WHEN** 调用 `instance.cancelRequest(requestKey)`
- **THEN** 对应请求被 abort
- **AND** 该取消操作不会触发错误提示弹窗

#### Scenario: 取消不存在的请求
- **WHEN** 尝试取消一个不存在或已完成的 requestKey
- **THEN** 静默忽略，不抛出异常

---

### Requirement: 页面级批量取消
系统 MUST 支持按页面标识批量取消该页面发起的所有进行中请求。

#### Scenario: 路由切换时取消当前页面请求
- **WHEN** 配置了 pageKey 的请求在路由切换时触发清理
- **THEN** 该 pageKey 下所有进行中的请求被批量取消
- **AND** 其他页面的请求不受影响

#### Scenario: 未配置 pageKey 的请求不受影响
- **WHEN** 路由切换触发页面级清理
- **THEN** 未设置 pageKey 的请求继续正常执行
