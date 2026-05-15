## Context

### 项目现状

uni-admin 是一个基于 pnpm monorepo 的全栈管理系统，前端使用 Vue3 + Vite + TypeScript + Pinia + Element Plus，后端使用 NestJS + Prisma + MySQL + Redis。

当前 API 请求层（[apps/web/src/api/index.ts](../../../apps/web/src/api/index.ts)）仅做了最基础的 axios 封装：
- 单一 axios 实例，基础 baseURL 和 timeout 配置
- 简单的请求/响应拦截器（几乎为空）
- 响应处理仅做 code === 200/0 判断
- 401 处理直接 `window.location.href = '/login'`（**存在并发重复跳转 bug**）
- 导出 get/post/put/del 四个简单透传函数

### 约束条件

- **框架深度集成 Vue**: Loading 用 ref、路由跳转用 vue-router、组件卸载用 onUnmounted
- **多实例隔离**: 主 API / 文件服务 / 第三方服务各自独立配置、拦截器、缓存、Token
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

1. 建立分层解耦的企业级 Axios 封装架构（配置层 → 类型层 → 核心层 → 工具层 → 业务 API 层）
2. 实现多实例工厂，支持不同服务独立配置与隔离
3. 实现三层配置合并（全局默认 < 实例配置 < 接口级覆盖），接口级可精细化控制 20+ 开关
4. 统一响应处理：双层状态码校验（HTTP + Business）、默认自动解包返回 T
5. Token 管理：白名单机制、自动携带、401 加锁只处理一次
6. Loading 状态：实例级计数器（多实例隔离）、接口级开关、异常/取消自动减计数
7. 统一错误处理：分类策略（Cancel 静默 / 401 跳转 / 其他弹窗）、抽象 UI 接口 + Element Plus 默认实现
8. 请求取消：CancelManager 内置统一管理（防重复 / 路由切换 / 组件卸载 / 手动）
9. TypeScript 完整类型：RequestOptions 全部 Optional + 泛型推导
10. Vue 深度适配：useRequest composable、响应式 loading、路由集成
11. 模块化 API 管理：按业务拆分、强类型约束、统一导出

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

### 决策 1：包结构与分层架构

**选择**: 混合方案 — `packages/request`（核心）+ `apps/web/src/lib/request`（Vue 适配）

**理由**:
- 核心逻辑无框架依赖，未来可复用到 React/Svelte 项目
- Vue 适配层可深度集成 vue-router / pinia / @vueuse/core
- 符合 monorepo 最佳实践，职责清晰

**备选方案对比**:

| 方案 | 优点 | 缺点 |
|------|------|------|
| A) 全放 apps/web | 简单直接 | 无法复用，与业务耦合 |
| B) 全放 packages | 可复用 | Vue 集成需要大量 adapter 代码 |
| **C) 混合方案 ✅** | 兼顾复用与集成 | 维护两套代码 |

**目录结构**:

```
packages/request/
├── src/
│   ├── core/
│   │   ├── AxiosInstance.ts       # 多实例工厂类
│   │   ├── ConfigMerger.ts        # 三层配置合并引擎
│   │   ├── CancelManager.ts       # 请求取消管理器
│   │   ├── TokenManager.ts        # Token 管理器
│   │   └── ErrorProcessor.ts      # 错误处理器
│   ├── interceptors/
│   │   ├── request.interceptor.ts # 请求拦截器（Token/签名/TraceId）
│   │   └── response.interceptor.ts# 响应拦截器（解包/错误/缓存）
│   ├── types/
│   │   ├── index.ts               # 统一导出
│   │   └── options.ts             # RequestOptions 扩展定义
│   └── utils/
│       ├── cacheKey.ts            # 缓存 Key 生成（P1 使用）
│       ├── desensitize.ts         # 参数脱敏（P2 使用）
│       └── logger.ts              # 结构化日志

apps/web/src/lib/request/
├── adapters/
│   ├── error.adapter.ts           # 错误提示 UI 适配（Element Plus）
│   ├── router.adapter.ts          # 路由跳转适配（vue-router）
│   └── storage.adapter.ts         # Token 存储适配（localStorage/sessionStorage）
├── composables/
│   ├── useRequest.ts              # 核心 composable
│   └── useRequestAutoCancel.ts    # 带自动取消的 composable
├── instances/
│   ├── default.ts                 # 主 API 实例配置
│   ├── file.ts                    # 文件服务实例配置
│   └── thirdparty.ts              # 第三方服务实例配置
└── index.ts                       # 统一导出
```

---

