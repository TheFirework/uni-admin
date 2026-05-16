// ===== 中间件相关类型（洋葱模型核心）=====
export type { Middleware, RequestContext, RequestContextMeta } from './middleware.js';

// ===== 请求选项（配置体系）=====
export type { 
  RequestOptions, 
  GlobalDefaults, 
  InstanceConfig,
  InternalRequestConfig,
} from './options.js';

// ===== 错误类（错误层次结构）=====
export type {
  RequestError,
  CancelError,
  TimeoutError,
  NetworkError,
  HttpError,
  BusinessError,
  ErrorType,
} from './errors.js';

// ===== 抽象接口（依赖注入点）=====
export type { ErrorNotifier } from './notifier.js';
