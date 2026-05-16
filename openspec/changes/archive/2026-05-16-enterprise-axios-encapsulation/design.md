## Context

### 项目现状

uni-admin 是一个基于 pnpm monorepo 的全栈管理系统，前端使用 Vue3 + Vite + TypeScript + Pinia + Element Plus，后端使用 NestJS + Prisma + MySQL + Redis。

当前 API 请求层（[apps/web/src/api/index.ts](../../../apps/web/src/api/index.ts)）仅做了最基础的 axios 封装：
- 单一 axios 实例，基础 baseURL 和 timeout 配置
- 简单的请求/响应拦截器（几乎为空）
- 响应处理仅做 code === 200/0 判断
- 401 处理直接 `window.location.href = '/login'`（**存在并发重复跳转 bug**）
- 导出 get/post/put/del 四个透传函数

### 约束条件

- **框架深度集成 Vue**: Loading 用 ref、路由跳转用 vue-router、组件卸载用 onUnmounted
- **多实例隔离**: 主 API / 文件服务 / 第三方服务各自独立配置、中间件管道、缓存、Token
- **TypeScript 严格模式**: 完整类型约束、泛型自动推导
- **渐进式交付**: P0 最小可用 → P1 高级能力 → P2 安全监控 → P3 熔断降级
- **向后兼容过渡期**: 旧封装保留至迁移完成
- **Monorepo 共享**: 核心逻辑放 `packages/request`，Vue 适配放 `apps/web/src/lib/request`

### 利益相关者

- 前端开发团队：主要使用者，需学习新 API 并迁移现有调用
- 后端开发团队：需确保响应格式符合 `ApiResponse<T>` 约定
- 新成员：通过类型定义和 API 模块文件快速上手

## Goals / Non-Goals

**Goals:**

1. 建立基于 **洋葱模型（Onion Model / Middleware Pipeline）** 的企业级 Axios 封装架构
2. 实现三层架构：**HttpClient 包装层 → Pipeline 洋葱引擎层 → 裸 axios 实例层**
3. 实现多实例工厂，支持不同服务独立配置与隔离
4. 实现三层配置合并（全局默认 < 实例配置 < 接口级覆盖），接口级可精细化控制 20+ 开关
5. 统一响应处理：双层状态码校验（HTTP + Business）、默认自动解包返回 T
6. Token 管理：白名单机制、自动携带、401 加锁只处理一次
7. Loading 状态：实例级计数器（多实例隔离）、接口级开关、异常/取消自动减计数
8. 统一错误处理：分类策略（Cancel 静默 / 401 跳转 / 其他弹窗）、抽象 UI 接口 + Element Plus 默认实现
9. 请求取消：CancelManager 内置统一管理（防重复 / 路由切换 / 组件卸载 / 手动）
10. TypeScript 完整类型：RequestOptions 全部 Optional + 泛型推导
11. Vue 深度适配：useRequest composable、响应式 loading、路由集成
12. 模块化 API 管理：按业务拆分、强类型约束、统一导出
13. **每个能力独立为中间件文件，单一职责，新增功能不改已有代码**

**Non-Goals（P0 不包含）：**

- ❌ RetryEngine 重试机制（P1）
- ❌ CacheEngine 缓存引擎（P1）
- ❌ Token Refresh 竞态处理与请求队列重放（P1）
- ❌ 上传/下载进度回调（P1）
- ❌ 接口签名防重放（MD5/SHA256 + timestamp + nonce）（P2）
- ❌ TraceId 全链路追踪（P2）
- ❌ 监控埋点 + 慢接口告警（P2）
- ❌ 参数脱敏 + 日志分级（P2）
- ❌ 熔断降级（429 退避 + 5xx 连续失败熔断）（P3）
- ❌ 浏览器并发队列控制（P3）
- ❌ React/其他框架适配器（不在当前规划）

## Decisions

### ★ 决策 0：洋葱模型（Onion Model）核心架构 — A+C 组合方案

**这是本次架构设计的核心决策，所有其他决策都围绕此展开。**

**选择**: **A+C 组合方案** — 企业级最优解

