/**
 * @deprecated 此文件为旧版 API 封装，请迁移至 @/lib/request
 * 
 * 迁移指南:
 * - 旧: import { get, post } from '@/api'
 * - 新: import { useRequest } from '@/lib/request'
 * 
 * 新封装特性:
 * - ✅ 洋葱模型中间件架构（可扩展、可插拔）
 * - ✅ 三层配置合并（全局 > 实例 > 接口级）
 * - ✅ 自动响应解包（直接拿到 T 而非 AxiosResponse<ApiResponse<T>>）
 * - ✅ 401 加锁处理（并发只跳转一次）
 * - ✅ Loading 状态管理（实例隔离 + 接口级开关）
 * - ✅ 请求取消（防重复 + 路由切换 + 组件卸载）
 * - ✅ 错误分类处理（Cancel 静默 / 401 加锁 / 其他弹窗）
 * 
 * @see {@link https://github.com/your-repo/docs/migration-guide}
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse } from '@uni-admin/shared-types';
import { env } from './utils/env.config';

const _DEPRECATED_MSG = `
[⚠️ @/api] 此 API 封装已废弃，请迁移至 @/lib/request
迁移示例:
  import { useRequest } from '@/lib/request'
  const { get, loading } = useRequest()
  const data = await get<User[]>('/users') // 直接拿到 User[]
`;

const service: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

service.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data;

    if (res.code === 200 || res.code === 0) {
      return response;
    }

    console.error('API error:', res.message);

    if (res.code === 401) {
      window.location.href = '/login';
    }

    return Promise.reject(new Error(res.message || '请求失败'));
  },
  (error) => {
    console.error('Response error:', error.message);
    return Promise.reject(error);
  }
);

/** @deprecated 使用 useRequest() 替代 */
export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  if (process.env.NODE_ENV === 'development') {
    console.warn(_DEPRECATED_MSG);
  }
  return service.get(url, config);
}

/** @deprecated 使用 useRequest() 替代 */
export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  if (process.env.NODE_ENV === 'development') {
    console.warn(_DEPRECATED_MSG);
  }
  return service.post(url, data, config);
}

/** @deprecated 使用 useRequest() 替代 */
export function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  if (process.env.NODE_ENV === 'development') {
    console.warn(_DEPRECATED_MSG);
  }
  return service.put(url, data, config);
}

/** @deprecated 使用 useRequest() 替代 */
export function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  if (process.env.NODE_ENV === 'development') {
    console.warn(_DEPRECATED_MSG);
  }
  return service.delete(url, config);
}

/** @deprecated 使用 defaultInstance 替代 */
export default service;
