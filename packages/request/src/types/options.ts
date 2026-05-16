import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

/**
 * 请求基础配置选项
 */
export interface RequestBaseUrl {
  baseURL?: string;
}

export interface RequestTimeout {
  timeout?: number;
}

export interface RequestHeaders {
  headers?: Record<string, string>;
}

export interface RequestCredentials {
  withCredentials?: boolean;
}

export interface RequestResponseType {
  responseType?: AxiosRequestConfig['responseType'];
}

export interface RequestBaseOptions
  extends RequestBaseUrl,
    RequestTimeout,
    RequestHeaders,
    RequestCredentials,
    RequestResponseType {}

/**
 * 用户请求选项（对外暴露的 API）
 * 包含业务相关的配置项
 */
export interface RequestOptions extends RequestBaseOptions {
  /** HTTP 方法 */
  method?: string;
  /** 请求 URL */
  url?: string;
  /** 请求数据 */
  data?: unknown;
  /** 是否展示 loading */
  showLoading?: boolean;
  /** loading 提示文本 */
  loadingText?: boolean;
  /** 是否启用请求取消 */
  enableCancel?: boolean;
  /** 是否取消前一个相同请求 */
  cancelPrevious?: boolean;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number;
  /** 是否跳过 Token 注入 */
  skipToken?: boolean;
  /** 是否跳过错误处理中间件 */
  skipErrorHandling?: boolean;
  /** 是否展示错误消息 */
  showErrorMsg?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否展示错误（内部合并用） */
  showError?: boolean;
  /** 是否显示 loading（内部合并用） */
  loading?: boolean;
  /** 是否返回原始 Axios 响应 */
  returnRawResponse?: boolean;
  /** 是否返回 Blob 数据 */
  returnBlob?: boolean;
  /** 是否启用防重复请求 */
  dedupe?: boolean;
  /** 业务成功码列表 */
  successCodes?: number[];
  /** 页面级标识（用于页面切换时批量取消） */
  pageKey?: string;
  /** 缓存 TTL（毫秒，兼容小写拼写） */
  cacheTtl?: number;
}

/**
 * 内部配置元数据（框架内部使用，不暴露给调用方）
 */
export interface InternalMeta {
  /** 请求开始时间戳 */
  startTime: number;
  /** 页面级 key，用于路由切换时批量取消请求 */
  pageKey?: string;
  /** 是否展示错误信息 */
  showError: boolean;
  /** 是否显示 loading */
  loading: boolean;
  /** 是否跳过 Token 注入 */
  skipToken: boolean;
  /** 是否启用防重复请求 */
  dedupe: boolean;
  /** 是否返回原始 Axios 响应 */
  returnRawResponse: boolean;
  /** 是否返回 Blob 数据 */
  returnBlob: boolean;
  /** 是否跳过错误处理中间件 */
  skipErrorHandler?: boolean;
  /** 缓存 TTL（毫秒） */
  cacheTtl?: number;
  /** 业务成功码列表 */
  successCodes: number[];
}

/**
 * 内部请求配置类型
 * 合并了全局默认值、实例配置和单次请求选项后的最终配置
 * 用于 Pipeline 执行时的 ctx.config
 */
export type InternalRequestConfig = InternalAxiosRequestConfig & RequestOptions & {
  _internal?: InternalMeta;
};

/**
 * 实例级配置（HttpClient 构造时传入，对整个实例生效）
 */
export type InstanceConfig = Partial<RequestOptions> & {
  baseURL?: string;
  timeout?: number;
  showError?: boolean;
  loading?: boolean;
};

/**
 * 全局默认配置（跨实例共享）
 */
export type GlobalDefaults = Partial<RequestOptions> & {
  baseURL?: string;
  timeout?: number;
};
