/**
 * 清理维护任务队列定义
 *
 * 功能说明:
 *   定义系统清理维护任务的队列名称和数据类型接口
 *   用于定时清理过期数据、临时文件、旧日志等维护性操作
 *
 * 使用场景:
 *   - 清理过期的 RefreshToken（Redis 清理）
 *   - 清理临时上传文件（本地/OSS 临时文件）
 *   - 清理归档旧日志文件（磁盘空间管理）
 *   - 定期数据归档和压缩
 *
 * 执行特点:
 *   - 通常由定时任务触发（Cron Job）
 *   - 支持延迟执行（避开业务高峰期）
 *   - 操作不可逆，需谨慎执行
 *   - 建议在低峰期执行（如凌晨）
 *
 * 数据流:
 *   Cron Scheduler → TaskSchedulerService.addCleanupJob(data, delayMs) → Bull Queue → CleanupProcessor
 */

/** 清理任务类型枚举 */
export type CleanupType = 'expired-tokens' | 'temp-files' | 'old-logs';

/**
 * 清理任务数据接口
 *
 * @property type - 清理类型 (expired-tokens/temp-files/old-logs)
 * @property options - 清理选项（保留天数、文件匹配模式等）
 *
 * 示例:
 * ```typescript
 * // 清理 7 天前的临时文件
 * const cleanupJob: CleanupJobData = {
 *   type: 'temp-files',
 *   options: {
 *     olderThanDays: 7,
 *     directory: '/tmp/uploads',
 *     pattern: '*.tmp',
 *   },
 * };
 *
 * // 清理过期 Token（立即执行）
 * const tokenCleanup: CleanupJobData = {
 *   type: 'expired-tokens',
 *   options: {
 *     batchSize: 1000,  // 每次扫描数量
 *   },
 * };
 * ```
 */
export interface CleanupJobData {
  /** 清理类型 (expired-tokens | temp-files | old-logs) */
  type: CleanupType;
  /** 清理选项（可选，不同类型有不同默认值） */
  options?: Record<string, any>;
}

/** 清理队列常量 */
export const CLEANUP_QUEUE_NAME = 'cleanup-queue' as const;

/** 清理队列配置选项 */
export const CLEANUP_QUEUE_OPTIONS = {
  name: CLEANUP_QUEUE_NAME,
  // 清理任务特殊配置：低优先级，支持延迟执行
  defaultJobOptions: {
    priority: 10,                   // 低优先级（不影响业务任务）
    attempts: 1,                    // 清理任务通常不重试（避免重复删除）
    removeOnComplete: { count: 100 },  // 成功作业保留 100 条
    removeOnFail: { count: 200 },     // 失败作业保留 200 条
  },
} as const;

/** 清理结果统计接口 */
export interface CleanupResult {
  /** 删除的记录/文件数量 */
  deletedCount: number;
  /** 释放的存储空间（字节） */
  freedSpace: number;
  /** 清理耗时（毫秒） */
  durationMs: number;
  /** 清理详情 */
  details?: string;
}