### 决策 2：配置合并策略 — 三层优先级模型

**选择**: 接口级配置 > 实例配置 > 全局默认配置（深合并）

**数据流**:

```
Global Defaults (最低优先级)
    ↓ 被 Instance Config 覆盖
Instance Config (中等优先级)
    ↓ 被 Request Options 覆盖
Request Options (最高优先级)
    ↓ 合并后的最终 config
Final Merged Config → axios.request(mergedConfig)
```

**实现要点**:
- 使用 lodash merge 或自定义深合并函数
- 数组字段（如 headers）采用后者覆盖前者
- 函数字段（如 onUploadProgress）取最高优先级的值
- 运行时可动态修改任意层的配置

---

### 决策 3：响应数据默认解包

**选择**: 默认返回 `T`，通过 `returnRawResponse: true` 返回原始 `AxiosResponse<ApiResponse<T>>`

**理由**:
- 业务层 95% 场景只需要 `data`，减少 `.data.data` 的噪音
- 文件下载等特殊场景可通过开关获取原始响应
- 与现代 HTTP 客户端（如 ofetch、ky）的设计理念一致

**类型推导**:

```typescript
// 默认：自动解包，返回 T
const users = await request.get<User[]>('/users');
// users 类型: User[] ✅

// 显式要求原始响应
const res = await request.get<User[]>('/users', { returnRawResponse: true });
// res 类型: AxiosResponse<ApiResponse<User[]>> ✅

// Blob 文件流
const blob = await request.get('/download', { returnBlob: true });
// blob 类型: Blob ✅
```

---

### 决策 4：CancelManager 内置统一管理

**选择**: 在 `AxiosInstance` 类内部内置 `CancelManager`，不采用插件化设计

**理由**:
- 取消逻辑高度耦合于实例生命周期，插件化过度设计
- 四种取消场景（防重复 / 路由切换 / 组件卸载 / 手动）共享同一个请求注册表
- 内置实现更简单，代码量更少

**核心数据结构**:

```typescript
class CancelManager {
  // 请求注册表: key → AbortController
  private pendingMap = new Map<string, AbortController>();

  // 页面级追踪: pageKey → Set<requestKey>
  private pageMap = new Map<string, Set<string>>();

  // 生成请求唯一标识
  private generateKey(config: InternalAxiosRequestConfig): string;

  // 注册请求（防重复检测）
  register(config: InternalAxiosRequestConfig): AbortController;

  // 取消指定请求
  cancel(requestKey: string): void;

  // 取消页面所有请求
  cancelByPage(pageKey: string): void;

  // 清除已完成请求
  cleanup(requestKey: string): void;
}
```

**防重复策略**:
- 基于 URL + Method + Params + Data（排序后序列化）生成唯一 key
- 相同 key 的请求在短时间内（默认 2s）自动取消前一个
- 可通过 `dedupe: false` 关闭防重复

---

### 决策 5：401 加锁机制

**选择**: 使用原子布尔锁 + 单次执行模式

**问题**: 并发多个请求同时 401 时，会触发多次跳转登录和多次清空 Storage

**解决方案**:

```typescript
class AuthLockManager {
  private isRefreshing = false;      // 是否正在刷新 Token
  private isRedirecting = false;     // 是否正在跳转登录

  async handle401(): Promise<void> {
    if (this.isRedirecting) return;  // 已在处理，跳过
    this.isRedirecting = true;

    try {
      // P0: 直接跳转登录
      await router.push('/login');
      // 清除本地缓存
      TokenManager.clear();
    } finally {
      this.isRedirecting = false;
    }
  }

  // P1: Token Refresh 逻辑
  async handleTokenRefresh(): Promise<string> {
    if (this.isRefreshing) {
      // 已在刷新，排队等待
      return this.waitForRefresh();
    }
    this.isRefreshing = true;
    try {
      const newToken = await refreshToken();
      this.refreshSubscribers.forEach((cb) => cb(newToken));
      return newToken;
    } finally {
      this.isRefreshing = false;
    }
  }
}
```

---

### 决策 6：Loading 计数器 — 实例级隔离

**选择**: 每个 AxiosInstance 内部维护独立的 loading 计数器

**问题**: 文档明确指出「多实例共用一个 loading 计数器会导致状态混乱」

**实现**:

