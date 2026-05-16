import { HttpClient, createDefaultPipeline } from '@uni-admin/request';
import { LoadingManager, CancelManager, TokenManager, AuthLockManager } from '@uni-admin/request';
import { elementPlusNotifier } from '../adapters/error.adapter.js';
import { navigateToLogin } from '../adapters/router.adapter.js';

// 创建各管理器实例
const loadingManager = new LoadingManager();
const cancelManager = new CancelManager();
const tokenManager = new TokenManager();
const authLockManager = new AuthLockManager();

// 注入路由跳转能力到认证锁管理器
authLockManager.setNavigateToLogin(navigateToLogin);

// 创建默认 HTTP 客户端实例
const defaultInstance = new HttpClient({
  globalDefaults: {
    timeout: 15000,
    loading: true,
    showError: true,
    successCodes: [200, 0],
  },
  instanceConfig: {
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    errorNotifier: elementPlusNotifier,
  },
});

// 构建请求管道并挂载到实例
const pipeline = createDefaultPipeline({
  loadingManager,
  cancelManager,
  tokenManager,
  authLockManager,
  errorNotifier: elementPlusNotifier,
  globalDefaults: {
    timeout: 15000,
    loading: true,
    showError: true,
    successCodes: [200, 0],
  },
  instanceConfig: {
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  },
});

defaultInstance.pipeline = pipeline;

export { defaultInstance as defaultRequestInstance };
export default defaultInstance;
