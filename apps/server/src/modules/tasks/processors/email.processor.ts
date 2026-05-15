import { Processor, Process, OnQueueActive, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import type { Job } from 'bull';  // 使用 import type，因为 Job 用于装饰器签名中的类型
import { Logger } from '@nestjs/common';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue.js';  // 值导入（用于 @Processor 装饰器）
import type { EmailJobData } from '../queues/email.queue.js';  // 类型导入

/**
 * 邮件发送任务处理器
 *
 * 功能说明:
 *   处理 email-queue 队列中的邮件发送任务
 *   支持多种邮件模板（欢迎、密码重置、系统通知）
 *
 * 重试机制:
 *   Bull 自动重试配置（在队列选项中设置）:
 *   - 最大重试次数: 3 次
 *   - 退避策略: 指数退避（2s → 4s → 8s）
 *   - 适用场景: 网络抖动、邮件服务暂时不可用
 *
 * 错误处理:
 *   - 连接超时: 自动重试
 *   - 格式错误: 不重试（需修复数据后重新提交）
 *   - 频率限制: 延迟后自动重试
 *
 * 扩展建议:
 *   - 接入真实邮件服务（SendGrid、阿里云邮件、SMTP）
 *   - 添加邮件模板引擎（Handlebars、EJS）
 *   - 实现邮件发送速率限制
 *   - 添加邮件打开/点击追踪
 */
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor {
  /** 日志实例 */
  private readonly logger = new Logger(EmailProcessor.name);

  /**
   * 任务开始执行时的回调
   * 用于记录任务启动信息和性能监控
   */
  @OnQueueActive()
  onActive(job: Job<EmailJobData>) {
    this.logger.log(
      `开始处理邮件任务 [${job.id}] -> 收件人: ${job.data.to}, 模板: ${job.data.template}`
    );
  }

  /**
   * 任务完成时的回调
   * 记录成功信息，可用于审计和监控
   */
  @OnQueueCompleted()
  onCompleted(job: Job<EmailJobData>, result: any) {
    this.logger.log(
      `邮件任务完成 [${job.id}] -> 收件人: ${job.data.to}, 耗时: ${job.finishedOn! - job.processedOn!}ms`
    );
  }

  /**
   * 任务失败时的回调
   * 记录错误详情，支持告警通知
   */
  @OnQueueFailed()
  onFailed(job: Job<EmailJobData> | undefined, error: Error) {
    const jobId = job?.id ?? 'unknown';
    this.logger.error(
      `邮件任务失败 [${jobId}] -> 错误: ${error.message}`,
      error.stack
    );

    // TODO: 可在此处添加告警通知（如钉钉、企业微信、Slack）
    // await this.alertService.sendErrorAlert(error, job);
  }

  /**
   * 处理邮件发送任务
   *
   * 处理流程:
   *   1. 校验必填字段（to、subject、template）
   *   2. 根据模板类型选择渲染逻辑
   *   3. 调用邮件服务发送（当前为模拟实现）
   *   4. 返回发送结果
   *
   * @param job - Bull 任务对象，包含 EmailJobData 数据
   * @returns 发送结果（消息 ID 或状态）
   * @throws 参数校验失败或邮件服务异常时抛出错误
   */
  @Process()
  async handleEmailJob(job: Job<EmailJobData>): Promise<{ success: boolean; messageId?: string }> {
    const { to, subject, template, data } = job.data;
    const startTime = Date.now();

    try {
      // ====== 1. 数据校验 ======
      this.validateEmailJob(to, subject, template);

      // ====== 2. 渲染邮件内容 ======
      const emailContent = this.renderTemplate(template, data);
      this.logger.debug(`邮件内容渲染完成 [模板: ${template}]`);

      // ====== 3. 发送邮件（模拟实现）=====
      // TODO: 替换为真实的邮件服务调用
      // 示例: await this.emailService.send({ to, subject, html: emailContent });
      const result = this.simulateEmailSend(to, subject, emailContent);

      const duration = Date.now() - startTime;
      this.logger.log(`邮件发送成功 -> 收件人: ${to}, 耗时: ${duration}ms`);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`邮件发送失败 -> 收件人: ${to}, 耗时: ${duration}ms, 错误: ${(error as Error).message}`);

      // 根据错误类型决定是否可重试
      if (this.isRetryableError(error)) {
        throw error;  // 抛出错误触发 Bull 自动重试
      }

      // 不可重试的错误直接返回失败结果，避免无效重试
      return {
        success: false,
      };
    }
  }

  /**
   * 校验邮件任务数据的完整性
   * 提前返回，避免无效数据进入处理流程
   */
  private validateEmailJob(to: string, subject: string, template: string): void {
    if (!to || !this.isValidEmail(to)) {
      throw new Error(`无效的收件人邮箱地址: ${to}`);
    }
    if (!subject || subject.trim().length === 0) {
      throw new Error('邮件主题不能为空');
    }
    if (!['welcome', 'reset-password', 'notification'].includes(template)) {
      throw new Error(`不支持的邮件模板: ${template}`);
    }
  }

  /**
   * 根据模板类型渲染邮件内容
   * 当前为简化实现，生产环境应使用模板引擎
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    switch (template) {
      case 'welcome':
        return `欢迎加入！亲爱的 ${data.username ?? '用户'}，感谢您的注册。`;

      case 'reset-password':
        return `密码重置链接：${data.resetUrl ?? '#'}，链接有效期为 1 小时。`;

      case 'notification':
        return `系统通知：${data.message ?? '您有新的系统消息'}`;

      default:
        throw new Error(`未实现的邮件模板: ${template}`);
    }
  }

  /**
   * 模拟邮件发送（开发环境使用）
   * 生产环境应替换为真实邮件服务调用
   */
  private simulateEmailSend(to: string, subject: string, content: string): { messageId: string } {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`
╔════════════════════════════════════════╗
║         📧 模拟邮件发送                  ║
╠════════════════════════════════════════╣
║ 收件人: ${to.padEnd(30)}║
║ 主题:   ${subject.padEnd(30)}║
║ 内容:   ${content.slice(0, 40).padEnd(30)}║
║ 消息ID: ${messageId.padEnd(30)}║
╚════════════════════════════════════════╝
    `);

    return { messageId };
  }

  /**
   * 判断错误是否可重试
   * 网络类错误应重试，参数类错误不应重试
   */
  private isRetryableError(error: unknown): boolean {
    const message = (error as Error).message.toLowerCase();
    // 可重试的错误特征：网络超时、连接失败、频率限制等
    const retryablePatterns = [
      'timeout', 'network', 'connection', 'econnrefused',
      'rate limit', '429', '503', '502',
    ];
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * 简单的邮箱格式校验
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
