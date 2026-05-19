/**
 * 存储键名统一管理枚举
 *
 * 集中管理所有 localStorage/sessionStorage 的键名常量
 * 避免硬编码字符串散落在各文件中，便于维护和重构
 *
 * 使用示例：
 *   import { StorageKeys } from '@/config/storage-keys';
 *   storage.set(StorageKeys.TOKEN, value, { namespace: StorageNamespaces.AUTH });
 */

/** 存储命名空间 */
export const StorageNamespaces = {
  /** 认证相关（Token、用户信息） */
  AUTH: 'auth',
  /** 用户相关（偏好设置等） */
  USER: 'user',
  /** 标签页相关 */
  TAGS: 'tags',
  /** HTTP 客户端同步（供 TokenManager 读取） */
  HTTP_CLIENT: '',
} as const;

export type StorageNamespace = (typeof StorageNamespaces)[keyof typeof StorageNamespaces];

/**
 * 存储键名枚举
 *
 * 分类说明：
 *   - TOKEN_*: 认证令牌相关
 *   - USER_*: 用户信息相关
 *   - ROUTER_*: 路由状态相关
 *   - CACHE_*: 缓存数据相关
 */
export const StorageKeys = {
  // ====== 认证相关 ======

  /** 用户访问令牌（加密存储，namespace: auth） */
  TOKEN: 'token',

  /** HTTP 客户端可读取的令牌（标准存储，用于 Authorization header）
   *  注意：此 key 供外部 HTTP 库（如 axios/uni-admin-request）的 TokenManager 读取
   *  与 TOKEN 的区别：TOKEN 是加密存储在 auth 命名空间下，HTTP_TOKEN 是明文存储供 HTTP 客户端使用
   */
  HTTP_TOKEN: 'access_token',

  // ====== 用户信息 ======

  /** 当前登录用户信息（JSON 格式，包含 id、username、roles 等） */
  USER_INFO: 'userInfo',

  // ====== 路由状态 ======

  /** 动态路由加载完成标志 */
  ROUTES_LOADED: 'routesLoaded',

  // ====== 缓存数据 ======

  /** 菜单数据缓存（JSON 序列化的 MenuDTO[]） */
  MENU_CACHE: 'menuCache',

  /** 菜单数据缓存时间戳 */
  MENU_CACHE_TIMESTAMP: 'menuCacheTimestamp',

  // ====== 标签页 ======

  /** 标签页列表缓存 */
  TABS_CACHE: 'tabsCache',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
