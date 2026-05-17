import { z } from 'zod';

// ==================== 分页参数 Schema ====================
// 用于列表查询的分页参数验证
export const PaginationSchema = z.object({
  // 当前页码，默认为第1页
  page: z
    .number()
    .int('页码必须为整数')
    .positive('页码必须大于0')
    .default(1),

  // 每页条数，默认20条，最大100条
  pageSize: z
    .number()
    .int('每页条数必须为整数')
    .positive('每页条数必须大于0')
    .max(100, '每页最多100条数据')
    .default(20),
});

// 分页参数类型推导
export type PaginationInput = z.infer<typeof PaginationSchema>;

// ==================== ID 格式 Schema ====================
// 支持 CUID 或 UUID 格式的 ID 验证
export const IdSchema = z.string().cuid('ID格式不正确，必须为有效的CUID或UUID');

// 备选：如果需要使用 UUID 格式
export const UuidSchema = z.string().uuid('ID格式不正确，必须为有效的UUID');

// ID 类型推导
export type IdInput = z.infer<typeof IdSchema>;
export type UuidInput = z.infer<typeof UuidSchema>;

// ==================== 时间范围 Schema ====================
// 用于按时间范围筛选数据的场景（如日志查询、报表生成）
export const DateRangeSchema = z.object({
  // 开始时间
  startDate: z.date({
    required_error: '开始时间不能为空',
    invalid_error: '开始时间格式不正确',
  }),

  // 结束时间
  endDate: z.date({
    required_error: '结束时间不能为空',
    invalid_error: '结束时间格式不正确',
  }),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: '结束时间必须晚于或等于开始时间',
    path: ['endDate'],
  }
);

// 时间范围类型推导
export type DateRangeInput = z.infer<typeof DateRangeSchema>;

// ==================== 排序参数 Schema ====================
// 用于列表查询的排序功能
export const SortSchema = z.object({
  // 排序字段名
  field: z
    .string()
    .min(1, '排序字段不能为空')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '排序字段名格式不正确'),

  // 排序方向：升序或降序
  order: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: '排序方向必须是 asc（升序）或 desc（降序）' }),
  }),
});

// 排序参数类型推导
export type SortInput = z.infer<typeof SortSchema>;

// ==================== 查询参数聚合 Schema ====================
// 将分页、排序、时间范围等常用查询参数组合在一起
export const QueryParamsSchema = z.object({
  // 分页参数
  pagination: PaginationSchema.optional().default({ page: 1, pageSize: 20 }),

  // 排序参数（支持多字段排序）
  sort: z.array(SortSchema).optional(),

  // 时间范围筛选
  dateRange: DateRangeSchema.optional(),

  // 关键字搜索
  keyword: z.string().optional(),
});

// 查询参数类型推导
export type QueryParamsInput = z.infer<typeof QueryParamsSchema>;


