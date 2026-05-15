import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull'; // 使用 import type 解决装饰器类型引用问题

// 导入队列名称常量和数据类型
import {
  EMAIL_QUEUE_NAME,
  type EmailJobData,
} from './queues/email.queue';
import {
  REPORT_QUEUE_NAME,
  type ReportJobData,
} from './queues/report.queue';
import {
  CLEANUP_QUEUE_NAME,
  type CleanupJobData,
} from './queues/cleanup.queue';

/**
 * 队列统计信息接口
 *
 * @property waiting - 等待处理的任务数量
 * @property active - 正在处理的任务数量
 * @property completed - 已完成的任务数量
 * @property failed - 失败的任务数量
 */
export interface QueueStats {
  /** 等待中（排队）的任务数 */
  waiting: number;
  /** 正在执行的任务数 */
  active: number;
  /** 已成功完成的任务数 */
  completed: number;
  /** 已失败的任务数 */
  failed: number;
  /** 延迟执行的任务数（可选） */
  delayed?: number;
}

/**
 * 任务调度服务
 *
 * 功能说明:
 *   统一管理所有 Bull 队列的任务添加和状态查询
 *   提供类型安全的任务提交接口，避免直接操作 Queue 实例
 *
 * 设计原则:
 *   - 单一入口：所有任务通过此服务添加，便于统一日志和监控
 *   - 类型安全：每个方法都有明确的输入输出类型
 *   - 错误隔离：单个队列异常不影响其他队列的使用
 *
 * 使用示例:
 * ```typescript
 * // 在 Controller 或 Service 中注入
 * constructor(private readonly taskScheduler: TaskSchedulerService) {}
 *
 * // 添加邮件任务
 * await this.taskScheduler.addEmailJob({
 *   to: 'user@example.com',
 *   subject: '欢迎注册',
 *   template: 'welcome',
 *   data: { username: '张三' },
 * });
 *
 * // 添加延迟清理任务（1 小时后执行）
 * await this.taskScheduler.addCleanupJob(
 *   { type: 'temp-files', options: { olderThanDays: 7 } },
 *   3600000  // 延迟 1 小时
 * );
 *
 * // 查询队列统计
 * const stats = await this.taskScheduler.getQueueStats('email-queue');
 * console.log(stats); // { waiting: 5, active: 1, completed: 100, failed: 2 }
 * ```
 *
 * TODO: [邮件服务集成] 完善邮件发送的完整流程
 *   - 集成 Nodemailer 或 SendGrid SDK 到 EmailProcessor
 *   - 支持 HTML 邮件模板（Handlebars/EJS 动态渲染）
 *   - 实现邮件发送状态追踪（已发送/失败/退信/打开率）
 *   - 添加邮件队列监控面板（发送延迟、失败重试统计）
 *   参考: https://docs.nestjs.com/techniques/email
 *
 * TODO: [任务优先级与调度] 增强任务管理能力
 *   - 支持动态优先级调整（紧急任务插队）
 *   - 实现 Cron 表达式定时任务（@nestjs/schedule 集成）
 *   - 任务依赖关系（DAG 有向无环图，A 完成后才执行 B）
 *   - 任务超时自动取消 + 失败告警通知（钉钉/企微 Webhook）
 *
 * TODO: [可观测性] 集成分布式链路追踪
 *   - 注入 traceId/spanId 到 Job metadata（OpenTelemetry）
 *   - 任务执行耗时 Prometheus histogram 指标
 *   - 失败任务自动上报到 Sentry/阿里云日志服务
 *   - Grafana Dashboard 展示队列健康度（积压数、处理速率）
 */
@Injectable()
export class TaskSchedulerService {
  /** 日志实例 */
  private readonly logger = new Logger(TaskSchedulerService.name);

