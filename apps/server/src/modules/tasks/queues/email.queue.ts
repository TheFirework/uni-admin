/**
 * 邮件任务队列定义
 *
 * 功能说明:
 *   定义邮件发送任务的队列名称和数据类型接口
 *   用于异步处理用户注册、密码重置、系统通知等邮件发送场景
 *
 * 使用场景:
 *   - 用户注册成功后发送欢迎邮件
 *   - 用户请求重置密码时发送重置链接
 *   - 系统重要操作通知（如登录异常、权限变更）
 *   - 定期报告邮件推送
 *
 * 数据流:
 *   Controller → TaskSchedulerService.addEmailJob() → Bull Queue → EmailProcessor
 */

/** 邮件模板类型枚举 */
export type EmailTemplate = 'welcome' | 'reset-password' | 'notification';

/**
 * 邮件任务数据接口
 *
 * @property to - 收件人邮箱地址
 * @property subject - 邮件主题
 * @property template - 模板名称，用于选择渲染逻辑
 * @property data - 模板变量，用于填充模板中的占位符
 *
 * 示例:
 * ```typescript
 * const emailJob: EmailJobData = {
 *   to: 'user@example.com',
 *   subject: '欢迎使用我们的平台',
 *   template: 'welcome',
 *   data: { username: '张三', verifyUrl: 'https://example.com/verify/xxx' },
 * };
 * ```
 */
export interface EmailJobData {
  /** 收件人邮箱地址 */
  to: string;
  /** 邮件主题 */
  subject: string;
  /** 模板名称 (welcome, reset-password, notification) */
  template: EmailTemplate;
  /** 模板变量 */
  data: Record<string, any>;
}

/** 邮件队列常量 - 统一管理队列名称，避免硬编码 */
export const EMAIL_QUEUE_NAME = 'email-queue' as const;

/** 邮件队列配置选项 */
export const EMAIL_QUEUE_OPTIONS = {
  name: EMAIL_QUEUE_NAME,
  // 邮件任务特殊配置：优先级较高，失败重试间隔较短
  defaultJobOptions: {
    priority: 1,                    // 高优先级（数字越小优先级越高）
    attempts: 3,                    // 最多重试 3 次
    backoff: {
      type: 'exponential',          // 指数退避策略
      delay: 2000,                  // 初始延迟 2 秒
    },
    removeOnComplete: { count: 500 },  // 成功作业保留 500 条
    removeOnFail: { count: 1000 },     // 失败作业保留 1000 条便于排查
  },
} as const;
