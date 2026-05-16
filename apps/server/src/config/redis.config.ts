/**
 * Redis 配置工厂
 * 从统一配置构建 Redis 连接参数，供 Bull、缓存、Session 等模块复用
 *
 * 使用方式:
 *   import { createRedisConfig } from './config/redis.config';
 *   const redisCfg = createRedisConfig(getConfig());
 */

import type { ValidatedConfig } from './env.validation.js';

/** Redis 完整配置接口 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxClientsPerPool: number;
  minIdleClientsPerPool: number;
  idleTimeoutMillis: number;
  lazyConnect: boolean;
}

export function createRedisConfig(config: ValidatedConfig): RedisConfig {
  return {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword || undefined,
    db: config.redisDb,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxClientsPerPool: 10,
    minIdleClientsPerPool: 2,
    idleTimeoutMillis: 10000,
    lazyConnect: true,
  };
}