  /**
   * 构造函数 - 注入三个队列实例
   *
   * @InjectQueue() 装饰器用于从 BullModule 中获取已注册的 Queue 实例
   * 队列名称必须与 BullModule.registerQueue() 中注册的名称一致
   */
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
    @InjectQueue(REPORT_QUEUE_NAME) private readonly reportQueue: Queue,
    @InjectQueue(CLEANUP_QUEUE_NAME) private readonly cleanupQueue: Queue,
  ) {}

  /**
   * 添加邮件发送任务
   *
   * @param data - 邮件任务数据（收件人、主题、模板、变量）
   * @param options - 可选的作业选项（优先级、延迟等）
   * @returns 创建的 Job 对象，可用于跟踪任务状态
   *
   * 使用场景:
   *   - 用户注册后发送欢迎邮件
     *   - 密码重置时发送验证链接
   *   - 系统通知推送
   *
   * 示例:
   * ```typescript
   * const job = await taskScheduler.addEmailJob({
   *   to: 'user@example.com',
   *   subject: '重置密码',
   *   template: 'reset-password',
   *   data: { resetUrl: 'https://example.com/reset/xxx' },
   * });
   * console.log(job.id);  // 任务 ID
   * ```
   */
  async addEmailJob(
    data: EmailJobData,
    options?: Partial<{ priority: number; delay: number }>
  ): Promise<Job<EmailJobData>> {
    this.logger.log(`添加邮件任务 -> 收件人: ${data.to}, 模板: ${data.template}`);

    const job = await this.emailQueue.add('send-email', data, {
      // 合并默认选项和自定义选项
      ...options,
    });

    this.logger.debug(`邮件任务已入队 [ID: ${job.id}]`);
    return job;
  }

  /**
   * 添加报表生成任务
   *
   * @param data - 报表任务数据（格式、参数、用户 ID）
   * @param options - 可选的作业选项
   * @returns 创建的 Job 对象
   *
   * 注意事项:
   *   - 大文件生成可能耗时较长（建议设置合理的超时时间）
   *   - 高并发时可能需要限制同时生成的报表数量
   *   - 建议实现进度回调机制
   *
   * 示例:
   * ```typescript
   * const job = await taskScheduler.addReportJob({
   *   type: 'excel',
   *   params: { startDate: '2024-01-01', endDate: '2024-12-31' },
   *   userId: 'user-123',
   * });
   * ```
   */
  async addReportJob(
    data: ReportJobData,
    options?: Partial<{ priority: number; delay: number }>
  ): Promise<Job<ReportJobData>> {
    this.logger.log(`添加报表任务 -> 类型: ${data.type}, 用户: ${data.userId}`);

    const job = await this.reportQueue.add('generate-report', data, {
      timeout: 300000,  // 报表任务默认 5 分钟超时
      ...options,
    });

    this.logger.debug(`报表任务已入队 [ID: ${job.id}]`);
    return job;
  }

  /**
   * 添加清理维护任务
   *
   * @param data - 清理任务数据（类型、选项）
   * @param delayMs - 延迟执行时间（毫秒），默认立即执行
   * @returns 创建的 Job 对象
   *
   * 特点:
   *   - 支持延迟执行（适合定时维护场景）
   *   - 通常由 Cron Job 触发
   *   - 建议在业务低峰期执行
   *
   * 使用场景:
   *   - 定时清理过期 Token（每小时）
   *   - 凌晨清理临时文件（每日）
   *   - 每周归档旧日志
   *
   * 示例:
   * ```typescript
   * // 立即执行
   * const job1 = await taskScheduler.addCleanupJob({ type: 'expired-tokens' });
   *
   * // 1 小时后执行（避开高峰期）
   * const job2 = await taskScheduler.addCleanupJob(
   *   { type: 'temp-files', options: { olderThanDays: 7 } },
   *   3600000  // 延迟 1 小时
   * );
   * ```
   */
  async addCleanupJob(
    data: CleanupJobData,
    delayMs?: number
  ): Promise<Job<CleanupJobData>> {
    this.logger.log(
      `添加清理任务 -> 类型: ${data.type}${delayMs ? `, 延迟: ${delayMs}ms` : ''}`
    );

    const job = await this.cleanupQueue.add('cleanup', data, {
      // 如果指定了延迟时间，则设置延迟执行
      ...(delayMs && { delay: delayMs }),
    });

    this.logger.debug(`清理任务已入队 [ID: ${job.id}]`);
    return job;
  }

  /**
   * 查询指定任务的执行状态
   *
   * @param queueName - 队列名称 (email-queue | report-queue | cleanup-queue)
   * @param jobId - 任务 ID
   * @returns 任务对象（包含状态、进度、结果等），不存在则返回 null
   *
   * 返回的 Job 对象常用属性:
   *   - id: 任务 ID
   *   - state: 任务状态 ('waiting' | 'active' | 'completed' | 'failed' | 'delayed')
   *   - progress: 进度百分比 (0-100)
   *   - returnValue: 任务返回值（仅 completed 状态）
   *   - failedReason: 失败原因（仅 failed 状态）
   *   - processedOn: 开始处理时间
   *   - finishedOn: 完成时间
   *
   * 示例:
   * ```typescript
   * const job = await taskScheduler.getJobStatus('report-queue', '123');
   * if (job) {
   *   console.log('状态:', job.state);
   *   console.log('结果:', job.returnValue);
   * }
   * ```
   */
  async getJobStatus(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      this.logger.error(`查询任务失败 -> 未知的队列: ${queueName}`);
      return null;
    }

    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        this.logger.warn(`任务不存在 -> 队列: ${queueName}, ID: ${jobId}`);
        return null;
      }

      this.logger.debug(`查询任务状态 -> 队列: ${queueName}, ID: ${jobId}, 状态: ${await job.getState()}`);
      return job;
    } catch (error) {
      this.logger.error(`查询任务异常 -> 队列: ${queueName}, ID: ${jobId}, 错误: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * 获取指定队列的统计信息
   *
   * @param queueName - 队列名称 (email-queue | report-queue | cleanup-queue)
   * @returns 队列统计信息（各状态任务数量）
   *
   * 统计指标说明:
   *   - waiting: 排队等待中的任务数（尚未开始处理）
   *   - active: 正在处理中的任务数（当前正在执行的 Worker 数量）
   *   - completed: 已成功完成任务的总数
   *   - failed: 已失败任务的总数
   *   - delayed: 延迟等待执行的任务数（设置了 delay 的任务）
   *
   * 使用场景:
   *   - 监控面板展示队列健康状态
   *   - 告警规则配置（如 waiting > 1000 时告警）
   *   - 性能调优参考
   *
   * 示例:
   * ```typescript
   * const stats = await taskScheduler.getQueueStats('email-queue');
   * console.log(`
   *   等待中: ${stats.waiting}
   *   执行中: ${stats.active}
   *   已完成: ${stats.completed}
   *   已失败: ${stats.failed}
   * `);
   * ```
   */
  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`未知的队列名称: ${queueName}`);
    }

    // 并行获取各状态的计数，提高性能
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    const stats: QueueStats = {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };

    this.logger.debug(`队列统计 -> ${queueName}: ${JSON.stringify(stats)}`);
    return stats;
  }

  /**
   * 根据队列名称获取对应的 Queue 实例
   *
   * 这是一个内部辅助方法，用于统一管理队列实例的获取逻辑。
   * 通过字符串映射到具体的 Queue 对象，避免外部直接访问私有属性。
   *
   * @param name - 队列名称
   * @returns 对应的 Queue 实例，不匹配则返回 undefined
   */
  private getQueueByName(name: string): Queue<any> | undefined {
    const queueMap: Record<string, Queue<any>> = {
      [EMAIL_QUEUE_NAME]: this.emailQueue,
      [REPORT_QUEUE_NAME]: this.reportQueue,
      [CLEANUP_QUEUE_NAME]: this.cleanupQueue,
    };

    return queueMap[name];
  }
}
