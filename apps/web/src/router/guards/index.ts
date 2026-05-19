/**
 * 路由守卫主入口
 *
 * 组装洋葱模型中间件系统并注册到 Vue Router
 *
 * 导出：
 *   - setupRouterGuards: 主函数，注册路由守卫
 */

import type { Router } from 'vue-router';
import type { Middleware, RouterGuardContext } from './types';
import { compose } from './middleware';

// 导入各层中间件
import { whiteListMiddleware } from './layers/whiteList';
import { authMiddleware } from './layers/auth';
import { userSyncMiddleware } from './layers/userSync';
import { dynamicRouteMiddleware } from './layers/dynamicRoute';
import { permissionMiddleware } from './layers/permission';

/**
 * 中间件数组（定义执行顺序）
 *
 * 从索引 0 开始依次执行（对应洋葱模型从外到内）
 *
 * 使用说明：
 *   - 新增中间件：在数组适当位置添加新的中间件对象
 *   - 禁用中间件：设置 enabled: false 或从数组移除
 *   - 调整顺序：移动数组元素位置
 */
const middlewareChain: Middleware[] = [
  whiteListMiddleware,
  authMiddleware,
  userSyncMiddleware,
  dynamicRouteMiddleware,
  permissionMiddleware,
];

/**
 * 注册路由守卫
 *
 * 将洋葱模型中间件系统集成到 Vue Router
 * 同时注册 afterEach 钩子用于日志和标题设置
 *
 * @param router - Vue Router 实例
 */
export async function setupRouterGuards(router: Router): Promise<void> {
  console.log('[Router Guard] 🚀 初始化洋葱模型中间件系统...');
  console.log(`[Router Guard] 已注册 ${middlewareChain.length} 个中间件:`);
  middlewareChain.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name}${m.enabled ? '' : ' (禁用)'}`);
  });

  const runMiddlewares = compose(middlewareChain);

  router.beforeEach(async (to, from, next) => {
    console.log(`\n[Router Guard] 📍 导航触发: ${from.path} → ${to.path}`);
    console.time('[Router Guard] ⏱️ 中间件执行耗时');

    const context: RouterGuardContext = {
      to,
      from,
      next,
      router,
      aborted: false,
    };

    try {
      await runMiddlewares(context);
    } catch (error) {
      console.error('[Router Guard] 💥 中间件执行异常:', error);

      if (!context.aborted) {
        const { RoutePaths } = await import('@/config/route-paths');
        next({
          path: RoutePaths.LOGIN,
          query: { redirect: to.fullPath, error: 'guard_error' },
        });
      }
    }

    console.timeEnd('[Router Guard] ⏱️ 中间件执行耗时');
  });

  router.afterEach((to) => {
    if (to.meta?.title) {
      document.title = `${to.meta.title} - UniAdmin`;
    }
  });

  console.log('[Router Guard] ✅ 路由守卫注册完成\n');
}
