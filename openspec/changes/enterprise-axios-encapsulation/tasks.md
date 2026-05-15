## 1. 项目基础设施搭建

- [ ] 1.1 创建 `packages/request` 包目录结构与 package.json（name: @uni-admin/request，依赖 axios + @uni-admin/shared-types）
- [ ] 1.2 配置 tsup 构建（支持 ESM/CJS 双格式、声明文件生成）
- [ ] 1.3 配置 TypeScript 严格模式与路径别名
- [ ] 1.4 创建 `apps/web/src/lib/request` Vue 适配层目录结构
- [ ] 1.5 在 apps/web/package.json 添加 @uni-admin/request workspace 依赖

## 2. 类型定义层（Type System）

- [ ] 2.1 定义 `RequestOptions<T>` 接口（扩展 AxiosRequestConfig，添加 loading/showError/returnRawResponse/returnBlob/skipToken/dedupe/pageKey 等 20+ 可选字段）
- [ ] 2.2 定义 `InternalRequestConfig` 接口（运行时合并后的完整配置，包含 _internal 元数据）
- [ ] 2.3 定义 `ErrorNotifier` 抽象接口（success/error/warning/info 四个方法）
- [ ] 2.4 定义 `AxiosInstanceWrapper` 类接口签名（get/post/put/del/generic request 方法 + loading 状态 + setToken/setBaseURL/setTimeout 动态修改方法）
- [ ] 2.5 定义 `UseRequestReturn` 类型（composable 返回值：请求方法 + loading Ref + instance 引用）
- [ ] 2.6 定义自定义错误类（BusinessError / HttpError / CancelError / NetworkError / TimeoutError）
- [ ] 2.7 创建 types/index.ts 统一导出所有类型

## 3. 核心引擎 — 配置合并（ConfigMerger）

- [ ] 3.1 实现 `ConfigMerger.merge(globalDefaults, instanceConfig, requestOptions)` 三层深合并函数
- [ ] 3.2 处理基础类型覆盖（string/number/boolean/null）：高优先级覆盖低优先级
- [ ] 3.3 处理对象类型深合并（递归合并嵌套对象）
- [ ] 3.4 处理数组字段策略（headers 合并而非覆盖，其他数组后者覆盖前者）
- [ ] 3.5 处理函数字段策略（取最高优先级的值）
- [ ] 3.6 编写 ConfigMerger 单元测试（覆盖普通覆盖/深合并/数组处理/边界情况）

## 4. 核心引擎 — AxiosInstance 工厂类

- [ ] 4.1 实现 `createRequestInstance(config)` 工厂函数，返回 AxiosInstanceWrapper 实例
- [ ] 4.2 实例内部维护独立状态：_config / _loadingCount / _loadingState / _defaults
- [ ] 4.3 实现 `get<T>(url, options?)` / `post<T>(url, data?, options?)` / `put<T>(url, data?, options?)` / `del<T>(url, options?)` 泛型方法
- [ ] 4.4 每个方法内部流程：合并 config → 注入 _internal 元数据 → 调用 axios.request → 响应处理
- [ ] 4.5 实现动态配置修改方法：setBaseURL() / setToken() / setTimeout() / updateConfig()
- [ ] 4.6 实现 loading getter 返回当前实例的响应式加载状态

## 5. 核心引擎 — CancelManager（请求取消管理器）

- [ ] 5.1 实现 `CancelManager` 类，内部维护 pendingMap（Map<requestKey, AbortController>）和 pageMap（Map<pageKey, Set<requestKey>>）
- [ ] 5.2 实现 `generateKey(config)` 方法：基于 URL + Method + 序列化(排序后 Params) + 序列化(排序后 Data) 生成唯一标识
- [ ] 5.3 实现 `register(config)` 方法：注册请求到 pendingMap，返回 AbortController 并注入 config.signal；检测防重复时自动 abort 旧请求
- [ ] 5.4 实现 `cancel(requestKey)` 方法：按 key 取消指定请求
- [ ] 5.5 实现 `cancelByPage(pageKey)` 方法：批量取消页面下所有进行中请求
- [ ] 5.6 实现 `cleanup(requestKey)` 方法：从 pendingMap 和 pageMap 中移除已完成请求记录
- [ ] 5.7 实现 `cleanupAll()` 方法：清空所有记录（用于登出等场景）
- [ ] 5.8 编写 CancelManager 单元测试（注册/取消/清理/防重复/页面级批量）

## 6. 核心引擎 — TokenManager（Token 管理器）

