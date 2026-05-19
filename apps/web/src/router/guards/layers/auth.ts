/**
 * Layer 2: 登录校验中间件
 *
 * 职责：
 *   - 检查用户是否已登录（Token 存在且有效）
 *   - 未登录时重定向到登录页，携带原始路径用于登录后跳回
 */

import { RoutePaths } from '@/config/route-paths';
import type { RouterGuardContext } from './types';
import { createMiddleware } from '../middleware';
import { checkTokenExists } from '../utils';

export const authMiddleware = createMiddleware('auth', async (context, next) => {
  const { to, next: navigate } = context;

  console.log('[Middleware:auth] 开始 Token 校验...');

  // 检查 Token 是否存在且有效
  const hasToken = await checkTokenExists();

  if (!hasToken) {
    console.warn('[Middleware:auth] 无有效 Token，重定向到登录页');
    navigate({
      path: RoutePaths.LOGIN,
      query: { redirect: to.fullPath },
    });
    context.aborted = true;
    return;
  }

  console.log('[Middleware:auth] Token 校验通过 ✓');
  await next();
});
