import type { Middleware } from '../types/middleware.js';
import type { TokenManager } from '../managers/TokenManager.js';

/**
 * 创建 Token 注入中间件
 *
 * ## 核心职责
 * 在请求发出前自动注入 Authorization 头，支持白名单机制。
 *
 * ## 白名单匹配规则
 * - **精确匹配**：URL 完全相等（如 `/auth/login`）
 * - **前缀匹配**：URL 以指定前缀开头（如 `/public/`）
 *
 * ## Token 优先级
 * 1. 请求级别配置 `skipToken: true`（最高优先级）
 * 2. URL 在 TokenManager 的白名单中
 * 3. 以上都不满足 → 自动注入 Token
 */
export function createTokenMiddleware(tokenManager: TokenManager): Middleware {
  return async (ctx) => {
    // 判断是否应该跳过 Token 注入
    const shouldSkipToken =
      // 优先检查请求级别的显式配置
      ctx.config._internal?.skipToken === true ||
      // 其次检查 URL 是否在白名单中
      tokenManager.isInWhiteList(ctx.config.url || '');

    if (!shouldSkipToken) {
      // 从 TokenManager 获取当前有效的 Token（async 兼容自定义获取函数）
      const token = await tokenManager.getToken();

      if (token) {
        // 确保 headers 对象存在
        ctx.config.headers = ctx.config.headers || {};

        // 注入 Bearer Token 到 Authorization 头
        (ctx.config.headers as Record<string, string>)['Authorization'] =
          `Bearer ${token}`;

        // 将 token 值存入 meta，供日志中间件脱敏使用
        ctx.meta.tokenValue = token;
      }
    }

    // 穿透到下一个中间件（log.request 或实际 HTTP 请求）
    await ctx.next();
  };
}
