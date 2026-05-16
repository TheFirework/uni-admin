import { HttpClient, createDefaultPipeline } from '@uni-admin/request';
import { LoadingManager, CancelManager, TokenManager, AuthLockManager } from '@uni-admin/request';
import { elementPlusNotifier } from '../adapters/error.adapter.js';

// 第三方服务专用实例：不携带 token、不显示错误提示
const thirdPartyInstance = new HttpClient({
  globalDefaults: {
    timeout: 10000,
    loading: false,
    showError: false,
  },
  instanceConfig: {
    baseURL: import.meta.env.VITE_THIRD_PARTY_API_URL || '',
    skipToken: true,
    errorNotifier: elementPlusNotifier,
  },
});

thirdPartyInstance.pipeline = createDefaultPipeline({
  loadingManager: new LoadingManager(),
  cancelManager: new CancelManager(),
  tokenManager: new TokenManager(),
  authLockManager: new AuthLockManager(),
  errorNotifier: elementPlusNotifier,
  globalDefaults: { timeout: 10000, loading: false, showError: false },
  instanceConfig: { 
    baseURL: import.meta.env.VITE_THIRD_PARTY_API_URL || '',
    skipToken: true,
    errorNotifier: elementPlusNotifier,
  },
});

export { thirdPartyInstance };
export default thirdPartyInstance;
