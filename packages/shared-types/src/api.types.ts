/**
 * API 请求/响应类型定义
 * 用于统一前后端的 API 数据交换格式
 */

/** 统一 API 响应包装 */
export interface ApiResponse<T = unknown> {
  /** 响应状态码（200=成功，其他=错误） */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 响应时间戳 */
  timestamp: string;
}

/** 分页响应数据 */
export interface PaginatedResponse<T = unknown> {
  /** 数据列表 */
  list: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码（从1开始） */
  page: number;
  /** 每页大小 */
  pageSize: number;
}

/** API 错误响应 */
export interface ApiError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情（可选） */
  details?: Record<string, unknown>;
}

/** 分页请求参数 */
export interface PaginationParams {
  /** 页码（从1开始，默认1） */
  page?: number;
  /** 每页大小（默认20） */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向：asc 或 desc */
  sortOrder?: 'asc' | 'desc';
}