```
┌─────────────────────────────────────────────────────────────────────┐
│                    三层架构 (A+C 组合)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Layer 3: HttpClient (包装层)                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  get<T>() / post<T>() / put<T>() / del<T>()                │   │
│   │  setToken() / setBaseURL() / setTimeout()                  │   │
│   │  loading (getter) / use() (插件注册)                       │   │
│   └──────────────────────────────┬──────────────────────────────┘   │
│                                  │ 调用                              │
│   Layer 2: Pipeline (洋葱引擎)    ↓                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │  middleware_1.before → middleware_N.before                   │   │
│   │                         ↓                                   │   │
│   │  ┌─────────────────────────────────────────────────────┐   │   │
│   │  │  Layer 1: Raw Axios Instance (裸实例)               │   │   │
│   │  │  axios.create({ interceptors: [] })                 │   │   │
│   │  │  零拦截器，纯粹的 HTTP 通信层                        │   │   │
│   │  └─────────────────────────────────────────────────────┘   │   │
│   │                         ↑                                   │   │
│   │  middleware_N.after ← middleware_1.after                   │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   数据流:                                                            │
│   业务代码 → HttpClient.get(url, opts)                               │
│           → ConfigMerger.merge(三层配置)                             │
│           → new RequestContext(config)                               │
│           → pipeline.execute(ctx)                                    │
│           → 中间件链下行 (Before)                                     │
│           → rawAxios.request(config)                                 │
│           → 中间件链上行 (After)                                      │
│           → 返回解包后的 T                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**为什么选择洋葱模型而非传统拦截器？**

| 维度 | 传统拦截器（axios.interceptors） | 洋葱模型（Pipeline） |
|------|-------------------------------|---------------------|
| **代码组织** | 2 个大文件（request/response interceptor） | N 个小文件（每个中间件 ~30-80 行） |
| **新增能力** | 修改现有拦截器函数 | 新增 `.use('name', newMiddleware)` 一行 |
| **删除能力** | 修改现有拦截器函数 | `.eject('name')` 一行 |
| **测试难度** | 需要 mock 整个拦截器 | 每个中间件可独立单元测试 |
| **执行顺序** | 代码书写顺序硬编码 | `.use()` 注册顺序决定，可视化强 |
| **短路能力** | 不支持 | 支持（`terminated` + `shortcutResult`） |
| **中间件通信** | 依赖 config._internal 透传 | 通过 `ctx.meta` 共享状态总线 |
| **调试体验** | 断点打在一个大函数里 | 可逐个中间件命名断点调试 |
| **学习成本** | 低（熟悉 axios 即可） | 中（需理解洋葱模型概念） |
| **性能开销** | 几乎无 | 微量（~0.2ms/请求，可忽略） |

**解决的核心痛点**:
- ❌ 「拦截器逻辑过重、耦合」→ ✅ 每个中间件单一职责
- ❌ 「新增功能修改核心代码」→ ✅ 新增 = 新增中间件文件
- ❌ 「顺序依赖脆弱」→ ✅ `.use()` 顺序即执行顺序
- ❌ 「Cancel 异常被吞」→ ✅ errorMiddleware 用 try/catch 精确分类
- ❌ 「401 并发重复」→ ✅ authLockManager 作为独立依赖
- ❌ 「Loading 计数泄漏」→ ✅ loadingMiddleware 用 try/finally 保证
- ❌ 「缓存 key 污染」→ ✅ cacheMiddleware 独立控制 key 生成读写

---

### 决策 1：包结构与分层架构

**选择**: 混合方案 — `packages/request`（核心）+ `apps/web/lib/request`（Vue 适配）

**基于洋葱模型的目录结构**:

```
packages/request/
├── src/
│   ├── core/
│   │   ├── Pipeline.ts              # ★ 洋葱模型引擎（~80行核心代码）
│   │   ├── context.ts               # RequestContext 类型定义与工厂
│   │   ├── HttpClient.ts            # ★ 包装层：对外暴露标准化 API
│   │   ├── ConfigMerger.ts          # 三层配置合并引擎
│   │   └── types.ts                 # 核心接口汇总导出
│   │
│   ├── middlewares/                 # ★ 每个能力一个中间件文件（单一职责）
│   │   ├── index.ts                 # 默认管道组装 & 导出
│   │   ├── config.merge.ts          # 配置合并中间件 (~40行)
│   │   ├── loading.ts               # Loading 计数中间件 (~35行)
│   │   ├── cancel.ts                # 请求取消中间件 (~55行)
│   │   ├── token.ts                 # Token 注入中间件 (~30行)
│   │   ├── log.request.ts           # 请求日志中间件 (~25行)
│   │   ├── unpack.ts                # 响应解包中间件 (~45行)
│   │   ├── error.ts                 # 错误处理中间件 (~60行)
│   │   └── log.response.ts          # 响应日志中间件 (~35行)
│   │
│   │   ├── retry.ts                 # [P1] 重试中间件 (~65行)
│   │   ├── cache.ts                 # [P1] 缓存中间件 (~70行)
│   │   ├── sign.ts                  # [P2] 签名中间件 (~40行)
│   │   ├── trace.ts                 # [P2] TraceId 中间件 (~25行)
│   │   └── circuit-breaker.ts       # [P3] 熔断中间件 (~80行)
│   │
│   ├── managers/                   # 各能力的状态管理器（被中间件调用）
│   │   ├── CancelManager.ts         # 取消管理器
│   │   ├── TokenManager.ts          # Token 管理器 + 白名单匹配
│   │   ├── AuthLockManager.ts       # 401 锁管理器
│   │   ├── LoadingManager.ts        # Loading 计数器 + subscribe
│   │   ├── CacheEngine.ts           # [P1] 缓存引擎
│   │   └── RetryScheduler.ts        # [P1] 重试调度器
│   │
│   ├── types/
│   │   ├── index.ts                 # 统一导出
│   │   ├── options.ts              # RequestOptions 扩展定义
│   │   ├── middleware.ts            # Middleware / RequestContext / Pipeline 类型
│   │   └── errors.ts               # 自定义错误类 (BusinessError / HttpError / ...)
│   │
│   └── utils/
│       ├── cache-key.ts            # 缓存 Key 生成
│       ├── desensitize.ts          # 参数脱敏
│       └── logger.ts               # 日志工具

