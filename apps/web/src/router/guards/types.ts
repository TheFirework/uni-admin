/**
 * 路由守卫类型定义
 *
 * 定义洋葱模型中间件系统的核心类型
 */

import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';

/**
 * 路由守卫上下文
 * 在中间件链中传递的共享状态
 */
export interface RouterGuardContext {
  to: RouteLocationNormalized;
  from: RouteLocationNormalized;
  next: NavigationGuardNext;
  router: Router;
  aborted: boolean;
}

/**
 * 中间件执行函数类型
 */
export type MiddlewareExecutor = (
  context: RouterGuardContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * 中间件定义（工厂函数创建的对象结构）
 */
export interface Middleware {
  name: string;
  enabled: boolean;
  fn: MiddlewareExecutor;
}

/**
 * 全局请求锁状态
 * 用于防止 menus 接口被重复请求
 */
export interface RequestLock {
  isFetching: boolean;
  fetchPromise: Promise<RouteRecordRaw[]> | null;
  lastFetchTime: number;
  errorCount: number;
}
