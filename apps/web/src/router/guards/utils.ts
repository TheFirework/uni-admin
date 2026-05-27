/**
 * 路由守卫辅助工具函数
 *
 * 包含 Token 检查、同步等通用逻辑
 */

import { storage } from '@/utils/storage';
import { StorageKeys, StorageNamespaces } from '@/config/storage-keys';

/**
 * 检查 Token 是否存在
 * 支持加密和非加密两种存储格式（向后兼容）
 */
export async function checkTokenExists(): Promise<boolean> {
  try {
    let token = await storage.get<string>(StorageKeys.TOKEN, {
      defaultValue: '',
      namespace: StorageNamespaces.AUTH,
      encrypt: true,
    });

    if (!token) {
      token = await storage.get<string>(StorageKeys.TOKEN, {
        defaultValue: '',
        namespace: StorageNamespaces.AUTH,
        encrypt: false,
      });
    }

    return !!token;
  } catch (error) {
    console.warn('[Router Guard] Token 校验失败:', error);
    return false;
  }
}

/**
 * 【关键修复】同步 Token 到 HTTP 客户端
 *
 * 问题背景：
 *   - 登录时 Token 存储到 storage 工具的加密命名空间（key='token', namespace='auth'）
 *   - 但 HTTP 客户端的 TokenManager 从 localStorage['access_token'] 读取 Token
 *   - 两个存储位置不同导致 API 请求不携带 Authorization header → 401
 *
 * 解决方案：
 *   - 本函数在每次路由守卫执行时，将 Token 从加密存储同步到标准位置
 *   - 确保后续 API 请求能正确携带 Token
 */
export async function syncTokenToHttpClient(): Promise<void> {
  try {
    let token = await storage.get<string>(StorageKeys.TOKEN, {
      defaultValue: '',
      namespace: StorageNamespaces.AUTH,
      encrypt: true,
    });

    if (!token) {
      token = await storage.get<string>(StorageKeys.TOKEN, {
        defaultValue: '',
        namespace: StorageNamespaces.AUTH,
        encrypt: false,
      });
    }

    if (!token) {
      console.log('[syncToken] 无 Token 需要同步');
      return;
    }

    const currentToken = await storage.get<string>(StorageKeys.HTTP_TOKEN, {
      defaultValue: '',
      namespace: StorageNamespaces.HTTP_CLIENT,
    });

    if (currentToken === token) {
      console.log('[syncToken] Token 已同步（无需更新）');
      return;
    }

    await storage.set(StorageKeys.HTTP_TOKEN, token, {
      namespace: StorageNamespaces.HTTP_CLIENT,
    });

    // 同时写入原生 localStorage 的 'access_token' key
    // 因为 TokenManager 直接从 localStorage.getItem('access_token') 读取
    // 而 storage 工具类会添加 'ua:http_client:' 前缀导致位置不一致
    try {
      localStorage.setItem('access_token', token);
    } catch {
      // 静默失败
    }

    console.log('[syncToken] ✓ Token 已同步到 HTTP 客户端');
  } catch (error) {
    console.error('[syncToken] Token 同步失败:', error);
  }
}
