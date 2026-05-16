import { Pipeline } from '../core/Pipeline.js';
import type { HttpClientOptions } from '../core/HttpClient.js';
import type { LoadingManager } from '../managers/LoadingManager.js';
import type { CancelManager } from '../managers/CancelManager.js';
import type { TokenManager } from '../managers/TokenManager.js';
import type { AuthLockManager } from '../managers/AuthLockManager.js';
import type { ErrorNotifier } from '../types/notifier.js';
import { createConfigMergeMiddleware } from './config.merge.js';
import { createLoadingMiddleware } from './loading.js';
import { createCancelMiddleware } from './cancel.js';
import { createTokenMiddleware } from './token.js';
import { createLogRequestMiddleware } from './log.request.js';
import { createUnpackMiddleware } from './unpack.js';
import { createErrorMiddleware } from './error.js';
import { createLogResponseMiddleware } from './log.response.js';

/**
 * 默认管道工厂的选项接口
 *
 * 封装了创建完整中间件管道所需的所有依赖项。
 * 这些依赖通常由 HttpClient 在初始化时提供。
 */
export interface DefaultPipelineOptions {
  /** Loading 状态管理器 */
  loadingManager: LoadingManager;
  /** 请求取消管理器（防重复 + 手动取消） */
  cancelManager: CancelManager;
  /** Token 管理（获取 + 白名单） */
  tokenManager: TokenManager;
  /** 认证锁管理器（401 处理） */
  authLockManager: AuthLockManager;
  /** 错误通知器（UI 提示实现） */
  errorNotifier: ErrorNotifier;
  /** 全局默认配置（跨实例共享） */
  globalDefaults: import('../types/options.js').GlobalDefaults;
  /** 实例级配置（对单个 HttpClient 生效） */
  instanceConfig: import('../types/options.js').InstanceConfig;
}

/**
 * 创建默认中间件管道
 *
 * ## 管道架构（洋葱模型）
 *
 * ### Request Phase（前置阶段，从外到内执行）
 * ```
 * ┌─────────────────────────────────────────┐
 * │ 1. config:merge   配置合并             │ ← 最外层
 * │ 2. log:request    请求日志              │
 * │ 3. loading        Loading 管理         │
 * │ 4. cancel         请求取消 + 防重复     │
 * │ 5. token          Token 注入           │ ← 最内层
 * └─────────────────────────────────────────┘
 *                    ↓
 *           [axios HTTP 请求]
 *                    ↑
 * ┌─────────────────────────────────────────┐
 * │ 6. unpack         响应解包              │ ← 最内层
 * │ 7. error          全局错误处理          │
 * │ 8. log:response   响应日志              │ ← 最外层
 * └─────────────────────────────────────────┘
 * ```
 *
 * ### Response Phase（后置阶段，从内到外执行）
 * 中间件 6-8 在 HTTP 请求完成后按相反顺序执行。
 *
 * @param options - 管道依赖项（Managers + 配置）
 * @returns 组装好的 Pipeline 实例
 *
 * @example
 * ```typescript
 * const pipeline = createDefaultPipeline({
 *   loadingManager: new LoadingManager(),
 *   cancelManager: new CancelManager(),
 *   tokenManager: new TokenManager(['/public/', '/auth/login']),
 *   authLockManager: new AuthLockManager(),
 *   errorNotifier: elPlusMessage,
 *   globalDefaults: { timeout: 10000 },
 *   instanceConfig: { baseURL: '/api' },
 * });
 *
 * // 执行请求
 * const ctx = createRequestContext({ url: '/users', method: 'GET' });
 * await pipeline.execute(ctx);
 * console.log(ctx.response?.data); // 解包后的业务数据
 * ```
 */
export function createDefaultPipeline(options: DefaultPipelineOptions): Pipeline {
  const pipeline = new Pipeline();

  // ========== Request Phase（前置阶段）==========
  // 注册顺序 = 执行顺序（从外到内）

  // 1️⃣ 配置合并：三层合并 + 注入 _internal 元数据
  pipeline.use(
    'config:merge',
    createConfigMergeMiddleware(options.globalDefaults, options.instanceConfig),
  );

  // 2️⃣ 请求日志（前）：开发环境下打印请求信息
  pipeline.use('log:request', createLogRequestMiddleware());

  // 3️⃣ Loading 管理：try/finally 保证计数正确
  pipeline.use('loading', createLoadingMiddleware(options.loadingManager));

  // 4️⃣ 请求取消：防重复 + AbortController 注册
  pipeline.use('cancel', createCancelMiddleware(options.cancelManager));

  // 5️⃣ Token 注入：白名单检查 + Authorization 头注入
  pipeline.use('token', createTokenMiddleware(options.tokenManager));

  // ========== Response Phase（后置阶段）==========
  // 注册顺序 = 执行顺序（从内到外，即逆序）

  // 6️⃣ 响应解包：双层状态码校验 + 数据提取
  pipeline.use('unpack', createUnpackMiddleware());

  // 7️⃣ 全局错误处理：错误分类 + UI 提示
  pipeline.use(
    'error',
    createErrorMiddleware(options.authLockManager, options.errorNotifier),
  );

  // 8️⃣ 响应日志（后）：耗时统计 + 性能指标收集
  pipeline.use('log:response', createLogResponseMiddleware());

  return pipeline;
}

// ========== 导出所有中间件工厂函数 ==========
// 方便外部单独使用或自定义管道组合

export { createConfigMergeMiddleware } from './config.merge.js';
export { createLoadingMiddleware } from './loading.js';
export { createCancelMiddleware } from './cancel.js';
export { createTokenMiddleware } from './token.js';
export { createLogRequestMiddleware } from './log.request.js';
export { createUnpackMiddleware } from './unpack.js';
export { createErrorMiddleware } from './error.js';
export { createLogResponseMiddleware } from './log.response.js';
