/**
 * Layer 1: 白名单检查中间件
 *
 * 职责：
 *   - 最外层拦截，最高优先级
 *   - 匹配白名单路由直接放行，不执行后续任何中间件
 *   - 特殊处理：已登录用户访问 /login 时重定向到首页
 */

import { WHITE_LIST_ROUTES, RoutePaths } from '@/config/route-paths';
import type { RouterGuardContext } from './types';
import { createMiddleware } from '../middleware';
import { checkTokenExists } from '../utils';

export const whiteListMiddleware = createMiddleware('whiteList', async (context, next) => {
  const { to, next: navigate } = context;

  console.log(`[Middleware:whiteList] 检查路径: ${to.path}`);

  if (!WHITE_LIST_ROUTES.has(to.path)) {
    await next();
    return;
  }

  if (to.path === RoutePaths.LOGIN) {
    const hasToken = await checkTokenExists();
    if (hasToken) {
      console.log('[Middleware:whiteList] 已登录用户访问登录页，重定向到首页');
      navigate({ path: RoutePaths.HOME });
      context.aborted = true;
      return;
    }
  }

  console.log('[Middleware:whiteList] 白名单匹配，直接放行');
  navigate();
  context.aborted = true;
});
