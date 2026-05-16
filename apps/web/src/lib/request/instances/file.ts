import { HttpClient, createDefaultPipeline } from '@uni-admin/request';
import { LoadingManager, CancelManager, TokenManager, AuthLockManager } from '@uni-admin/request';
import { elementPlusNotifier } from '../adapters/error.adapter.js';

// 文件上传专用实例：超时时间更长、默认不显示 loading
const fileInstance = new HttpClient({
  globalDefaults: {
    timeout: 300000,
    loading: false,
    showError: true,
  },
  instanceConfig: {
    baseURL: '/api/file',
    errorNotifier: elementPlusNotifier,
  },
});

fileInstance.pipeline = createDefaultPipeline({
  loadingManager: new LoadingManager(),
  cancelManager: new CancelManager(),
  tokenManager: new TokenManager(),
  authLockManager: new AuthLockManager(),
  errorNotifier: elementPlusNotifier,
  globalDefaults: { timeout: 300000, loading: false, showError: true },
  instanceConfig: { baseURL: '/api/file', errorNotifier: elementPlusNotifier },
});

export { fileInstance };
export default fileInstance;
