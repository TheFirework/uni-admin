export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  timestamp: string;
  path?: string;
  details?: ValidationErrorDetail[];
  pagination?: PaginationMeta;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedData<T = unknown> {
  list: T[];
  pagination: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