apps/web/src/lib/request/
├── adapters/
│   ├── error.adapter.ts           # ErrorNotifier 抽象接口 + Element Plus 实现
│   ├── router.adapter.ts          # vue-router 集成（跳转登录 + 路由级取消）
│   └── storage.adapter.ts         # Token 存储适配
├── composables/
│   ├── useRequest.ts              # 核心 composable（loading ref + 请求方法）
│   └── useRequestAutoCancel.ts    # 带组件生命周期自动取消的 composable
├── instances/
│   ├── default.ts                 # 主 API 实例配置
│   ├── file.ts                    # 文件服务实例配置
│   └── thirdparty.ts              # 第三方服务实例配置
└── index.ts                       # 统一导出
```

---

### 决策 2：Pipeline 引擎 — 自研轻量实现

**选择**: 自研轻量引擎（~80 行核心代码），零外部依赖

**核心接口**:

```typescript
/** 
 * 中间件标准签名 — 所有中间件必须实现此接口
 * 
 * 执行语义:
 * - await ctx.next() 之前的代码 = Before 阶段（请求发出前）
 * - await ctx.next()      = 分界点，将控制权交给下一个中间件
 * - await ctx.next() 之后的代码 = After 阶段（响应返回后）
 */
export type Middleware<T = unknown> = (
  ctx: RequestContext<T>
) => Promise<void>;

/**
 * 请求上下文 — 在整个管道中传递的共享状态
 */
export interface RequestContext<T = unknown> {
  /** 合并后的最终请求配置 */
  config: InternalRequestConfig;
  
  /** 响应对象（仅在 Response Phase 有值） */
  response?: AxiosResponse;
  
  /** 错误对象（仅在出错时有值） */
  error?: unknown;
  
  /**
   * 核心：调用 next() 将控制权交给下一个中间件
   * Pipeline 引擎会在执行时重写此指针
   */
  next: () => Promise<void>;
  
  /** 共享元数据 — 中间件之间传递数据的载体 */
  meta: RequestContextMeta;
}

