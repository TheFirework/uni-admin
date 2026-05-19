/**
 * 路由路径统一管理枚举
 *
 * 集中管理所有路由路径字符串常量
 * 与 router/index.ts、router/routes/ 保持一致
 *
 * 设计原则：
 *   - 单一来源：所有路径定义在此处，避免硬编码散落各处
 *   - 类型安全：TypeScript 枚举提供自动补全和重构支持
 *   - 分层组织：按功能模块分组（公开页面、错误页面、业务页面等）
 *
 * 使用示例：
 *   import { RoutePaths } from '@/config/route-paths';
 *   navigate({ path: RoutePaths.LOGIN });
 */

/** 公开页面路由（无需认证） */
export const RoutePaths = {
  // ====== 认证相关 ======

  /** 登录页 */
  LOGIN: '/login',

  // ====== 错误页面 ======

  /** 403 无权限页 */
  FORBIDDEN: '/403',

  /** 404 页面不存在（由 Vue Router 通配符处理，此处仅作引用） */
  NOT_FOUND: '/404',

  // ====== 业务页面 ======

  /** 首页/工作台 */
  HOME: '/',
  DASHBOARD: '/dashboard',
} as const;

export type RoutePath = (typeof RoutePaths)[keyof typeof RoutePaths];

/**
 * 白名单路由集合（无需认证即可访问的路由）
 * 用于路由守卫的快速匹配
 */
export const WHITE_LIST_ROUTES = new Set<string>([
  RoutePaths.LOGIN,
  RoutePaths.FORBIDDEN,
  RoutePaths.NOT_FOUND,

]);

/**
 * 需要重定向到登录页的错误码
 */
export const AUTH_REDIRECT_CODES = new Set(['401', 'Unauthorized', 'guard_error']);
