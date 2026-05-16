import type { Middleware } from '../types/middleware.js';
import type { LoadingManager } from '../managers/LoadingManager.js';

/**
 * 创建 Loading 状态管理中间件
 *
 * ## 核心设计
 * - **前置逻辑**：根据配置决定是否增加 Loading 计数
 * - **后置逻辑**：使用 try/finally 确保无论成功、失败还是取消，都会减少计数
 *
 * ## 为什么用 try/finally？
 * 如果在 `await ctx.next()` 后直接 `decrement()`，当后续中间件抛出异常时，
 * 计数器不会递减，导致 Loading 状态卡住。try/finally 保证异常路径也能正确清理。
 */
export function createLoadingMiddleware(loadingManager: LoadingManager): Middleware {
  return async (ctx) => {
    // 从内部配置读取是否需要显示 Loading（默认为 true）
    const shouldShowLoading = ctx.config._internal?.loading !== false;

    if (shouldShowLoading) {
      loadingManager.increment();
    }

    try {
      // 穿透到下一个中间件（可能是 cancel → token → 实际 HTTP 请求等）
      await ctx.next();
    } finally {
      // 无论成功还是异常，都执行减计数
      if (shouldShowLoading) {
        // 特殊情况：如果请求被终止且没有响应对象，强制归零
        // 防止因异常导致计数器泄漏
        const needsForce = ctx.meta.terminated && !ctx.response;
        loadingManager.decrement(needsForce);
      }
    }
  };
}