/**
 * 元数据 — 中间件通信总线
 */
export interface RequestContextMeta {
  startTime: number;           // 请求开始时间戳
  requestKey: string;          // 请求唯一标识
  abortController: AbortController; // 取消控制器
  terminated: boolean;         // 是否已终止（短路）
  shortcutResult?: unknown;    // 短路返回值
  
  // 业务字段（各中间件读写）
  tokenValue?: string;         // 当前使用的 Token 值
  cacheKey?: string;           // 缓存 Key
  cacheHit?: boolean;          // 是否命中缓存
  retryCount?: number;         // 当前重试次数 [P1]
  traceId?: string;            // 链路追踪 ID [P2]
  signature?: string;          // 签名值 [P2]
  
  [key: string]: unknown;      // 自由扩展
}
```

**Pipeline 核心算法**:

```typescript
class Pipeline<T = unknown> {
  private middlewares: Array<{ name: string; handler: Middleware<T> }> = [];

  use(name: string, handler: Middleware<T>): this { /* ... */ }
  insert(name, handler, options): this { /* ... */ }
  eject(name: string): this { /* ... */ }

  /**
   * ★ 核心编排算法 — 递归驱动中间件链
   *
   * 执行时序:
   *   index=0        index=1        index=N       core
   *   M0.before ▶ M1.before ▶ ... ▶ MN.before ▶ axios
   *                                              │
   *   M0.after  ◀ M1.after  ◀ ... ◀ MN.after  ◀ return
   */
  async execute(ctx: RequestContext<T>): Promise<void> {
    let executionIndex = 0;

    const dispatch = async (currentIndex: number): Promise<void> => {
      if (ctx.meta.terminated || currentIndex >= this.middlewares.length) {
        await this.executeCore(ctx);
        return;
      }

      const { name, handler } = this.middlewares[currentIndex];

      try {
        ctx.next = () => dispatch(currentIndex + 1);
        await handler(ctx);
      } catch (err) {
        ctx.error = err;
        ctx.meta.terminated = true;
        await this.executeCore(ctx);
      }
    };

    await dispatch(executionIndex);
  }

  /** 管道核心：实际 HTTP 通信（唯一与 axios 交互的地方） */
  private async executeCore(ctx: RequestContext<T>): Promise<void> {
    if (ctx.meta.shortcutResult !== undefined) {
      ctx.response = { data: ctx.meta.shortcutResult, status: 200, ... } as AxiosResponse;
      return;
    }
    try {
      ctx.response = await this.rawAxiosInstance.request(ctx.config);
    } catch (err) {
      throw err;
    }
  }
}
```

**Pipeline 高级特性**:

| 特性 | 说明 | 使用场景 |
|------|------|---------|
| 条件注册 `useWhen()` | 运行时判断是否启用中间件 | cache 中间件仅对 GET 启用 |
| 子管道 `compose()` | 将多个中间件组合为一个命名单元 | security 子管道（token+sign+trace） |
| 并行执行 `parallel()` | 多个独立中间件的 Before/After 同时执行 | 多个 header 注入中间件 |
| 生命周期钩子 | onMiddlewareEnter / onPipelineStart 等 | 调试和性能监控 |

---

### 决策 3：P0 默认管道组成

**8 个中间件 + 1 个核心（axios.request）**，按以下顺序注册：

```
Pipeline 默认管道 (P0):
═════════════════════════════════════════════════════════

 Request Phase (Before: 外 → 内):
 ════════════════════════════════════════════════════════

 ① log:request     最外层 — 开发环境打印请求信息
 ② loading          Loading 计数 +1 (try/finally 保底 -1)
 ③ cancel           防重复检测 + AbortController 注册
 ④ token            白名单检查 + Authorization 注入
                     ────────── core ──────────
                        rawAxios.request()
                     ────────────────────────────
 Response Phase (After: 内 → 外):
 ════════════════════════════════════════════════════════

 ⑤ unpack           双层状态码校验 + 自动解包 response.data
 ⑥ error            全局错误边界 (try/catch next) + 分类处理
 ⑦ log:response     最内层 — 响应日志 + 耗时统计 + prod 收集指标

