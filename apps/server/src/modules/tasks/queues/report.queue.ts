/**
 * 报表生成任务队列定义
 *
 * 功能说明:
 *   定义报表生成任务的队列名称和数据类型接口
 *   用于处理 Excel、PDF、CSV 等格式的大文件导出和报表生成场景
 *
 * 使用场景:
 *   - 用户数据批量导出（Excel/CSV）
 *   - 财务报表 PDF 生成
 *   - 运营数据统计报表
 *   - 自定义数据查询结果导出
 *
 * 性能考虑:
 *   - 大文件生成可能耗时较长，建议设置合理的超时时间
 *   - 支持异步生成 + 通知下载的模式
 *   - 可配合文件存储服务（OSS/S3）使用
 *
 * 数据流:
 *   Controller → TaskSchedulerService.addReportJob() → Bull Queue → ReportProcessor → 文件存储
 */

/** 报表输出格式类型 */
export type ReportFormat = 'excel' | 'pdf' | 'csv';

/**
 * 报表任务数据接口
 *
 * @property type - 输出格式 (excel/pdf/csv)
 * @property params - 报表参数（筛选条件、排序方式等）
 * @property userId - 发起用户 ID（用于权限校验和下载授权）
 *
 * 示例:
 * ```typescript
 * const reportJob: ReportJobData = {
 *   type: 'excel',
 *   params: {
 *     startDate: '2024-01-01',
 *     endDate: '2024-12-31',
 *     departmentId: 'dept-001',
 *     columns: ['name', 'email', 'role'],
 *   },
 *   userId: 'user-123',
 * };
 * ```
 */
export interface ReportJobData {
  /** 输出格式 (excel | pdf | csv) */
  type: ReportFormat;
  /** 报表参数（筛选条件、字段列表等） */
  params: Record<string, any>;
  /** 发起用户 ID（用于权限控制和审计） */
  userId: string;
}

/** 报表队列常量 */
export const REPORT_QUEUE_NAME = 'report-queue' as const;

/** 报表队列配置选项 */
export const REPORT_QUEUE_OPTIONS = {
  name: REPORT_QUEUE_NAME,
  // 报表任务特殊配置：允许较长执行时间，降低并发限制
  defaultJobOptions: {
    priority: 5,                    // 中等优先级
    attempts: 2,                    // 重试次数较少（避免重复生成）
    backoff: {
      type: 'fixed',                // 固定延迟（大文件生成不适合指数退避）
      delay: 5000,                  // 固定 5 秒延迟
    },
    timeout: 300000,                // 超时时间 5 分钟（大文件需要较长时间）
    removeOnComplete: { count: 200 },  // 成功作业保留 200 条
    removeOnFail: { count: 500 },     // 失败作业保留 500 条
  },
  // 并发控制：同时最多处理 3 个报表任务
  concurrency: 3,
} as const;

/** 报表生成结果接口 */
export interface ReportResult {
  /** 生成的文件路径或下载 URL */
  fileUrl: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 生成耗时（毫秒） */
  durationMs: number;
  /** 记录总数 */
  recordCount: number;
}
