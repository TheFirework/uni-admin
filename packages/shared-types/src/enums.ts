/**
 * 枚举常量定义
 * 系统中使用的所有枚举值集中管理
 */

/** 用户角色枚举 */
export enum UserRole {
  /** 管理员 */
  ADMIN = 'ADMIN',
  /** 普通用户 */
  USER = 'USER',
  /** 访客 */
  GUEST = 'GUEST',
}

/** 用户状态枚举 */
export enum UserStatus {
  /** 正常 */
  ACTIVE = 'ACTIVE',
  /** 停用 */
  INACTIVE = 'INACTIVE',
  /** 锁定 */
  LOCKED = 'LOCKED',
}

/** 通用状态枚举（用于角色、权限、菜单等） */
export enum EnumStatus {
  /** 启用 */
  ENABLED = 1,
  /** 禁用 */
  DISABLED = 0,
}

/** 权限类型枚举 */
export enum PermissionType {
  /** 菜单权限 */
  MENU = 'MENU',
  /** 按钮权限 */
  BUTTON = 'BUTTON',
  /** API接口权限 */
  API = 'API',
}

/** HTTP 方法枚举 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}