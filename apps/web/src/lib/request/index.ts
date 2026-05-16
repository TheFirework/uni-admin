// Adapters — 平台适配层
export { ElementPlusErrorNotifier, elementPlusNotifier } from './adapters/error.adapter.js';
export { setRouter, getRouter, navigateToLogin } from './adapters/router.adapter.js';
export { getToken, setToken, removeToken, clearAuthStorage } from './adapters/storage.adapter.js';

// Composables — Vue 组合式函数
export { useRequest } from './composables/useRequest.js';
export type { UseRequestOptions } from './composables/useRequest.js';
export { useRequestAutoCancel } from './composables/useRequestAutoCancel.js';
export type { UseRequestAutoCancelOptions } from './composables/useRequestAutoCancel.js';

// Instances — HTTP 客户端实例
export { defaultRequestInstance as defaultInstance } from './instances/default.js';
export { fileInstance } from './instances/file.js';
export { thirdPartyInstance } from './instances/thirdparty.js';
