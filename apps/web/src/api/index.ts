import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse } from '@uni-admin/shared-types';
import { env } from './utils/env.config';

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

export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.get(url, config);
}

export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.post(url, data, config);
}

export function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.put(url, data, config);
}

export function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.delete(url, config);
}

export default service;