═════════════════════════════════════════════════════════
```

**每个中间件的职责和关键实现要点**:

#### ① configMergeMiddleware（在 HttpClient 层而非中间件中）

- 作为管道第一个中间件或 HttpClient.get() 内的前置步骤
- 执行 `deepMerge(globalDefaults, instanceConfig, requestOptions)`
- 特殊处理 headers 数组合并（非覆盖）
- 注入 `_internal` 元数据到 config

#### ② loadingMiddleware

```typescript
// 关键: try/finally 而非 next() 后直接减计数
// 解决「异常/取消后 loading 不消失」的陷阱
const loadingMiddleware: Middleware = async (ctx) => {
  const shouldShow = ctx.config._internal?.loading !== false;
  if (shouldShow) loadingManager.increment();
  
  try {
    await ctx.next();
  } finally {
    // 无论成功/失败/取消/短路，都保证减计数
    if (shouldShow) {
      const needsForce = ctx.meta.terminated && !ctx.response;
      loadingManager.decrement(needsForce);
    }
  }
};
```

#### ③ cancelMiddleware

```typescript
const cancelMiddleware: Middleware = async (ctx) => {
  // Before: 注册 + 防重复
  const dedupeEnabled = ctx.config._internal?.dedupe !== false;
  if (dedupeEnabled) {
    const prev = cancelManager.register(ctx.config);
    if (prev) prev.abort('[Dedupe] 重复请求被取消');
  }
  
  const controller = new AbortController();
  ctx.config.signal = controller.signal;
  ctx.meta.abortController = controller;
  ctx.meta.requestKey = cancelManager.generateKey(ctx.config);

  try {
    await ctx.next();
  } catch (error) {
    if (isCancelError(error)) {
      // 取消类错误 → 设置到 ctx.error 但不 rethrow
      // 让 errorMiddleware 静默处理
      ctx.error = createCancelError(ctx.config.url);
      ctx.meta.terminated = true;
      return;
    }
    throw error;
  } finally {
    cancelManager.cleanup(ctx.meta.requestKey);
  }
};
```

#### ④ tokenMiddleware

```typescript
const tokenMiddleware: Middleware = async (ctx) => {
  const shouldSkip = ctx.config._internal?.skipToken || 
                     tokenManager.isInWhiteList(ctx.config.url || '');
  
  if (!shouldSkip) {
    const token = tokenManager.getToken();
    if (token) {
      ctx.config.headers = ctx.config.headers || {};
      ctx.config.headers['Authorization'] = `Bearer ${token}`;
      ctx.meta.tokenValue = token;
    }
  }
  
  await ctx.next();
  // After: 无操作（Token Refresh 可在此扩展）
};
```

#### ⑤ unpackMiddleware

```typescript
const unpackMiddleware: Middleware = async (ctx) => {
  await ctx.next(); // 先让 errorMiddleware 和核心层完成
  if (ctx.error || !ctx.response) return;

  const internal = ctx.config._internal!;
  
  if (internal.returnBlob) return;                          // Blob 模式跳过
  if (internal.returnRawResponse) return;                   // Raw 模式跳过

  // HTTP 状态码校验
  if (ctx.response.status < 200 || ctx.response.status >= 300) {
    ctx.error = createHttpError(ctx.response.status, ...);
    return;
  }

  // 业务码校验
  const data = ctx.response.data as ApiResponse<unknown>;
  if (!internal.successCodes!.includes(data.code)) {
    ctx.error = createBusinessError(data.code, data.message, data.data);
    return;
  }

  // ★ 解包：将 response.data 从 ApiResponse<T> 变为 T
  ctx.response.data = data.data;
};
```

#### ⑥ errorMiddleware（全局错误边界）

```typescript
const errorMiddleware: Middleware = async (ctx) => {
  // ★ try/catch 包裹 next() 成为全局错误边界
  try {
    await ctx.next(); // unpack + axios core
  } catch (err) {
    ctx.error = err;
  }

  // After: 统一分类处理
  if (!ctx.error) return;

  const err = ctx.error;

  if (isCancelError(err)) return;                           // CANCEL → 静默
  if (isHttpError(err, 401)) { await authLockManager.handle401(); return; } // 401 → 加锁跳转

  if (ctx.config._internal?.showError === false) return;   // 接口级关闭提示

  let message = resolveErrorMessage(err);                   // 分类取文案
  errorNotifier.error(message);                               // 调用 UI 适配器
  // 注意: 不 throw! ctx.error 已记录，HttpClient 会检查并 throw
};
```

#### ⑦ logResponseMiddleware

```typescript
const logResponseMiddleware: Middleware = async (ctx) => {
  await ctx.next();

  const duration = Date.now() - ctx.meta.startTime;

  if (__DEV__) {
    if (ctx.error) console.error(`❌ ${ctx.config.url} (${duration}ms)`, ctx.error);
    else console.log(`✅ ${ctx.config.url} (${duration}ms)`, ctx.response?.data);
    console.groupEnd(); // 关闭 logRequest 开启的 group
  } else if (__PROD__) {
    collectMetrics({ url: maskUrl(ctx.config.url), duration, status: ctx.response?.status });
    if (duration > SLOW_THRESHOLD) reportSlowRequest({ url: ctx.config.url, duration });
  }
};
```

---

### 决策 4：配置合并策略 — 三层优先级模型

**选择**: 接口级配置 > 实例配置 > 全局默认配置（深合并）

**数据流**:

```
Global Defaults (最低优先级)
    ↓ 被 Instance Config 覆盖
