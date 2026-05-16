import type { InternalAxiosRequestConfig } from 'axios';
import type { InternalRequestConfig } from '../types/options.js';

interface PendingEntry {
  controller: AbortController;
  pageKey?: string;
  timestamp: number;
}

/**
 * 请求取消管理器 - 统一管理所有进行中的 HTTP 请求
 * 
 * ## 核心功能
 * 1. **防重复请求**：相同 URL+参数的请求在短时间内重复发起时，自动取消旧请求
 * 2. **页面级批量取消**：页面切换时，批量取消该页面下所有未完成的请求
 * 3. **手动取消**：支持按 requestKey 取消指定请求
 * 4. **全局清理**：登出等场景下清空所有请求记录
 * 
 * ## 工作原理
 * - 基于 URL + Method + 序列化(Params) + 序列化(Data) 生成唯一 requestKey
 * - 维护 pendingMap（requestKey → AbortController）和 pageMap（pageKey → Set<requestKey>）
 * - 防重复窗口期：2 秒内相同 key 的请求会被视为重复
 * 
 * ## 使用场景
 * - **搜索框输入**：用户快速输入时，只保留最后一次请求
 * - **路由切换**：离开页面时自动取消该页面的所有请求
 * - **组件卸载**：Vue 组件 onUnmounted 时清理相关请求
 * 
 * @example
 * ```typescript
 * const cancelManager = new CancelManager();
 * 
 * // 注册请求（在中间件中调用）
 * const controller = cancelManager.register({
 *   method: 'GET',
 *   url: '/api/users',
 *   params: { page: 1 },
 *   _internal: { pageKey: 'user-list' }
 * });
 * 
 * // 如果是重复请求，controller 不为 null，需要 abort 它
 * if (controller) {
 *   controller.abort('[Dedupe] 重复请求被取消');
 * }
 * 
 * // 页面切换时批量取消
 * cancelManager.cancelByPage('user-list');
 * 
 * // 登出时清空所有
 * cancelManager.cleanupAll();
 * ```
 */
export class CancelManager {
  private pageMap = new Map<string, Set<string>>();

  generateKey(config: InternalAxiosRequestConfig | InternalRequestConfig): string {
    const { url, method, params, data } = config;
    const sortedParams = this.sortObject(params);
    const sortedData = this.sortObject(data);
    return `${method}:${url}:${JSON.stringify(sortedParams)}:${JSON.stringify(sortedData)}`;
  }

  register(config: InternalAxiosRequestConfig | InternalRequestConfig): AbortController | null {
    const key = this.generateKey(config);
    const existing = this.pendingMap.get(key);

    // 防重复：如果存在且未过期（2秒内），返回旧 controller（让调用方 abort 它）
    if (existing && Date.now() - existing.timestamp < 2000) {
      return existing.controller;
    }

    const controller = new AbortController();
    this.pendingMap.set(key, {
      controller,
      pageKey: (config as InternalRequestConfig)._internal?.pageKey,
      timestamp: Date.now(),
    });

    // 维护 pageKey -> requestKeys 的反向索引
    const pageKey = (config as InternalRequestConfig)._internal?.pageKey;
    if (pageKey) {
      if (!this.pageMap.has(pageKey)) this.pageMap.set(pageKey, new Set());
      this.pageMap.get(pageKey)!.add(key);
    }

    return null; // 无冲突，正常注册
  }

  cancel(requestKey: string): void {
    const entry = this.pendingMap.get(requestKey);
    if (entry) {
      entry.controller.abort();
      this.cleanup(requestKey);
    }
  }

  cancelByPage(pageKey: string): void {
    const keys = this.pageMap.get(pageKey);
    if (keys) {
      keys.forEach(key => this.cancel(key));
      this.pageMap.delete(pageKey);
    }
  }

  cleanup(requestKey: string): void {
    const entry = this.pendingMap.get(requestKey);
    if (!entry) return;

    this.pendingMap.delete(requestKey);

    // 同步清理 pageMap 反向索引
    if (entry.pageKey && this.pageMap.has(entry.pageKey)) {
      this.pageMap.get(entry.pageKey)!.delete(requestKey);
      if (this.pageMap.get(entry.pageKey)!.size === 0) {
        this.pageMap.delete(entry.pageKey);
      }
    }
  }

  /** 移除指定 key 的控制器（别名，供 HttpClient finally 清理使用） */
  removeController(requestKey: string): void {
    this.cleanup(requestKey);
  }

  cleanupAll(): void {
    this.pendingMap.clear();
    this.pageMap.clear();
  }

  private sortObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortObject(item));

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = this.sortObject((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  get size(): number {
    return this.pendingMap.size;
  }
}