```typescript
class AxiosInstance {
  // 实例级 loading 状态（Vue 适配层转为 ref）
  private _loadingCount = 0;
  private _loadingState: boolean = false;

  get loading(): boolean { return this._loadingState; }

  private incrementLoading(): void {
    this._loadingCount++;
    if (this._loadingCount === 1) {
      this._loadingState = true;
      this.onLoadingChange?.(true);
    }
  }

  private decrementLoading(force = false): void {
    // force=true 用于异常/取消时确保减计数
    this._loadingCount = Math.max(0, this._loadingCount - (force ? this._loadingCount : 1));
    if (this._loadingCount === 0) {
      this._loadingState = false;
      this.onLoadingChange?.(false);
    }
  }
}
```

---

### 决策 7：错误分类处理策略

**选择**: 分类矩阵 + 抽象 UI 接口

**错误分类表**:

| 错误类别 | 判断条件 | 弹窗提示 | 行为 |
|---------|---------|---------|------|
| CANCEL | `axios.isCancel(error)` 或 error.message includes 'canceled' | ❌ 永不 | 静默 reject |
| TIMEOUT | `error.code === 'ECONNABORTED'` | ✅ 默认弹 | 可 `showError: false` 关闭 |
| NETWORK | `!error.response` && !isCancel | ✅ 默认弹 | 可关闭 |
| 401 | `error.response?.status === 401` | ❌ 不弹 | 加锁 → 跳转登录 |
| 403 | `error.response?.status === 403` | ✅ 默认弹 | 无权限提示 |
| 429 | `error.response?.status === 429` | ⚠️ 友好 | 「操作过于频繁」提示（P3 自动退避）|
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

// Element Plus 默认实现
class ElementPlusErrorNotifier implements ErrorNotifier {
  success(msg: string) { ElMessage.success(msg); }
  error(msg: string) { ElMessage.error(msg); }
  warning(msg: string) { ElMessage.warning(msg); }
  info(msg: string) { ElMessage.info(msg); }
}
```

---

### 决策 8：环境区分日志

**选择**: 开发环境完整日志 + 生产环境脱敏日志

**实现要点**:

```typescript
class RequestLogger {
  log(config: InternalAxiosRequestConfig, response?: AxiosResponse, error?: any, duration?: number) {
    const env = getAppEnv();

    if (env === 'development') {
      // 开发环境：打印完整信息
      console.group(`📡 [${config.method?.toUpperCase()}] ${config.url}`);
      console.log('Params:', config.params);
      console.log('Data:', config.data);
      console.log('Headers:', config.headers);
      if (response) console.log('Response:', response.data);
      if (error) console.error('Error:', error);
      console.log(`⏱️ Duration: ${duration}ms`);
      console.groupEnd();
    } else if (env === 'production') {
      // 生产环境：脱敏输出
      const sanitizedData = desensitize(config.data);
      // 仅输出关键信息到监控收集点
      collectMetrics({ url: config.url, method: config.method, duration, status: response?.status });
    }
  }
}
```

---

### 决策 9：TypeScript 类型设计

**选择**: RequestOptions 全部 Optional + 泛型自动推导

**核心类型**:

```typescript
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '@uni-admin/shared-types';

/** 扩展的请求配置选项 */
export interface RequestOptions<T = unknown> extends AxiosRequestConfig {
  /** 是否显示 loading（默认继承实例配置） */
  loading?: boolean;
  /** 是否显示错误提示（默认 true） */
  showError?: boolean;
  /** 是否返回原始 AxiosResponse（默认 false，自动解包返回 T） */
  returnRawResponse?: boolean;
  /** 是否返回 Blob 文件流（用于下载） */
  returnBlob?: boolean;
  /** 跳过 Token 携带（用于公开接口） */
  skipToken?: boolean;
  /** 跳过重试（P1） */
  skipRetry?: boolean;
  /** 跳过缓存（P1） */
  skipCache?: boolean;
  /** 跳过统一错误处理 */
  skipErrorHandler?: boolean;
  /** 自定义业务成功码（默认 [200, 0]） */
  successCodes?: number[];
  /** 自定义超时时间（ms） */
  timeout?: number;
  /** 上传进度回调（P1） */
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  /** 下载进度回调（P1） */
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
  /** 关闭防重复请求 */
  dedupe?: boolean;
  /** 请求归属页面 Key（用于路由切换取消） */
  pageKey?: string;
}

/** 内部合并后的完整配置（运行时使用） */
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
  };
}