- [ ] 6.1 实现 `TokenManager` 类，封装 Token 的读取/存储/清除操作
- [ ] 6.2 实现 `getToken()` 方法：从存储（localStorage）读取 Token
- [ ] 6.3 实现 `setToken(token)` 方法：写入 Token 到存储
- [ ] 6.4 实现 `clearToken()` 方法：清除存储中的 Token
- [ ] 6.5 实现 `isInWhiteList(url)` 方法：判断 URL 是否匹配白名单（精确匹配 + 通配符匹配如 `/auth/**`）
- [ ] 6.6 实现 Token 白名单默认值：['/auth/login', '/auth/register', '/auth/captcha', '/public/**']

## 7. 核心引擎 — AuthLockManager（401 加锁管理器）

- [ ] 7.1 实现 `AuthLockManager` 类，内部维护 isRedirecting 原子布尔锁
- [ ] 7.2 实现 `handle401()` 方法：加锁判断 → 首次执行清空 Token + 跳转登录 → finally 解锁
- [ ] 7.3 保证并发 401 时只执行一次跳转（通过 isRedirecting 锁实现）
- [ ] 7.4 编写 AuthLockManager 单元测试（单次/并发/重置场景）

## 8. 核心引擎 — ErrorProcessor（错误处理器）

- [ ] 8.1 实现 `ErrorProcessor` 类，包含 `classify(error)` 方法将错误分类为 CANCEL/TIMEOUT/NETWORK/HTTP_401/HTTP_403/HTTP_429/HTTP_5XX/BIZ_ERROR
- [ ] 8.2 实现 `process(error, config)` 分类后路由到对应处理逻辑：
  - CANCEL → 静默 reject，不弹窗
  - 401 → 委托给 AuthLockManager.handle401()
  - 其他 → 根据 config.showError 决定是否调用 errorNotifier.error()
- [ ] 8.3 自定义错误消息映射表（超时/网络/403/429/5xx 默认提示文案）
- [ ] 8.4 业务错误从 response.data.message 提取展示

## 9. 核心引擎 — LoadingManager（Loading 状态管理器）

- [ ] 9.1 在 AxiosInstance 内部实现 `_incrementLoading()` 和 `_decrementLoading(force)` 方法
- [ ] 9.2 incrementLoading：计数+1，首次从 0→1 时触发 onLoadingChange(true)
- [ ] 9.3 decrementLoading：计数-1（force 模式直接归零），从 1→0 时触发 onLoadingChange(false)
- [ ] 9.4 请求开始时（拦截器前）调用 incrementLoading，结束时（finally 中）调用 decrementLoading
- [ ] 9.5 处理异常场景：网络错误/超时/取消 都必须确保 decrementLoading 被调用

## 10. 请求拦截器（Request Interceptor）

- [ ] 10.1 实现请求拦截器主函数：合并配置 → 记录 startTime → CancelManager 注册 → Token 注入 → 日志记录
- [ ] 10.2 Token 注入逻辑：检查白名单 + skipToken 开关 → 从 TokenManager 获取 → 设置 Authorization 头
- [ ] 10.3 将 InternalRequestConfig._internal 元数据注入到 config 对象（供响应拦截器使用）
- [ ] 10.4 开发环境日志输出：方法、URL、Params、Data（脱敏后）、Headers

## 11. 响应拦截器（Response Interceptor）

- [ ] 11.1 实现成功响应处理：校验 HTTP 状态码 → 校验业务 code（默认 200/0）→ 自动解包返回 data → returnRawResponse/rawBlob 判断
- [ ] 11.2 实现业务码可配置：支持 successCodes 自定义（如某些旧接口用 0 表示成功）
- [ ] 11.3 实现失败响应处理：ErrorProcessor.classify() → 分发处理 → Loading 减计数 → CancelManager cleanup
- [ ] 11.4 returnBlob=true 时跳过业务 code 解析，直接返回 response.data（Blob 类型）
- [ ] 11.5 响应耗时统计：endTime - startTime，传递给日志模块
- [ ] 11.6 finally 块确保：Loading 减计数 + CancelManager cleanup + 日志输出

## 12. Vue 适配层 — Adapters（适配器）

- [ ] 12.1 实现 `ElementPlusErrorNotifier`：使用 ElMessage.error() / ElMessage.success() 等
- [ ] 12.2 实现 `RouterAdapter`：封装 vue-router 的 push/replace，提供 navigateToLogin(path) 方法
- [ ] 12.3 实现 `StorageAdapter`：封装 localStorage 操作，提供 getToken/setToken/removeToken
- [ ] 12.4 实现 `LoadingAdapter`：将实例内部的 loading 状态转换为 Vue ref 对象

