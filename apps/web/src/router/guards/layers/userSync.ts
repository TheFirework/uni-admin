/**
 * Layer 3: 用户信息同步中间件
 *
 * 职责：
 *   - 【关键】将 Token 从加密存储同步到 HTTP 客户端可读取的位置
 *   - 解决 401 循环刷新问题：确保 API 请求携带 Authorization header
 *   - 确保用户信息在 Pinia Store 中就绪（从 Storage 恢复或保持）
 */

import { useAuthStore } from '@/stores/auth.store';
import type { RouterGuardContext } from './types';
import { createMiddleware } from '../middleware';
import { syncTokenToHttpClient } from '../utils';

export const userSyncMiddleware = createMiddleware('userSync', async (context, next) => {
  console.log('[Middleware:userSync] 开始同步用户信息和 Token...');

  const authStore = useAuthStore();

  try {
    if (!authStore.isAuthenticated || !authStore.accessToken) {
      console.log('[Middleware:userSync] Store 无用户信息，尝试从 Storage 恢复...');
      await authStore.checkAuth();
    }

    await syncTokenToHttpClient();

    console.log('[Middleware:userSync] 用户信息同步完成 ✓');
  } catch (error) {
    console.error('[Middleware:userSync] 用户信息同步失败:', error);
  }

  await next();
});