/** useRequest 返回值类型 */
export interface UseRequestReturn {
  get: <T>(url: string, options?: RequestOptions) => Promise<T>;
  post: <T>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  del: <T>(url: string, options?: RequestOptions) => Promise<T>;
  loading: Ref<boolean>;
  instance: AxiosInstanceWrapper;
}
```

---

## Risks / Trade-offs

### 风险 1：AbortController 兼容性

**风险**: 低版本浏览器不支持 AbortController，导致白屏

**缓解措施**:
- 使用 polyfill：`abort-controller-polyfill` 或 `abortcontroller`
- 特性检测后按需加载
- P0 阶段目标浏览器为 Chrome 88+ / Edge 88+ / Firefox 85+ / Safari 14+（均原生支持）

---

### 风险 2：配置合并复杂度

**风险**: 三层配置合并逻辑容易出错，特别是数组/函数字段的合并策略

**缓解措施**:
- 编写完整的单元测试覆盖各种合并场景
- ConfigMerger 独立模块，单一职责
- 提供配置调试模式（dev 环境打印合并结果）

---

### 风险 3：迁移期双套并存

**风险**: 新旧 API 共存期间，开发者可能混用导致行为不一致

**缓解措施**:
- 旧 API 添加 `@deprecated` 注释 + 控制台警告
- 提供 ESLint rule 禁止 import 旧 API
- 分模块逐步迁移，每个模块迁移完成后删除旧调用

---

### 风险 4：内存泄漏 — 取消请求未清理

**风险**: CancelManager 的 pendingMap 只增不减，长时间运行后内存溢出

**缓解措施**:
- 响应拦截器 finally 中始终调用 `cleanup()`
- 定期清理（每 5 分钟清理超过 30s 的记录）
- 组件卸载时批量清理该组件发起的请求

---

### 权衡 1：功能丰富 vs 包体积

**权衡**: 企业级能力越多，包体积越大

**决策**: P0 核心包控制在 < 15KB gzipped，高级能力按需引入（Tree-shaking 友好的模块化导出）

---

### 权衡 2：类型安全 vs 易用性

**权衡**: 严格的泛型约束增加类型安全性，但可能提升学习成本

**决策**: 默认泛型参数 `<T = unknown>`，推荐但不强制指定；提供 `as const` 断言快捷方式

---

## Migration Plan

### Phase 1: 安装与基础设施（1-2 天）

1. 创建 `packages/request` 包，安装依赖
2. 创建 `apps/web/src/lib/request` 目录
3. 实现 Core 层基础骨架（AxiosInstance、ConfigMerger、类型定义）
4. 配置 tsup 构建、package.json exports

### Phase 2: P0 核心能力实现（3-5 天）

1. 实现三层配置合并引擎
2. 实现请求拦截器（Token 携带、白名单）
3. 实现响应拦截器（双层状态码校验、自动解包、错误分类）
4. 实现 401 加锁处理
5. 实现 Loading 计数器
6. 实现 CancelManager 基础能力
7. 实现环境区分日志
8. 实现 Vue 适配层（adapters + composables）
9. 配置 default/file/thirdparty 多实例

### Phase 3: API 模块迁移（2-3 天）

1. 创建 user.api.ts / auth.api.ts / system.api.ts 等模块文件
2. 逐模块迁移现有 api 调用点
3. 旧 API 添加 deprecation 警告
4. 全局搜索确保无遗漏

### Phase 4: 测试与验证（1-2 天）

1. 编写单元测试（Vitest）：ConfigMerger、CancelManager、ErrorProcessor
2. 编写集成测试：完整请求流程
3. 手动验证：Loading 状态、401 跳转、错误提示、取消请求
4. 性能测试：大量并发请求下内存占用

### 回滚策略

- 保留旧 `apps/web/src/api/index.ts` 至 Phase 3 完成 + 稳定运行 1 个迭代
- 如遇严重问题：修改 import alias 指向旧封装即可回滚
- Git 分支管理：feature 分支开发，merge 前必须通过 CI

## Open Questions

1. **Q: Token 存储方式？** localStorage vs sessionStorage vs Cookie（HttpOnly）
   - 倾向：Access Token 存 memory/store（更安全），Refresh Token 存 httpOnly cookie（P1 阶段确定）

2. **Q: 白名单接口如何维护？**
   - 选项 A: 配置文件数组 `['/auth/login', '/auth/captcha', ...]`
   - 选项 B: URL pattern 匹配 `/\/auth\//` `/\/public\//`
   - 倾向：A + B 组合（精确匹配 + 模式匹配）

3. **Q: 是否需要请求 mock 拦截？**
   - 当前项目已有 `enableMock` 环境变量，是否在本封装中集成 mock 能力？
   - 倾向：不内置，通过外部 mock 服务或 MSW 处理

4. **Q: 上传/下载的超时策略？**
   - 普通接口 15s，上传 300s（5min），下载 120s（2min）？
   - 需要确认产品需求
