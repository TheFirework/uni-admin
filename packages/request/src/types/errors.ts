/** 
 * 请求基础错误类
 * 所有自定义错误的基类，提供统一的错误结构
 * 
 * @example
 * ```typescript
 * try {
 *   await api.get('/user');
 * } catch (err) {
 *   if (err instanceof RequestError) {
 *     console.log(err.type);       // 错误类型枚举
 *     console.log(err.statusCode); // HTTP 状态码（如有）
 *     console.log(err.data);       // 响应数据（如有）
 *   }
 * }
 * ```
 */
export class RequestError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly statusCode?: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

/**
 * 错误类型枚举
 * 用于区分不同场景的错误，便于 errorMiddleware 统一处理或调用方精确捕获
 */
export enum ErrorType {
  /** 请求被取消（手动取消、防重复、路由切换等） */
  CANCEL = 'CANCEL',
  /** 请求超时 */
  TIMEOUT = 'TIMEOUT',
  /** 网络层错误（断网、DNS 解析失败、跨域等） */
  NETWORK = 'NETWORK',
  /** HTTP 状态码错误（4xx/5xx，服务端返回了非业务错误的状态码） */
  HTTP = 'HTTP',
  /** 业务错误（HTTP 200 但后端返回的 code 不在 successCodes 列表中） */
  BUSINESS = 'BUSINESS',
}

/**
 * 取消类错误
 * 触发场景：手动调用 cancel()、防重复检测、路由切换批量取消、组件卸载取消等
 * 
 * @example
 * ```typescript
 * try {
 *   await api.get('/user');
 * } catch (err) {
 *   if (err instanceof CancelError) {
 *     console.log('请求已取消，无需提示用户');
 *   }
 * }
 * ```
 */
export class CancelError extends RequestError {
  constructor(message = '请求已被取消') {
    super(message, ErrorType.CANCEL);
    this.name = 'CancelError';
  }
}

/**
 * 超时类错误
 * 当请求耗时超过配置的 timeout 时间时抛出
 */
export class TimeoutError extends RequestError {
  constructor(message = '请求超时') {
    super(message, ErrorType.TIMEOUT);
    this.name = 'TimeoutError';
  }
}

/**
 * 网络错误
 * 触发场景：断网、DNS 解析失败、SSL 握手失败、CORS 错误等
 * 
 * @param originalError - 原始的网络异常对象，可用于排查具体原因
 */
export class NetworkError extends RequestError {
  constructor(message = '网络连接失败', public readonly originalError?: Error) {
    super(message, ErrorType.NETWORK);
    this.name = 'NetworkError';
  }
}

/**
 * HTTP 状态码错误
 * 服务端返回了 4xx/5xx 状态码，且不属于业务错误范畴
 * （业务错误通常是 HTTP 200 + error code，由 BusinessError 表示）
 * 
 * @example
 * ```typescript
 * // 404 Not Found
 * throw new HttpError('资源不存在', 404, 'Not Found');
 * 
 * // 500 Internal Server Error
 * throw new HttpError('服务器内部错误', 500, undefined, { traceId: 'abc123' });
 * ```
 */
export class HttpError extends RequestError {
  constructor(
    message: string,
    statusCode: number,
    statusText?: string,
    data?: unknown,
  ) {
    super(message, ErrorType.HTTP, statusCode, data);
    this.name = 'HttpError';
    this.statusText = statusText;
  }
  
  /** HTTP 状态文本，如 "Not Found"、"Internal Server Error" */
  declare statusText?: string;
}

/**
 * 业务错误
 * HTTP 请求成功（状态码 200），但后端返回的业务 code 不在 successCodes 列表中
 * 
 * 这是最常见的错误类型，通常需要展示后端返回的错误消息给用户
 * 
 * @example
 * ```typescript
 * // 后端返回 { code: 40001, message: '参数校验失败', data: {...} }
 * throw new BusinessError('参数校验失败', 40001, { fields: ['name'] });
 * ```
 */
export class BusinessError extends RequestError {
  constructor(
    message: string,
    public readonly code: number,
    data?: unknown,
  ) {
    super(message, ErrorType.BUSINESS, undefined, data);
    this.name = 'BusinessError';
  }
}

/**
 * 类型守卫：判断错误是否为取消类错误
 * 用于 errorMiddleware 中静默处理取消场景
 */
export function isCancelError(error: unknown): error is CancelError {
  return error instanceof CancelError;
}
