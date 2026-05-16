import type { Middleware } from '../types/middleware.js';
import type { CancelManager } from '../managers/CancelManager.js';
import { CancelError } from '../types/errors.js';

/**
 * 创建请求取消中间件
 *
 * ## 核心职责
 * 1. **防重复检测**：相同请求在短时间内重复发起时，自动取消前一个
 * 2. **AbortController 注册**：为当前请求创建控制器，支持外部手动取消
 * 3. **请求键生成**：基于 method + url + params + data 生成唯一标识
 * 4. **资源清理**：请求完成后从 pendingMap 中移除记录
 *
 * ## 执行流程
 * ```
 * Before:
 *   1. 检查是否启用防重复（dedupe）
 *   2. 如果启用，注册到 CancelManager 并检查是否有冲突
 *   3. 如有冲突，abort 旧请求
 *   4. 创建新的 AbortController 并绑定到 config.signal
 *   5. 生成 requestKey 存入 meta
 *
 * After (via finally):
 *   6. 清理 pendingMap 中的记录
 * ```
 */
export function createCancelMiddleware(cancelManager: CancelManager): Middleware {
  return async (ctx) => {
    // 检查是否启用防重复（默认启用）
    const dedupeEnabled = ctx.config._internal?.dedupe !== false;

    if (dedupeEnabled) {
      // 注册到 CancelManager，如果有冲突会返回旧的 controller
      const prevController = cancelManager.register(ctx.config);

      // 如果存在冲突（2秒内相同请求），取消旧的
      if (prevController) {
        prevController.abort(
          `[Dedupe] 取消重复请求: ${ctx.config.method} ${ctx.config.url}`
        );
      }
    }

    // 为当前请求创建 AbortController
    const controller = new AbortController();

    // 将 signal 绑定到 axios 配置（axios 原生支持 AbortSignal）
    ctx.config.signal = controller.signal;

    // 将 controller 存入 meta，供外部（如组件卸载时）手动取消
    ctx.meta.abortController = controller;

    // 生成唯一请求标识（用于后续 cleanup 和外部取消）
    ctx.meta.requestKey = cancelManager.generateKey(ctx.config);

    try {
      // 穿透到后续中间件（token → HTTP 请求）
      await ctx.next();
    } catch (error) {
      // 捕获取消相关的错误，转换为标准的 CancelError
      const errMsg = error instanceof Error ? error.message : String(error);

      // 判断是否为取消类错误（axios/cancel-token 兼容多种错误消息格式）
      const isCancel =
        errMsg.includes('canceled') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('abort');

      if (isCancel) {
        // 包装为标准 CancelError，并标记终止状态
        ctx.error = new CancelError(`请求被取消: ${ctx.config.url}`);
        ctx.meta.terminated = true;
        return; // 不再向后抛出，由 error middleware 统一处理
      }

      // 非取消类错误继续向外抛出
      throw error;
    } finally {
      // 无论成功、失败还是取消，都要清理 pendingMap
      cancelManager.cleanup(ctx.meta.requestKey);
    }
  };
}
