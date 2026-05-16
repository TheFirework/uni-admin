import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { InternalRequestConfig } from '../types/options.js';

// 先从类型文件导入核心接口
export type { RequestContext, RequestContextMeta, Middleware } from '../types/middleware.js';

import type { RequestContext } from '../types/middleware.js';

/**
 * 创建新的请求上下文
 * 
 * 这是 RequestContext 的工厂函数，每次请求都会创建一个新的上下文实例。
 * 上下文贯穿整个中间件链，携带请求配置、元数据、响应结果等信息。
 * 
 * @param config - 合并后的最终请求配置（由 ConfigMerger 生成）
 * @returns 初始化好的 RequestContext 实例
 * 
 * @example
 * ```typescript
 * const ctx = createRequestContext<UserInfo>(mergedConfig);
 * // ctx.config - 请求配置
 * // ctx.meta - 元数据（时间、AbortController 等）
 * // ctx.next - 将由 Pipeline 注入
 * // ctx.response / ctx.error - 执行后填充
 * ```
 */
export function createRequestContext<T = unknown>(
  config: InternalRequestConfig,
): RequestContext<T> {
  const abortController = new AbortController();
  
  return {
    config,
    meta: {
      startTime: Date.now(),
      requestKey: '',
      abortController,
      terminated: false,
    },
    next: () => Promise.resolve(),
    response: undefined,
    error: undefined,
  };
}