Instance Config (中等优先级)
    ↓ 被 Request Options 覆盖
Request Options (最高优先级)
    ↓ 合并后的最终 config
Final Merged Config → pipeline.execute(ctx)
```

**实现要点**:
- 使用自定义深合并函数（不引入 lodash dependency）
- 基础类型（string/number/boolean/null）：高优先级覆盖低优先级
- 对象类型：递归深合并嵌套对象
- 数组字段（headers）：特殊合并策略（非覆盖）
- 函数字段（onUploadProgress）：取最高优先级的值
- `undefined` 值视为「未设置」，不覆盖下层
- 运行时可动态修改任意层的配置

---

### 决策 5：响应数据默认解包

**选择**: 默认返回 `T`，通过 `returnRawResponse: true` 返回原始 `AxiosResponse<ApiResponse<T>>`

**解包发生在 `unpackMiddleware` 中**，通过原地修改 `ctx.response.data` 实现：

```typescript
// HttpClient.get() 最终返回:
return ctx.response.data as T;  // 此时已是解包后的 T
```

**类型推导**:

```typescript
const users = await request.get<User[]>('/users');
// users 类型: User[] ✅

const res = await request.get<User[]>('/users', { returnRawResponse: true });
// res 类型: AxiosResponse<ApiResponse<User[]>> ✅

const blob = await request.get('/download', { returnBlob: true });
// blob 类型: Blob ✅
```

---

### 决策 6：CancelManager 内置统一管理

**选择**: 在 `HttpClient` 类内部内置 `CancelManager`，被 `cancelMiddleware` 调用

**核心数据结构**:

```typescript
class CancelManager {
  private pendingMap = new Map<string, AbortController>();
  private pageMap = new Map<string, Set<string>>();

  generateKey(config: InternalRequestConfig): string;
  register(config: InternalRequestConfig): AbortController | null;
  cancel(requestKey: string): void;
  cancelByPage(pageKey: string): void;
  cleanup(requestKey: string): void;
  cleanupAll(): void;
}
```

**防重复策略**: 基于 URL + Method + 排序序列化(Params) + 排序序列化(Data) 生成唯一 key

---

### 决策 7：401 加锁机制

**选择**: 原子布尔锁 + 单次执行模式，被 `errorMiddleware` 调用

```typescript
class AuthLockManager {
  private isRedirecting = false;

  async handle401(): Promise<void> {
    if (this.isRedirecting) return;
    this.isRedirecting = true;
    try {
      await routerAdapter.navigateToLogin();
      tokenManager.clear();
    } finally {
      this.isRedirecting = false;
    }
  }
}
```

---

### 决策 8：Loading 计数器 — 实例级隔离 + subscribe 模式

**选择**: 每个 HttpClient 实例内部维护独立的 LoadingManager，通过发布-订阅模式通知 Vue Ref

```typescript
class LoadingManager {
  private _count = 0;
  private _state = false;
  private listeners = Set<(state: boolean) => void>;

