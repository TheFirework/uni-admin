/**
 * Layer 5: 权限校验中间件
 *
 * 职责：
 *   - 最终权限检查（内层拦截）
 *   - 检查 route.meta.roles 与当前用户角色是否匹配
 *   - 无 roles 要求的路由直接放行
 *   - 权限不足时重定向到 403 页面
 */

import { useAuthStore } from '@/stores/auth.store';
import { RoutePaths } from '@/config/route-paths';
import type { RouterGuardContext } from './types';
import { createMiddleware } from '../middleware';

export const permissionMiddleware = createMiddleware('permission', async (context, next) => {
  const { to, next: navigate } = context;
  const authStore = useAuthStore();

  console.log(`[Middleware:permission] 检查路由权限: ${to.path}`);

  if (!to.meta?.roles || !Array.isArray(to.meta.roles)) {
    console.log('[Middleware:permission] 路由无权限要求，放行 ✓');
    navigate();
    context.aborted = true;
    return;
  }

  const userRoles = authStore.roles || [];
  const requiredRoles = to.meta.roles as string[];
  const hasPermission = requiredRoles.some((role) => userRoles.includes(role));

  if (!hasPermission) {
    console.warn(
      `[Middleware:permission] 权限不足！需要: ${requiredRoles.join(',')}, 当前: ${userRoles.join(',')}`
    );
    navigate({ path: RoutePaths.FORBIDDEN });
    context.aborted = true;
    return;
  }

  console.log('[Middleware:permission] 权限校验通过 ✓');
  navigate();
  context.aborted = true;
});
