import type { Middleware } from '../types/middleware.js';
import type { GlobalDefaults, InstanceConfig, InternalRequestConfig } from '../types/options.js';
import { ConfigMerger } from '../core/ConfigMerger.js';

/**
 * 内部元数据接口
 * 用于存储请求的运行时配置和状态标记
 */
interface InternalMetadata {
  /** 请求开始时间戳 */
  startTime: number;
  /** 是否跳过 Token 注入 */
  skipToken: boolean;
  /** 是否展示错误提示 */
  showError: boolean;
  /** 是否显示 Loading */
  loading: boolean;
  /** 是否返回原始 Axios 响应对象 */
  returnRawResponse: boolean;
  /** 是否返回 Blob 数据 */
  returnBlob: boolean;
  /** 是否启用防重复请求 */
  dedupe: boolean;
  /** 页面级标识（用于页面切换时批量取消） */
  pageKey?: string;
  /** 缓存 TTL（毫秒） */
  cacheTtl?: number;
  /** 业务成功码列表 */
  successCodes: number[];
}

export function createConfigMergeMiddleware(
  globalDefaults: GlobalDefaults,
  instanceConfig: InstanceConfig,
): Middleware {
  const merger = new ConfigMerger();

  return async (ctx) => {
    // 获取当前请求选项（尚未合并）
    const requestOptions = ctx.config;

    // 执行三层配置合并：全局默认 → 实例配置 → 单次请求
    const merged = merger.merge(globalDefaults, instanceConfig, requestOptions);

    // 构建内部元数据，用于控制后续中间件行为
    const internal: InternalMetadata = {
      startTime: Date.now(),
      // 优先级：单次请求 > 实例配置 > 默认值
      skipToken: merged.skipToken ?? instanceConfig.skipToken ?? false,
      showError: merged.showError ?? instanceConfig.showError ?? true,
      loading: merged.loading ?? instanceConfig.loading ?? true,
      returnRawResponse: merged.returnRawResponse ?? false,
      returnBlob: merged.returnBlob ?? false,
      dedupe: merged.dedupe ?? true,
      pageKey: merged.pageKey,
      cacheTtl: merged.cacheTtl,
      successCodes: merged.successCodes ?? [200, 0],
    };

    // 将合并后的配置和内部元数据写回上下文
    ctx.config = { ...merged, _internal: internal } as InternalRequestConfig;

    // 同步 startTime 到 meta（供 log.response 使用）
    ctx.meta.startTime = internal.startTime;

    await ctx.next();
  };
}
