/**
 * 公共类型定义
 * 通用的基础类型，可被多处复用
 */

/** 主键类型：支持数字ID或字符串UUID */
export type ID = string | number;

/** 时间戳字段：包含创建时间和更新时间 */
export interface Timestamps {
  /** 创建时间 */
  createdAt: Date | string;
  /** 更新时间 */
  updatedAt: Date | string;
}

/** 通用状态枚举：启用/禁用 */
export enum EnumStatus {
  /** 启用 */
  ENABLED = 'ENABLED',
  /** 禁用 */
  DISABLED = 'DISABLED',
}

/** 下拉选项类型 */
export interface OptionItem {
  /** 显示文本 */
  label: string;
  /** 选项值 */
  value: string | number;
  /** 是否禁用（可选） */
  disabled?: boolean;
}
