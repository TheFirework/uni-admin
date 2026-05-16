import { onUnmounted, type Ref } from 'vue';
import { useRequest } from './useRequest.js';
import type { UseRequestReturn, RequestOptions } from '@uni-admin/request';

export interface UseRequestAutoCancelOptions {
  /** 是否在组件卸载时自动取消所有请求（默认 true） */
  autoCancelOnUnmount?: boolean;
}

export function useRequestAutoCancel(
  options?: UseRequestAutoCancelOptions,
): UseRequestReturn & { cancelAll: () => void } {
  const { get: baseGet, post: basePost, put: basePut, del: baseDel, loading, instance } = useRequest();
  
  const activeKeys = new Set<string>();

  // 包装请求方法，追踪活跃请求的 key
  const wrapRequest = async <T>(
    fn: (url: string, opts?: RequestOptions) => Promise<T>,
    url: string,
    opts?: RequestOptions,
  ): Promise<T> => {
    const key = `${opts?.method || 'GET'}:${url}`;
    activeKeys.add(key);
    
    try {
      return await fn(url, opts);
    } finally {
      activeKeys.delete(key);
    }
  };

  // 取消所有活跃请求
  const cancelAll = () => {
    for (const key of activeKeys) {
      instance.cancelManager.cancel(key);
    }
    activeKeys.clear();
  };

  // 默认在卸载时自动取消，可通过选项关闭
  const autoCancel = options?.autoCancelOnUnmount !== false;

  if (autoCancel) {
    onUnmounted(cancelAll);
  }

  return {
    get: <T>(url: string, opts?: RequestOptions) => wrapRequest<T>(baseGet<T>, url, opts),
    post: <T>(url: string, data?: unknown, opts?: RequestOptions) => 
      wrapRequest<T>((u, o) => basePost<T>(u, data, o), url, opts),
    put: <T>(url: string, data?: unknown, opts?: RequestOptions) => 
      wrapRequest<T>((u, o) => basePut<T>(u, data, o), url, opts),
    del: <T>(url: string, opts?: RequestOptions) => 
      wrapRequest<T>(baseDel<T>, url, opts),
    loading,
    instance,
    cancelAll,
  };
}
