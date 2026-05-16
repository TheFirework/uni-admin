## ADDED Requirements

### Requirement: 多实例工厂创建
系统 MUST 提供工厂函数 `createRequestInstance(config)` 用于创建独立的 Axios 实例，每个实例拥有隔离的配置、拦截器、CancelManager、TokenManager、Loading 状态。

#### Scenario: 创建默认实例
- **WHEN** 调用 `createRequestInstance({ baseURL: '/api/v1' })`
- **THEN** 返回一个 AxiosInstanceWrapper 实例，包含 get/post/put/del 方法
- **AND** 该实例的配置与全局默认配置合并后生效
- **AND** 该实例的 Loading 状态与其他实例完全隔离

#### Scenario: 创建文件服务实例
- **WHEN** 调用 `createRequestInstance({ baseURL: '/api/file', timeout: 300000 })`
- **THEN** 返回独立实例，超时时间为 5 分钟
- **AND** 该实例不影响主 API 实例的任何行为

#### Scenario: 创建第三方服务实例
- **WHEN** 调用 `createRequestInstance({ baseURL: 'https://thirdparty.com/api', skipToken: true })`
- **THEN** 返回独立实例，默认跳过 Token 携带
- **AND** 该实例的错误处理可独立配置

---

### Requirement: 三层配置合并
系统 MUST 实现三层配置合并机制，优先级从高到低为：接口级 RequestOptions > 实例 InstanceConfig > 全局 GlobalDefaults。合并 MUST 采用深合并策略。

#### Scenario: 接口级配置覆盖实例配置
- **WHEN** 实例配置 `{ timeout: 15000, loading: true }`，接口调用时传入 `{ timeout: 30000, loading: false }`
- **THEN** 最终配置 timeout 为 30000，loading 为 false

#### Scenario: 实例配置覆盖全局默认
- **WHEN** 全局默认 `{ showError: true, successCodes: [200, 0] }`，实例配置 `{ showError: false }`
- **THEN** 该实例的所有请求默认不显示错误提示

#### Scenario: 未指定的字段使用上层默认值
- **WHEN** 全局默认 timeout=10000，实例未指定 timeout，接口调用也未指定
- **THEN** 最终 timeout 为 10000

#### Scenario: 数组字段后者覆盖前者
- **WHEN** 全局默认 headers 包含 `{ 'Content-Type': 'application/json' }`，实例配置 headers 添加 `{ 'X-Custom': 'value' }`
- **THEN** 最终 headers 包含两者（headers 特殊处理为合并而非覆盖）

---

### Requirement: 统一响应解包处理
系统 MUST 在响应拦截器中自动校验 HTTP 状态码和业务状态码，默认情况下自动解包返回 `data` 字段（类型 T），而非完整的 `AxiosResponse<ApiResponse<T>>`。

#### Scenario: 成功响应自动解包
- **WHEN** 后端返回 `{ code: 200, message: 'ok', data: [{ id: 1, name: 'test' }] }`
- **THEN** 调用方收到的结果是 `[{ id: 1, name: 'test' }]`（类型为 User[]）

#### Scenario: 业务错误码抛出异常
- **WHEN** 后端返回 `{ code: 40001, message: '参数错误', data: null }`
- **THEN** 抛出 BusinessError，包含 code 和 message
- **AND** 触发错误提示（除非 showError=false）

#### Scenario: HTTP 错误状态码处理
- **WHEN** 请求返回 HTTP 500
- **THEN** 抛出 HttpError，包含 status 和 statusText
- **AND** 触发错误提示

#### Scenario: returnRawResponse 开关
- **WHEN** 调用时传入 `{ returnRawResponse: true }`
- **THEN** 返回完整的 `AxiosResponse<ApiResponse<T>>`

#### Scenario: returnBlob 文件流模式
- **WHEN** 调用时传入 `{ returnBlob: true }`
- **THEN** 跳过业务 code 校验，直接返回 Blob 对象

---

### Requirement: 动态配置修改
系统 MUST 支持在运行时动态修改任意层的配置，修改后立即生效于后续请求。

#### Scenario: 动态修改 baseURL
- **WHEN** 调用 `instance.setBaseURL('https://new-api.com/v2')`
- **THEN** 后续所有请求使用新的 baseURL

#### Scenario: 动态修改 Token
- **WHEN** 调用 `instance.setToken('new-access-token')`
- **THEN** 后续请求头 Authorization 使用新 Token

#### Scenario: 动态修改超时时间
- **WHEN** 调用 `instance.setTimeout(30000)`
- **THEN** 后续请求超时时间为 30 秒

---

### Requirement: TypeScript 完整类型约束
系统 MUST 提供完整的 TypeScript 类型定义，支持泛型自动推导，所有 API 必须有明确的类型签名。

#### Scenario: 泛型自动推导返回类型
- **WHEN** 调用 `const users = await instance.get<User[]>('/users')`
- **THEN** users 类型推断为 `User[]`

#### Scenario: 默认泛型参数
- **WHEN** 调用 `const res = await instance.get('/users')` 不指定泛型
- **THEN** res 类型推断为 `unknown`

#### Scenario: RequestOptions 类型提示
- **WHEN** 在调用 `instance.get(url, ...)` 时输入第二个参数
- **THEN** IDE 自动提示所有可用选项（loading/showError/skipToken 等）

---

### Requirement: 环境区分日志
系统 MUST 根据当前环境变量区分日志输出策略：开发环境打印完整请求/响应信息（便于调试），生产环境仅输出脱敏关键信息到监控收集点。

#### Scenario: 开发环境完整日志
- **WHEN** 当前环境为 development，发起请求
- **THEN** 控制台输出：请求方法、URL、Params、Data、Headers、响应数据、耗时

#### Scenario: 生产环境脱敏日志
- **WHEN** 当前环境为 production，发起请求
- **THEN** 不输出到控制台
- **AND** 将 URL、方法、耗时、状态码发送至监控收集点
- **AND** 敏感参数（password、phone、idCard）自动脱敏