  increment(): void { /* count++ */ }
  decrement(force = false): void { /* count-- */ }
  get state(): boolean { return this._state; }
  
  subscribe(listener: (state: boolean) => void): () => void;
  unsubscribe(listener: (state: boolean) => void): void;
}
```

**Vue 桥接**:

```typescript
function useRequest(options?) {
  const instance = options?.instance ?? defaultInstance;
  const loading = shallowRef(instance.loading);

  const unsub = instance.loadingManager.subscribe((state) => {
    loading.value = state;
  });

  onUnmounted(unsub); // 防止内存泄漏

  return { get: instance.get.bind(instance), loading, ... };
}
```

---

### 决策 9：错误分类处理策略

**选择**: 分类矩阵 + 抽象 UI 接口，在 `errorMiddleware` 中统一处理

| 错误类别 | 判断条件 | 弹窗提示 | 行为 |
|---------|---------|---------|------|
| CANCEL | `isCancelError(error)` | ❌ 永不 | 静默，设置 ctx.error |
| TIMEOUT | `error.code === 'ECONNABORTED'` | ✅ 默认弹 | 可 `showError: false` |
| NETWORK | `!error.response` && !isCancel | ✅ 默认弹 | 可关闭 |
| 401 | `error.response?.status === 401` | ❌ 不弹 | `authLockManager.handle401()` |
| 403 | `error.response?.status === 403` | ✅ 默认弹 | 无权限提示 |
| 429 | `error.response?.status === 429` | ⚠️ 友好 | 「操作过于频繁」 |
| 5xx | `error.response?.status >= 500` | ✅ 默认弹 | 触发重试（P1）|
| BIZ_ERROR | `response.data.code !== successCode` | ✅ 默认弹 | message 来自后端 |

**抽象 UI 接口**:

```typescript
interface ErrorNotifier {
  success(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  info(message: string): void;
}
```

---

### 决策 10：环境区分日志

**选择**: 开发环境完整日志 + 生产环境脱敏收集，分散在 `logRequestMiddleware` 和 `logResponseMiddleware` 中

---

### 决策 11：TypeScript 类型设计

**选择**: RequestOptions 全部 Optional + 泛型自动推导

**核心类型**:

```typescript
export interface RequestOptions<T = unknown> extends AxiosRequestConfig {
  loading?: boolean;
  showError?: boolean;
  returnRawResponse?: boolean;
  returnBlob?: boolean;
  skipToken?: boolean;
  skipRetry?: boolean;
  skipCache?: boolean;
  skipErrorHandler?: boolean;
  successCodes?: number[];
  timeout?: number;
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
  dedupe?: boolean;
  pageKey?: string;
  cacheTtl?: number;
}

export interface InternalRequestConfig extends AxiosRequestConfig {
  _internal?: {
    startTime: number;
    requestKey: string;
    abortController: AbortController;
    skipToken: boolean;
    showError: boolean;
    loading: boolean;
    returnRawResponse: boolean;
    returnBlob: boolean;
    dedupe: boolean;
    pageKey?: string;
    cacheTtl?: number;
    successCodes?: number[];
  };
}

export interface UseRequestReturn {
  get: <T>(url: string, options?: RequestOptions) => Promise<T>;
  post: <T>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  del: <T>(url: string, options?: RequestOptions) => Promise<T>;
  loading: Ref<boolean>;
  instance: HttpClient;
}
```

---

## Risks / Trade-offs

### 风险 1：AbortController 兼容性

**风险**: 低版本浏览器不支持 AbortController，导致白屏

**缓解措施**:
- P0 目标浏览器 Chrome 88+ / Edge 88+ / Firefox 85+ / Safari 14+（均原生支持）
- 后续可按需添加 polyfill

---

### 风险 2：Pipeline 抽象层性能

**风险**: 多一层中间件调度是否影响性能？

**分析**:
- Pipeline 开销 < 0.2ms/请求（几次函数调用 + 对象创建）
- 相比网络延迟（通常 > 50ms），开销占比 < 0.4%
- V8 引擎对闭包和短数组有高度优化

**结论**: 性能不是问题。如未来有需要可优化：
- ctx 对象池化复用（减少 GC）
- 同步中间件跳过 async

---

### 风险 3：配置合并复杂度

**缓解措施**:
- 编写完整的单元测试覆盖各种合并场景
- ConfigMerger 独立模块，单一职责
- dev 环境提供配置调试模式（打印合并结果）

---

### 风险 4：迁移期双套并存

**缓解措施**:
- 旧 API 添加 `@deprecated` 注释 + 控制台警告
- 提供 ESLint rule 禁止 import 旧 API
- 分模块逐步迁移

---

### 风险 5：内存泄漏 — CancelManager 未清理

**缓解措施**:
- cancelMiddleware.finally 中始终调用 `cleanup()`
- 定期清理超时记录
- 组件卸载时批量清理（useRequestAutoCancel）

---

### 权衡 1：功能丰富 vs 包体积

**决策**: P0 核心包控制在 < 15KB gzipped，高级能力按需 Tree-shaking

---

### 权衡 2：洋葱模型学习成本 vs 长期收益

**决策**: 中间件编写模式简单固定（before → next() → after），团队一次学会长期受益

---

## Migration Plan

### Phase 1: 基础设施搭建（1-2 天）

1. 创建 `packages/request` 包（package.json / tsup / tsconfig）
2. 创建 `apps/web/src/lib/request` 目录
3. 实现 Pipeline 引擎核心（context.ts + Pipeline.ts）
4. 实现 HttpClient 包装类骨架
5. 实现完整类型定义（types/ 目录）
6. 配置构建和导出

### Phase 2: P0 中间件实现（3-4 天）

1. ConfigMerger + configMergeMiddleware
2. LoadingManager + loadingMiddleware
3. CancelManager + cancelMiddleware
4. TokenManager + tokenMiddleware
5. AuthLockManager
6. ErrorNotifier 接口 + ElementPlus 实现
7. logRequestMiddleware + logResponseMiddleware
8. unpackMiddleware
9. errorMiddleware
10. 组装默认管道 createDefaultPipeline()

### Phase 3: Vue 适配层（1-2 天）

1. Adapters: error / router / storage
2. Composables: useRequest / useRequestAutoCancel
3. Instances: default / file / thirdparty
4. Router 级别取消集成

### Phase 4: API 模块迁移（2 天）

1. 创建 user.api.ts / auth.api.ts / system.api.ts
2. 逐模块迁移现有 api 调用点
3. 旧 API 添加 deprecation 警告

### Phase 5: 测试与验证（1-2 天）

1. Pipeline 引擎单元测试
2. 各中间件独立单元测试
3. ConfigMerger 边界情况测试
4. 集成测试：完整请求流程（使用 **Vitest + vi.spyOn(axios)** mock 策略）
5. 手动验证清单（Loading / 401 / 错误 / 取消 / 日志）

**测试技术栈说明:**
- **单元测试**: Vitest + vi.fn() / vi.spyOn() mock
- **集成测试**: Mock `axios.Axios.prototype.request` 模拟 HTTP 响应
- **E2E 验证**: 浏览器控制台脚本 + 开发服务器实时测试
- **不使用 MSW**: 核心包 (`packages/request`) 采用轻量级 axios mock，避免引入额外依赖
- **MSW 适用场景**: 如需完整的 HTTP 层面测试，可在 `apps/web` 层（Vue 应用）单独配置 MSW

### 回滚策略

- 保留旧 `apps/web/src/api/index.ts`
- 如遇问题：修改 import alias 指向旧封装即可回滚

## Open Questions

1. **Q: Token 存储方式？**
   - 倾向：Access Token 存 memory/store（更安全），Refresh Token 存 httpOnly cookie（P1 确定）

2. **Q: 白名单接口如何维护？**
   - 倾向：A + B 组合（精确匹配 `/auth/login` + 前缀匹配 `/auth/**`）

3. **Q: 上传/下载的超时策略？**
   - 普通 15s，上传 300s，下载 120s？（待产品确认）
