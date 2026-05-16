import type { Middleware } from '../types/middleware.js';

/** 开发环境标志 */
const __DEV__ = process.env.NODE_ENV === 'development';

/** 生产环境标志 */
const __PROD__ = process.env.NODE_ENV === 'production';

/** 慢接口阈值（毫秒）：超过此时间的请求会被标记为慢接口 */
const SLOW_THRESHOLD_MS = 3000;

/**
 * 创建响应日志中间件
 *
 * ## 功能说明
 * 在请求完成后打印日志信息，区分开发环境和生产环境：
 *
 * ### 开发环境（__DEV__）
 * - 打印请求耗时、成功/失败状态
 * - 成功时显示响应数据
 * - 失败时显示错误对象
 * - 与 log.request 的 console.groupCollapsed 配对，使用 console.groupEnd 关闭折叠组
 *
 * ### 生产环境（__PROD__）
 * - 收集性能指标（用于监控系统）
 * - 检测慢接口并上报告警
 * - 不在控制台输出详细信息
 *
 * ## 耗时计算
 * 从 config.merge 中间件设置的 startTime 到当前时间的时间差，
 * 反映了整个请求生命周期的总耗时（包括中间件处理时间）。
 *
 * @example 开发环境输出示例
 * ```
 * ✅ [GET] /api/users (156ms)
 *   Response: [{ id: 1, name: "张三" }, ...]
 * ```
 *
 * @example 生产环境输出示例
 * （无控制台输出，数据发送到监控系统）
 */
export function createLogResponseMiddleware(): Middleware {
  return async (ctx) => {
    // 先穿透到下游（无下游中间件，实际执行 HTTP 请求）
    await ctx.next();

    // 计算请求总耗时（从 config.merge 设置的 startTime 开始）
    const duration = Date.now() - ctx.meta.startTime;

    if (__DEV__) {
      // ===== 开发环境：详细日志输出 =====
      if (ctx.error) {
        // 失败：红色图标 + 错误对象
        console.error(
          `%c❌ [${ctx.config.method?.toUpperCase()}] ${ctx.config.url}`,
          'color: #f44336; font-weight: bold;',
          `(${duration}ms)`,
          ctx.error,
        );
      } else {
        // 成功：绿色图标 + 响应数据
        console.log(
          `%c✅ [${ctx.config.method?.toUpperCase()}] ${ctx.config.url}`,
          'color: #4caf50; font-weight: bold;',
          `(${duration}ms)`,
          '\nResponse:',
          ctx.response?.data,
        );
      }

      // 关闭 log.request 中间件打开的折叠组
      console.groupEnd();
    } else if (__PROD__) {
      // ===== 生产环境：收集指标 + 慢接口检测 =====

      // 收集性能指标（P2 阶段实现：发送到监控收集点）
      collectMetrics({
        url: ctx.config.url || '',
        method: ctx.config.method || 'GET',
        duration,
        status: ctx.response?.status,
        success: !ctx.error,
      });

      // 检测慢接口并上报（超过 3 秒视为慢接口）
      if (duration > SLOW_THRESHOLD_MS) {
        reportSlowRequest({
          url: ctx.config.url || '',
          duration,
        });
      }
    }
  };
}

/**
 * 收集性能指标
 *
 * P2 阶段实现：
 * - 发送到 Prometheus / Grafana / 自建监控系统
 * - 支持采样率控制（避免数据量过大）
 * - 支持自定义端点配置
 */
function collectMetrics(_data: {
  url: string;
  method: string;
  duration: number;
  status?: number;
  success: boolean;
}): void {
  // TODO P2: 实现指标上报逻辑
  // 示例：
  // - fetch('/api/metrics', { method: 'POST', body: JSON.stringify(data) })
  // - 或使用 navigator.sendBeacon（页面关闭时也能发送）
}

/**
 * 上报慢接口告警
 *
 * P2 阶段实现：
 * - 发送到告警系统（钉钉/企微/邮件）
 * - 支持配置阈值和采样率
 * - 自动聚合相同 URL 的慢请求
 */
function reportSlowRequest(_data: {
  url: string;
  duration: number;
}): void {
  // TODO P2: 实现慢接口告警逻辑
  // 示例：
  // - fetch('/api/alerts/slow-request', { method: 'POST', body: JSON.stringify(data) })
  // - 或使用 WebSocket 实时推送
}
