/**
 * Bull (Redis-based Queue) 配置模块
 * Bull 是基于 Redis 的高性能任务队列系统
 * 适用于异步任务处理、邮件发送、数据导入等场景
 *
 * 使用方式:
 *   import { bullConfig } from './config/bull.config';
 *   const queue = new Queue('queue-name', bullConfig);
 */

import { redisConfig } from './redis.config';

/** Bull Dashboard 配置接口 */
export interface BullDashboardConfig {
  /** 是否启用管理面板 */
  enabled: boolean;
  /** 管理面板访问路径 */
  path: string;
}

/** Bull 默认作业选项接口 */
export interface BullJobOptions {
  /** 成功完成的作业保留数量 */
  removeOnComplete: { count: number };
  /** 失败的作业保留数量 */
  removeOnFail: { count: number };
  /** 最大重试次数 */
  attempts: number;
  /** 退避策略配置 */
  backoff: { type: 'exponential'; delay: number };
}

/** Bull 完整配置接口 */
export interface BullConfig {
  /** Redis 连接配置（复用 redis.config.ts） */
  redis: typeof redisConfig;
  /** 默认作业行为选项 */
  defaultJobOptions: BullJobOptions;
  /** 管理面板配置 */
  dashboard: BullDashboardConfig;
}

/**
 * Bull 任务队列配置
 * 内置指数退避重试机制，避免瞬时故障导致任务堆积
 *
 * 退避策略说明:
 *   - 第1次重试: 1s 后
 *   - 第2次重试: 2s 后
 *   - 第3次重试: 4s 后
 */
export const bullConfig: BullConfig = {
  // 复用 Redis 配置，确保连接参数一致
  redis: redisConfig,

  // 默认作业选项 - 平衡可靠性与存储开销
  defaultJobOptions: {
    // 成功作业保留最近 1000 条用于审计
    removeOnComplete: { count: 1000 },
    // 失败作业保留 5000 条便于排查问题
    removeOnFail: { count: 5000 },
    // 最多重试 3 次
    attempts: 3,
    // 指数退避: delay * 2^(attempt-1)
    backoff: { type: 'exponential', delay: 1000 },
  },

  // Bull Board 管理面板（需单独安装 @bull-board/adapter-bull）
  //
  // ⚠️ 当前状态: 未启用（默认关闭）
  // 📦 如需启用，请执行以下步骤：
  //    1. 安装依赖: pnpm add @bull-board/adapter-bull @bull-board/api @bull-board/nestjs
  //    2. 设置环境变量: ENABLE_BULL_DASHBOARD=true
  //    3. 在 app.module.ts 或 main.ts 中注册 BullBoardModule
  //
  // 🔗 参考文档: https://github.com/felixmosh/bull-board
  // 💡 替代方案: 使用 Redis CLI 或 RedisInsight 查看 Queue 状态
  //    命令: redis-cli > QUEUE:email-queue > LEN (查看待处理任务数)
  //
  dashboard: {
    // 默认关闭，通过环境变量显式开启
    enabled: process.env.ENABLE_BULL_DASHBOARD === 'true',
    path: '/admin/queues',
  },
} as const;
