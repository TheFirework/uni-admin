// ===== 核心类型 =====
export type { Middleware, RequestContext, RequestContextMeta } from './types/middleware.js';
export type { 
  RequestOptions, 
  InternalRequestConfig,
  GlobalDefaults, 
  InstanceConfig,
} from './types/options.js';
export type {
  RequestError,
  CancelError,
  TimeoutError,
  NetworkError,
  HttpError,
  BusinessError,
  ErrorType,
} from './types/errors.js';
export type { ErrorNotifier } from './types/notifier.js';

// ===== 核心引擎 =====
export { Pipeline } from './core/Pipeline.js';
export { createRequestContext } from './core/context.js';
export { HttpClient } from './core/HttpClient.js';
export type { HttpClientOptions } from './core/HttpClient.js';
export { ConfigMerger } from './core/ConfigMerger.js';

// ===== 管理器 =====
export { LoadingManager } from './managers/LoadingManager.js';
export { CancelManager } from './managers/CancelManager.js';
export { TokenManager } from './managers/TokenManager.js';
export { AuthLockManager } from './managers/AuthLockManager.js';

// ===== 中间件工厂 =====
export {
  createDefaultPipeline,
  createConfigMergeMiddleware,
  createLoadingMiddleware,
  createCancelMiddleware,
  createTokenMiddleware,
  createLogRequestMiddleware,
  createUnpackMiddleware,
  createErrorMiddleware,
  createLogResponseMiddleware,
} from './middlewares/index.js';
export type { DefaultPipelineOptions } from './middlewares/index.js';

// ===== 工具函数 =====
export { generateCacheKey } from './utils/cache-key.js';
export { desensitize } from './utils/desensitize.js';
