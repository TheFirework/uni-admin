/**
 * Redis 配置模块
 * 统一管理 Redis 连接参数，供 Bull、缓存、Session 等模块复用
 *
 * 使用方式:
 *   import { redisConfig } from './config/redis.config';
 *   const client = createClient(redisConfig);
 */

import { getEnv } from './env.config';

/** Redis 完整配置接口 */
export interface RedisConfig {
  /** Redis 服务主机地址 */
  host: string;
  /** Redis 服务端口 */
  port: number;
  /** Redis 认证密码（可选） */
  password?: string;
  /** 数据库索引编号 (0-15) */
  db: number;
  /** 命令执行失败时的最大重试次数 */
  maxRetriesPerRequest: number;
  /** 主从切换故障转移重试延迟（毫秒） */
  retryDelayOnFailover: number;
  /** 连接时是否发送 PING 命令确认就绪状态 */
  enableReadyCheck: boolean;
  /** 连接池最大客户端数 */
  maxClientsPerPool: number;
  /** 连接池最小空闲客户端数 */
  minIdleClientsPerPool: number;
  /** 空闲连接超时时间（毫秒），超后释放 */
  idleTimeoutMillis: number;
  /** 是否延迟连接（首次使用时才建立连接） */
  lazyConnect: boolean;
}

/**
 * Redis 配置常量
 * 优先从环境变量读取，提供安全的默认值
 *
 * 注意: lazyConnect=true 可以避免应用启动时 Redis 不可用导致的崩溃
 */
export const redisConfig: RedisConfig = {
  // 基础连接参数
  host: getEnv().redisHost,
  port: getEnv().redisPort,
  password: getEnv().redisPassword || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // 重试策略 - 保证服务可用性
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,

  // 就绪检查 - 确保连接可用后才返回
  enableReadyCheck: true,

  // 连接池优化 - 减少频繁创建/销毁的开销
  maxClientsPerPool: 10,
  minIdleClientsPerPool: 2,

  // 空闲连接管理 - 及时释放无用资源
  idleTimeoutMillis: 10000,

  // 延迟连接 - 支持 Redis 后启动的场景
  lazyConnect: true,
} as const;
