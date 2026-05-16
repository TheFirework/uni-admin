import type { Middleware } from '../types/middleware.js';

/** 开发环境标志 */
const __DEV__ = process.env.NODE_ENV === 'development';

/**
 * 创建请求日志中间件
 *
 * ## 功能说明
 * 仅在开发环境下生效，打印完整的请求信息：
 * - HTTP 方法和 URL（带颜色和图标）
 * - 请求参数（params）
 * - 请求体（data，已脱敏）
 * - 请求头（headers，Token 已脱敏）
 *
 * ## 输出格式
 * 使用 console.groupCollapsed 折叠输出，避免控制台过于拥挤。
 * 与 log.response 中间件的 console.groupEnd 配对使用。
 *
 * @example 控制台输出示例
 * ```
 * ▼ 📡 [GET] /api/users
 *   Params: { page: 1, size: 10 }
 *   Data: undefined
 *   Headers: { Authorization: "Bearer abcd...xyz" }
 * ```
 */
export function createLogRequestMiddleware(): Middleware {
  return async (ctx) => {
    if (__DEV__) {
      // 开始折叠组（与 log.response 的 groupEnd 配对）
      console.groupCollapsed(
        `%c📡 [${ctx.config.method?.toUpperCase()}] ${ctx.config.url}`,
        'color: #2196F3; font-weight: bold;'
      );

      // 打印 URL 查询参数
      console.log('%cParams:', 'color: #666', ctx.config.params);

      // 打印请求体（敏感数据已脱敏）
      console.log('%cData:', 'color: #666', maskSensitiveData(ctx.config.data));

      // 打印请求头（Token 已脱敏处理）
      console.log('%cHeaders:', 'color: #666', {
        ...ctx.config.headers,
        Authorization: ctx.meta.tokenValue
          ? `Bearer ${maskToken(ctx.meta.tokenValue)}`
          : '(none)',
      });
    }

    // 穿透到下一个中间件（loading → cancel → token → unpack 等）
    await ctx.next();
  };
}

/**
 * 敏感数据脱敏
 * 简单实现：实际生产环境应使用 desensitize 工具函数
 * TODO: 集成 utils/desensitize.ts
 */
function maskSensitiveData(data: unknown): unknown {
  // P2 阶段完善：对 password、phone、idCard 等字段进行掩码处理
  return data;
}

/**
 * Token 脱敏显示
 * 只显示前 4 位和后 4 位，中间用省略号代替
 */
function maskToken(token?: string): string {
  if (!token) return '';
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
