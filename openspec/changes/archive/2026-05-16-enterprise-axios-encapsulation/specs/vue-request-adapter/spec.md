## ADDED Requirements

### Requirement: useRequest Composable
系统 MUST 提供 `useRequest` 组合式函数，封装请求实例并返回响应式 loading 状态和类型安全的请求方法。

#### Scenario: 基本使用
- **WHEN** 在 Vue 组件中调用 `const { get, post, loading } = useRequest()`
- **THEN** get/post 是类型安全的请求方法
- **AND** loading 是 Ref<boolean> 可直接绑定到模板

#### Scenario: 指定实例
- **WHEN** 调用 `useRequest({ instance: fileInstance })`
- **THEN** 返回的请求方法绑定到 fileInstance

#### Scenario: 泛型类型推导
- **WHEN** 调用 `const data = await get<User[]>('/users')`
- **THEN** data 类型为 User[]

---

### Requirement: Vue Router 集成
系统 MUST 通过适配器集成 vue-router，401 时自动跳转登录页，支持配置目标路由路径。

#### Scenario: 401 自动跳转登录
- **WHEN** 收到 401 响应且已锁定为首次处理
- **THEN** 调用 `router.push('/login')` 跳转登录页

#### Scenario: 自定义登录路径
- **WHEN** 创建实例时配置 `loginPath: '/auth/signin'`
- **THEN** 401 时跳转到 /auth/signin

#### Scenario: 路由切换取消页面请求
- **WHEN** 配置了 router 集成且路由发生变化
- **THEN** 自动取消上一页面的所有进行中请求（带 pageKey 的请求）

---

### Requirement: 组件卸载自动取消
系统 MUST 提供 `useRequestAutoCancel` composable 或指令，在组件 onUnmounted 时自动取消该组件发起的所有进行中请求。

#### Scenario: 组件卸载时自动取消
- **WHEN** 使用 `useRequestAutoCancel()` 的组件被销毁
- **THEN** 该组件内发起的所有进行中请求被自动取消
- **AND** 不触发错误提示
- **AND** Loading 计数正确回收

#### Scenario: 组件正常时不影响请求
- **WHEN** 组件仍在生命周期内
- **THEN** 请求正常进行，不会被意外取消

---

### Requirement: 响应式 Loading 与模板绑定
系统 MUST 返回的 loading 状态必须是 Vue Ref 对象，可直接用于 v-loading、:disabled 等绑定。

#### Scenario: 绑定到 Element Plus 组件
- **WHEN** `<el-table :data="list" v-loading="loading" />`
- **THEN** 请求进行中表格显示 loading 遮罩

#### Scenario: 绑定到按钮禁用
- **WHEN** `<el-button :disabled="loading" @click="handleSubmit">提交</el-button>`
- **THEN** 请求进行中按钮禁用
