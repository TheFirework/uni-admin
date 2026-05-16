import { HttpClient, createDefaultPipeline } from '@uni-admin/request';
import { LoadingManager, CancelManager, TokenManager, AuthLockManager } from '@uni-admin/request';
import { elementPlusNotifier } from '../adapters/error.adapter.js';
import { navigateToLogin } from '../adapters/router.adapter.js';

// 🔧 调试日志：确认此文件是否被加载
console.log('[default.ts] 🚀 正在初始化 request 实例...');
console.log('[default.ts] TokenManager 构造函数:', TokenManager?.toString()?.slice(0, 30));

// 创建各管理器实例
const loadingManager = new LoadingManager();
const cancelManager = new CancelManager();
// 显式传入白名单数组（避免构造函数参数推断问题）
const tokenManager = new TokenManager([
  '/auth/login',
  '/auth/register',
  '/auth/captcha',
  '/public/',
]);
// 🔧 调试日志：确认 tokenManager 是否创建成功
console.log('[default.ts] ✅ tokenManager 已创建:', typeof tokenManager, tokenManager?.constructor?.name);
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
