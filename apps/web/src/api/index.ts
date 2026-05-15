import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse } from '@uni-admin/shared-types';

/**
 * 创建 Axios 实例
 */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

/**
 * 请求拦截器
 */
service.interceptors.request.use(
  (config) => {
    // 可在此处添加 token 等认证信息
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data;

    // 根据业务状态码判断请求是否成功
    if (res.code === 200 || res.code === 0) {
      return response;
    }

    // 业务错误处理
    console.error('API error:', res.message);

    // 特殊错误码处理（如 token 过期）
    if (res.code === 401) {
      // 跳转到登录页
      window.location.href = '/login';
    }

    return Promise.reject(new Error(res.message || '请求失败'));
  },
  (error) => {
    console.error('Response error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * 封装 GET 请求
 */
export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.get(url, config);
}

/**
 * 封装 POST 请求
 */
export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.post(url, data, config);
}

/**
 * 封装 PUT 请求
 */
export function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.put(url, data, config);
}

/**
 * 封装 DELETE 请求
 */
export function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.delete(url, config);
}

export default service;
