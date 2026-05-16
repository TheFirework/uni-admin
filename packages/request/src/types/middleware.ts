import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { InternalRequestConfig } from './options.js';

/**
 * 请求上下文元数据
 * 记录请求的生命周期状态和控制信息
 */
export interface RequestContextMeta {
  /** 请求开始时间戳 */
  startTime: number;
  /** 请求唯一标识（用于取消、缓存等） */
  requestKey: string;
  /** AbortController 实例，用于请求取消 */
  abortController: AbortController;
  /** 是否已终止（错误或手动终止） */
  terminated: boolean;
  /** 快捷结果（用于缓存命中等场景，跳过实际 HTTP 请求） */
  shortcutResult?: unknown;
  /** 当前 Token 值（用于日志脱敏展示） */
  tokenValue?: string;
}

/**
 * 请求上下文 - 洋葱模型的核心数据载体
 * 
 * 贯穿整个中间件链，携带：
 * - config: 最终合并后的请求配置
 * - meta: 请求元数据（时间、取消控制等）
 * - next: 调用下一个中间件的函数
 * - response/error: 执行结果
 */
export interface RequestContext<T = unknown> {
  /** 合并后的最终请求配置 */
  config: InternalRequestConfig;
  /** 请求元数据 */
  meta: RequestContextMeta;
  /** 调用下一个中间件（由 Pipeline 注入） */
  next: () => Promise<void>;
  /** 响应结果（执行完成后填充） */
  response?: AxiosResponse<T, InternalAxiosRequestConfig>;
  /** 错误信息（出错时填充） */
  error?: unknown;
}

/**
 * 中间件处理函数类型
 * 
 * 洋葱模型中的每个中间件都遵循这个签名：
 * - 在调用 ctx.next() 之前执行的是「前置逻辑」（Before）
 * - 在调用 ctx.next() 之后执行的是「后置逻辑」（After）
 * 
 * @example
 * ```typescript
 * const loggerMiddleware: Middleware = async (ctx) => {
 *   console.log('请求发出前', ctx.config.url);
 *   await ctx.next();  // 调用后续中间件
 *   console.log('响应返回后', ctx.response?.status);
 * };
 * ```
 */
export type Middleware<T = unknown> = (ctx: RequestContext<T>) => Promise<void>;

/**
 * 中间件阶段枚举
 * 用于控制中间件的注册顺序
 */
export enum MiddlewarePhase {
  /** 配置合并阶段 */
  CONFIG_MERGE = 10,
  /** 请求取消阶段 */
  CANCEL = 20,
  /** Token 注入阶段 */
  TOKEN = 30,
  /** Loading 状态管理阶段 */
  LOADING = 40,
  /** 请求日志（前）阶段 */
  LOG_REQUEST = 50,
  /** 响应解包阶段 */
  UNPACK = 60,
  /** 错误处理阶段 */
  ERROR = 70,
  /** 响应日志（后）阶段 */
  LOG_RESPONSE = 80,
}
