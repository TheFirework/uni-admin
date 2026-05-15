/**
 * 实体类型定义
 * 对应数据库模型的 TypeScript 类型
 */

import type { ID, Timestamps } from './common.types.js';
import { UserStatus, EnumStatus, PermissionType } from './enums.js';

/** 用户实体 */
export interface IUser extends Timestamps {
  /** 用户ID */
  id: ID;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 昵称 */
  nickname: string;
  /** 头像URL */
  avatar: string | null;
  /** 角色ID列表 */
  roleIds: ID[];
  /** 用户状态 */
  status: UserStatus;
}

/** 角色实体 */
export interface IRole extends Timestamps {
  /** 角色ID */
  id: ID;
  /** 角色名称 */
  name: string;
  /** 角色编码（唯一标识） */
  code: string;
  /** 角色描述 */
  description: string | null;
  /** 关联的权限ID列表 */
  permissions: ID[];
  /** 角色状态 */
  status: EnumStatus;
}

/** 权限实体 */
export interface IPermission {
  /** 权限ID */
  id: ID;
  /** 权限名称 */
  name: string;
  /** 权限编码（唯一标识） */
  code: string;
  /** 权限类型 */
  type: PermissionType;
  /** 关联资源（如路由路径、API路径等） */
  resource: string;
  /** 操作类型（如 read, write, delete 等） */
  action: string;
  /** 权限状态 */
  status: EnumStatus;
}

/** 菜单实体 */
export interface IMenu extends Timestamps {
  /** 菜单ID */
  id: ID;
  /** 父级菜单ID（顶级菜单为0或null） */
  parentId: ID;
  /** 菜单名称 */
  name: string;
  /** 路由路径 */
  path: string;
  /** 图标名称 */
  icon: string | null;
  /** 组件路径 */
  component: string | null;
  /** 排序号（越小越靠前） */
  sort: number;
  /** 是否可见 */
  visible: boolean;
  /** 菜单状态 */
  status: EnumStatus;
}