## 13. Vue 适配层 — Composables（组合式函数）

- [ ] 13.1 实现 `useRequest(options?)` composable：
  - 接收可选 instance 参数（默认使用 defaultInstance）
  - 返回 { get, post, put, del, loading, instance }
  - loading 为 shallowRef<boolean>，绑定到实例的 LoadingManager
- [ ] 13.2 实现 `useRequestAutoCancel(options?)` composable：
  - 在 useRequest 基础上增加组件生命周期管理
  - 使用 vue 的 onUnmounted 自动取消该 composable 发起的所有请求
  - 内部追踪该 composable 发起的 requestKey 集合
- [ ] 13.3 useRequest 支持传入自定义配置覆盖实例默认值

## 14. 多实例配置（Instances）

- [ ] 14.1 配置 default 实例（instances/default.ts）：baseURL=/api/v1, timeout=15000, showError=true, loading=true, 携带 Token
- [ ] 14.2 配置 file 实例（instances/file.ts）：baseURL=/api/file, timeout=300000, showError=true, loading=false（上传下载长超时）
- [ ] 14.3 配置 thirdparty 实例（instances/thirdparty.ts）：baseURL 来自环境变量, skipToken=true（第三方服务不带 Token）
- [ ] 14.4 每个实例独立的 ErrorNotifier / RouterAdapter / TokenManager / CancelManager / LoadingManager

## 15. 日志工具（Logger）

- [ ] 15.1 实现 `RequestLogger` 类，根据 env 区分日志策略
- [ ] 15.2 开发模式：console.group 输出完整请求信息（URL/Method/Params/Data/Headers/Response/Duration）
- [ ] 15.3 生产模式：仅收集关键指标（URL/method/duration/status），不输出控制台
- [ ] 15.4 参数脱敏工具函数 desensitize()：检测 password/phone/idCard/secret 等字段，替换为 ***

## 16. API 模块化拆分（API Modules）

- [ ] 16.1 创建 `apps/web/src/api/modules/` 目录结构
- [ ] 16.2 创建 user.api.ts：getUserList / getUserDetail / createUser / updateUser / deleteUser / updateUserStatus
- [ ] 16.3 创建 auth.api.ts：login / logout / getCaptcha / refreshToken
- [ ] 16.4 创建 system.api.ts（预留）：字典/角色/权限/菜单相关接口
- [ ] 16.5 每个接口定义完整的入参 interface 和返回泛型类型
- [ ] 16.6 创建 modules/index.ts barrel 导出文件

## 17. 统一导出入口

- [ ] 17.1 创建 packages/request/src/index.ts：导出所有类型、工厂函数、核心类
- [ ] 17.2 创建 apps/web/src/lib/request/index.ts：导出 composables / instances / adapters / types
- [ ] 17.3 确保 tree-shaking 友好（命名导出非 re-export 全部）

## 18. 单元测试

- [ ] 18.1 ConfigMerger 测试：三层覆盖/深合并/数组策略/空值边界（Vitest）
- [ ] 18.2 CancelManager 测试：注册/重复检测/取消/页面级清理/内存泄漏（Vitest）
- [ ] 18.3 TokenManager 测试：读写删/白名单匹配/通配符（Vitest）
- [ ] 18.4 AuthLockManager 测试：单次/并发/重置（Vitest）
- [ ] 18.5 ErrorProcessor 测试：分类准确性/各类错误处理路径（Vitest + msw mock）
- [ ] 18.6 AxiosInstance 集成测试：完整请求流程（mock server）（Vitest）

## 19. 迁移与验证

- [ ] 19.1 旧 api/index.ts 添加 @deprecated 注释 + console.warn 提示
- [ ] 19.2 迁移 login 页面 api 调用到新封装
- [ ] 19.3 迁移 dashboard 页面 api 调用到新封装
- [ ] 19.4 迁移 system/user 页面 api 调用到新封装
- [ ] 19.5 手动功能验证清单：
  - [ ] 正常请求 → 数据正确解包 ✅
  - [ ] 401 响应 → 跳转登录页且只跳一次 ✅
  - [ ] 业务错误 → 弹出错误提示 ✅
  - [ ] Loading 状态 → 请求中显示/完成后隐藏 ✅
  - [ ] showError:false → 不弹窗但 Promise reject ✅
  - [ ] 快速连续点击 → 前一个请求被取消 ✅
  - [ ] 页面切换 → 上一个页面请求被取消 ✅
  - [ ] 开发环境控制台 → 完整日志输出 ✅
  - [ ] 多实例隔离 → 各实例 loading 独立 ✅
