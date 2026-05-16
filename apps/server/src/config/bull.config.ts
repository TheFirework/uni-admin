/**
 * Bull (Redis-based Queue) 配置工厂
 * Bull 是基于 Redis 的高性能任务队列系统
 *
 * 使用方式:
 *   import { createBullConfig } from './config/bull.config';
 *   const bullCfg = createBullConfig(createRedisConfig(getConfig()));
 */

import type { RedisConfig } from './redis.config.js';
import { getConfig } from './env.config.js';

export interface BullDashboardConfig {
  enabled: boolean;
  path: string;
}

export interface BullJobOptions {
  removeOnComplete: { count: number };
  removeOnFail: { count: number };
  attempts: number;
  backoff: { type: 'exponential'; delay: number };
}

export interface BullConfig {
  redis: RedisConfig;
  defaultJobOptions: BullJobOptions;
  dashboard: BullDashboardConfig;
}

export function createBullConfig(redisConfig: RedisConfig): BullConfig {
  const config = getConfig();

  return {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
    dashboard: {
      enabled: config.enableBullDashboard,
      path: '/admin/queues',
    },
  };
}
