import type { PropType } from 'vue';

/** 列定义类型 */
export interface Column<T = Record<string, unknown>> {
  /** 列键名（对应数据字段） */
  key: keyof T | string;
  /** 列标题 */
  label: string;
  /** 列宽 */
  width?: number;
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义格式化函数 */
  formatter?: (row: T, column: Column<T>, cellValue: unknown) => string;
  /** 自定义插槽名称 */
  slotName?: string;
}

/** DataTable Props */
export interface DataTableProps<T = Record<string, unknown>> {
  /** 列配置 */
  columns: Column<T>[];
  /** 数据源 */
  data: T[];
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 行 key 字段名 */
  rowKey?: string;
  /** 是否显示序号列 */
  showIndex?: boolean;
  /** 是否显示多选框 */
  showSelection?: boolean;
  /** 分页配置 */
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
  };
  /** 空状态文本 */
  emptyText?: string;
}
