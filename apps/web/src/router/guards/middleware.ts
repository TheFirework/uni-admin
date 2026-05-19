/**
 * 中间件工厂函数与组合器
 *
 * 提供 createMiddleware 工厂函数和 compose 组合函数
 */

import type { Middleware, MiddlewareExecutor, RouterGuardContext } from './types';

/**
 * 创建中间件的工厂函数
 *
 * @param name - 中间件名称（用于日志和调试）
 * @param executor - 中间件执行逻辑
 * @param enabled - 是否启用（默认 true）
 * @returns 中间件对象
 */
export function createMiddleware(
  name: string,
  executor: MiddlewareExecutor,
  enabled: boolean = true
): Middleware {
  return { name, enabled, fn: executor };
}

/**
 * 洋葱模型核心组合函数
 *
 * 将中间件数组组合成一个可执行的函数
 * 执行顺序：middleware[0] → middleware[1] → ... → middleware[n]
 *
 * @param middlewares - 中间件数组
 * @returns 组合后的执行函数
 */
export function compose(middlewares: Middleware[]): (context: RouterGuardContext) => Promise<void> {
  const enabledMiddlewares = middlewares.filter((m) => m.enabled);

  return async (context: RouterGuardContext) => {
    const dispatch = async (index: number): Promise<void> => {
      if (index >= enabledMiddlewares.length) {
        return;
      }

      const middleware = enabledMiddlewares[index];
      console.log(`[Compose] 🔄 执行中间件 [${index + 1}/${enabledMiddlewares.length}]: ${middleware.name}`);

      await middleware.fn(context, () => dispatch(index + 1));
    };

    await dispatch(0);
  };
}
