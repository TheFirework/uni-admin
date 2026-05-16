import { shallowRef, onUnmounted, type Ref } from 'vue';
import { HttpClient } from '@uni-admin/request';
import type { RequestOptions, UseRequestReturn } from '@uni-admin/request';

export interface UseRequestOptions {
  instance?: HttpClient;
}

export function useRequest(options?: UseRequestOptions): UseRequestReturn {
  const instance = options?.instance ?? (() => {
    // 延迟导入避免循环依赖，实际使用时从 instances/default 导入
    return undefined as unknown as HttpClient;
  })();

  const loading = shallowRef(instance.loading);

  const unsub = instance.loadingManager.subscribe((state) => {
    loading.value = state;
  });

  onUnmounted(unsub);

  const get = <T = unknown>(url: string, reqOptions?: RequestOptions) =>
    instance.get<T>(url, reqOptions);

  const post = <T = unknown>(url: string, data?: unknown, reqOptions?: RequestOptions) =>
    instance.post<T>(url, data, reqOptions);

  const put = <T = unknown>(url: string, data?: unknown, reqOptions?: RequestOptions) =>
    instance.put<T>(url, data, reqOptions);

  const del = <T = unknown>(url: string, reqOptions?: RequestOptions) =>
    instance.del<T>(url, reqOptions);

  return { get, post, put, del, loading, instance };
}
