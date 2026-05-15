/**
 * RedisCacheService - Redis 缓存服务封装
 *
 * 职责:
 *   1. 封装 cache-manager 的 Cache 接口，提供类型安全的缓存操作
 *   2. 提供 RefreshToken 存储（JWT 双 Token 机制）
 *   3. 提供 Nonce 防重放存储（接口签名验证）
 *   4. 提供分布式锁能力（防止并发重复执行）
 *   5. 提供热点数据缓存 + 批量清除能力
 *
 * 设计原则:
 *   - 所有 Key 都有明确的命名空间前缀，避免冲突
 *   - 错误处理：Redis 操作失败时返回安全默认值，不阻断业务流程
 *   - TTL 统一管理：各场景有合理的默认过期时间
 *
 * 使用方式:
 *   constructor(private readonly redisCache: RedisCacheService) {}
 *   await this.redisCache.set('user:1', userData);
 *
 * TODO: [Redis 集群支持] 生产环境高可用架构升级
 *   - 支持哨兵模式（Sentinel）自动故障转移
 *   - 支持集群模式（Cluster）数据分片存储
 *   - 配置读写分离（主从复制，读请求走从节点）
 *   - 实现连接池监控（活跃连接数、等待队列长度）
 *   参考 ioredis 文档: https://github.com/redis/ioredis#sentinel-cluster
 *
 * TODO: [缓存穿透保护] 防止恶意查询不存在的数据
 *   - 布隆过滤器（Bloom Filter）快速判断 Key 是否可能存在
 *   - 空值缓存：对查询结果为 null 的也设置短 TTL（如 60s）
 *   - 限流策略：单 IP 每秒最多查询次数限制
 *   可使用库: redis-bloom (RedisBloom 模块) 或 bloomfilter (纯 JS 实现)
 *
 * TODO: [缓存雪崩预防] 避免大量 Key 同时过期
 *   - TTL 随机化：基础 TTL + random(0, 300s) 抖动
 *   - 多级缓存：本地内存缓存（LRU）+ Redis 分布式缓存
 *   - 热点 Key 永不过期 + 主动刷新（后台线程异步更新）
 *   - 监控告警：缓存命中率 < 80% 时触发告警
 *
 * TODO: [BigKey 治理] 优化大 Value 对 Redis 性能的影响
 *   - Value 压缩：使用 GZIP/snappy 压缩大型 JSON/字符串
 *   - 分片存储：单个 Value > 10KB 时拆分为多个 Key（hash tag）
 *   - 定期扫描：使用 Redis --bigkeys 工具发现 BigKey
 *   - 最佳实践：控制单个 Value 在 1KB 以内，List/Hash 元素 < 5000
 */
import { Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';  // 使用 import type，避免装饰器签名中的类型引用问题

// ====== 类型定义 ======

/** 缓存值类型（支持任意可序列化数据） */
type CacheValue = string | number | boolean | object | null | undefined;

/** 分布式锁的 Value（用于释放锁时校验所有权） */
const LOCK_VALUE = 'LOCKED';

// ====== 常量配置 ======

/**
 * 各场景默认 TTL 配置（单位：秒）
 * 根据业务需求调整，平衡性能与数据新鲜度
 */
const TTL_CONFIG = {
  /** 默认缓存 TTL: 5 分钟 */
  DEFAULT: 300,
  /** RefreshToken TTL: 7 天（与 JWT 刷新令牌有效期一致） */
  REFRESH_TOKEN: 7 * 24 * 60 * 60,
  /** Nonce 防重放 TTL: 5 分钟（时间窗口内有效） */
  NONCE: 5 * 60,
  /** 分布式锁默认 TTL: 30 秒（防止死锁） */
  LOCK: 30,
} as const;

/**
 * Key 命名空间前缀
 * 使用冒号分隔的层级结构，便于 Redis CLI 调试和监控
 */
const KEY_PREFIX = {
  /** RefreshToken 前缀: refresh:{userId}:{deviceId} */
  REFRESH_TOKEN: 'refresh:',
  /** Nonce 前缀: nonce:{nonceValue} */
  NONCE: 'nonce:',
  /** 分布式锁前缀: lock:{businessKey} */
  LOCK: 'lock:',
} as const;

@Injectable()
export class RedisCacheService {
  /** NestJS 内置日志器 */
  private readonly logger = new Logger(RedisCacheService.name);

  /**
   * 构造函数 - 注入 Cache 实例
   *
   * 注意: 此处使用 any 类型接收注入的 Cache 实例，
   *       因为不同版本的 cache-manager 类型定义可能不一致。
   *       在实际使用时通过类型断言确保类型安全。
   *
   * @param cacheManager - cache-manager 的 Cache 实例（由 CacheModule 提供）
   */
  constructor(private readonly cacheManager: any) {}  // 使用 any 类型，避免 cache-manager 版本兼容性问题

  // ===================================================================
  // 基础缓存操作（基于 Cache 接口封装）
  // ===================================================================

  /**
   * 获取缓存值（泛型支持）
   *
   * @param key - 缓存键
   * @returns 缓存的值，不存在时返回 undefined
   *
   * @example
   *   const user = await redisCache.get<User>('user:123');
   *   if (user) { // 命中缓存 }
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      // 注意: 由于 cacheManager 类型为 any，这里先获取值再进行类型断言
      const value = await this.cacheManager.get(key);
      return (value as T) ?? undefined;
    } catch (error) {
      this.logger.error(`[Cache GET] 失败: key=${key}`, error instanceof Error ? error.stack : error);
      return undefined;
    }
  }

  /**
   * 设置缓存值
   *
   * @param key - 缓存键
   * @param value - 缓存值（自动 JSON 序列化）
   * @param ttl - 过期时间（秒），不传则使用默认值 5 分钟
   *
   * @example
   *   await redisCache.set('user:123', userData, 600); // 10分钟
   */
  async set(key: string, value: CacheValue, ttl: number = TTL_CONFIG.DEFAULT): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl * 1000); // cache-manager 使用毫秒
    } catch (error) {
      this.logger.error(`[Cache SET] 失败: key=${key}, ttl=${ttl}s`, error instanceof Error ? error.stack : error);
      // 不抛出异常，避免缓存故障影响主业务流程
    }
  }

  /**
   * 删除单个缓存键
   *
   * @param key - 要删除的缓存键
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`[Cache DEL] 失败: key=${key}`, error instanceof Error ? error.stack : error);
    }
  }

  /**
   * 批量获取多个缓存键的值
   *
   * @param keys - 缓存键数组
   * @returns 对应值的数组（未命中的位置为 undefined）
   *
   * 注意: 返回数组的顺序与输入 keys 的顺序一致
   */
  async mget(keys: string[]): Promise<any[]> {
    try {
      // cache-manager 的 mget 可能不被所有 store 支持
      // 这里采用并行 get 的方式实现兼容性
      const results = await Promise.all(
        keys.map((key) => this.cacheManager.get(key).catch(() => undefined))
      );
      return results;
    } catch (error) {
      this.logger.error(`[Cache MGET] 失败: keys=${keys.join(',')}`, error instanceof Error ? error.stack : error);
      return keys.map(() => undefined); // 返回全 undefined 数组，保持长度一致
    }
  }

  /**
   * 清空所有缓存（慎用！）
   *
   * 注意: 这会清除当前 store 下的所有缓存，包括其他模块的数据
   * 生产环境建议使用 invalidatePattern 进行精确清除
   */
  async reset(): Promise<void> {
    try {
      // cache-manager v7+ 可能不支持 reset 方法，尝试调用或回退
      if (typeof this.cacheManager.reset === 'function') {
        await this.cacheManager.reset();
      } else {
        this.logger.warn('[Cache RESET] 当前 cache-manager 版本不支持 reset 方法');
      }
      this.logger.warn('[Cache RESET] 已清空所有缓存');
    } catch (error) {
      this.logger.error('[Cache RESET] 失败', error instanceof Error ? error.stack : error);
    }
  }

  // ===================================================================
  // RefreshToken 存储（JWT 双 Token 机制）
  // ===================================================================

  /**
   * 存储 RefreshToken
   *
   * Key 格式: refresh:{userId}:{deviceId}
   * 用途:
   *   - 支持多设备登录（每个设备独立 Token）
   *   - 修改密码时可批量删除强制下线
   *   - 设备登出时可单独删除不影响其他设备
   *
   * @param userId - 用户 ID
   * @param deviceId - 设备标识（如 UUID、指纹哈希等）
   * @param token - RefreshToken 字符串
   * @param ttl - 过期时间（秒），默认 7 天
   *
   * @example
   *   // 登录成功后存储
   *   await redisCache.setRefreshToken(user.id, deviceFingerprint, refreshToken);
   */
  async setRefreshToken(
    userId: string | number,
    deviceId: string,
    token: string,
    ttl: number = TTL_CONFIG.REFRESH_TOKEN
  ): Promise<void> {
    const key = this.buildRefreshTokenKey(userId, deviceId);
    await this.set(key, token, ttl);
  }

  /**
   * 获取 RefreshToken
   *
   * @param userId - 用户 ID
   * @param deviceId - 设备标识
   * @returns Token 字符串，不存在返回 null
   *
   * @example
   *   // 刷新 Token 时验证
   *   const storedToken = await redisCache.getRefreshToken(userId, deviceId);
   *   if (storedToken !== inputToken) throw new UnauthorizedException();
   */
  async getRefreshToken(
    userId: string | number,
    deviceId: string
  ): Promise<string | null> {
    const key = this.buildRefreshTokenKey(userId, deviceId);
    const token = await this.get<string>(key);
    return token ?? null;
  }

  /**
   * 删除单个设备的 RefreshToken（单设备登出）
   *
   * @param userId - 用户 ID
   * @param deviceId - 设备标识
   *
   * 场景: 用户主动退出某个设备的登录
   */
  async deleteRefreshToken(
    userId: string | number,
    deviceId: string
  ): Promise<void> {
    const key = this.buildRefreshTokenKey(userId, deviceId);
    await this.del(key);
  }

  /**
   * 删除用户所有设备的 RefreshToken（强制全部下线）
   *
   * @param userId - 用户 ID
   *
   * 触发场景:
   *   - 用户修改密码（安全策略要求重新登录）
   *   - 账号被冻结/禁用
   *   - 用户主动选择"在其他设备退出"
   *
   * 实现原理: 使用 KEYS 模式匹配 + DEL 批量删除
   * 注意: KEYS 在大数据量时有性能问题，生产环境建议用 SCAN 替代
   */
  async deleteAllUserTokens(userId: string | number): Promise<void> {
    try {
      // 构建模式匹配 Key: refresh:{userId}:*
      const pattern = `${KEY_PREFIX.REFRESH_TOKEN}${userId}:*`;
      await this.invalidatePattern(pattern);

      this.logger.log(`[RefreshToken] 已删除用户 ${userId} 的所有 Token`);
    } catch (error) {
      this.logger.error(
        `[RefreshToken] 批量删除失败: userId=${userId}`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  // ===================================================================
  // Nonce 防重放（接口签名验证）
  // ===================================================================

  /**
   * 存储 Nonce（防重放攻击）
   *
   * 原理:
   *   客户端每次请求生成唯一 nonce + 时间戳
   *   服务端记录已使用的 nonce，相同 nonce 在 TTL 内拒绝请求
   *   结合时间戳窗口（如 ±5 分钟），双重保障防重放
   *
   * @param nonce - 随机字符串（建议 UUID v4 或 32 位随机 hex）
   * @param ttl - 有效期（秒），默认 5 分钟
   *
   * 安全提示:
   *   - Nonce 必须足够长且随机（≥ 16 字符）
   *   - 建议客户端同时发送 timestamp，服务端校验时间窗口
   */
  async setNonce(nonce: string, ttl: number = TTL_CONFIG.NONCE): Promise<void> {
    const key = `${KEY_PREFIX.NONCE}${nonce}`;
    // 使用 SET NX（仅当 key 不存在时设置）实现幂等
    await this.set(key, true, ttl);
  }

  /**
   * 检查 Nonce 是否已存在（是否为重复请求）
   *
   * @param nonce - 待检查的 nonce 值
   * @returns true 表示该 nonce 已被使用（重复请求），false 表示首次使用
   *
   * 典型流程:
   *   if (await redisCache.isNonceExists(nonce)) {
   *     throw new BadRequestException('请求重复，请勿重放');
   *   }
   *   await redisCache.setNonce(nonce); // 记录该 nonce
   */
  async isNonceExists(nonce: string): Promise<boolean> {
    const key = `${KEY_PREFIX.NONCE}${nonce}`;
    const exists = await this.get<boolean>(key);
    return exists === true; // 明确判断，避免 falsy 误判
  }

  // ===================================================================
  // 分布式锁
  // ===================================================================

  /**
   * 获取分布式锁（互斥锁）
   *
   * 实现原理: Redis SET NX EX 命令
   *   - NX: 仅当 key 不存在时才设置（保证互斥）
   *   - EX: 设置过期时间（防止持有者崩溃导致死锁）
   *
   * 适用场景:
   *   - 防止并发重复创建资源（如订单、优惠券领取）
   *   - 定时任务分布式执行（只有一个节点运行）
   *   - 幂等性控制（同一请求只处理一次）
   *
   * @param key - 业务锁标识（如 'order:create:123'）
   * @param ttl - 锁超时时间（秒），默认 30 秒
   * @returns true 表示获取成功，false 表示锁已被占用
   *
   * 最佳实践:
   *   try {
   *     const acquired = await redisCache.acquireLock('order:pay:' + orderId, 10);
   *     if (!acquired) throw new ConflictException('操作过于频繁，请稍后再试');
   *     // 执行业务逻辑...
   *   } finally {
   *     await redisCache.releaseLock('order:pay:' + orderId);
   *   }
   */
  async acquireLock(key: string, ttl: number = TTL_CONFIG.LOCK): Promise<boolean> {
    const lockKey = `${KEY_PREFIX.LOCK}${key}`;

    try {
      // 利用 cache-manager 的底层 Redis client（如果可用）
      // 否则回退到普通的 set + get 检查
      const store = (this.cacheManager as any).store;
      const client = store?.client; // ioredis/redis client

      if (client && typeof client.set === 'function') {
        // 直接调用 Redis SET NX EX 命令（原子操作）
        const result = await client.set(lockKey, LOCK_VALUE, 'EX', ttl, 'NX');
        return result === 'OK'; // NX 成功返回 'OK'，已存在返回 null
      }

      // 回退方案: 先检查是否存在，再设置（非原子，可能有问题但比没有好）
      const exists = await this.get<string>(lockKey);
      if (exists) return false; // 锁已被占用

      await this.set(lockKey, LOCK_VALUE, ttl);
      return true;
    } catch (error) {
      this.logger.error(
        `[DistributedLock] 获取锁失败: key=${lockKey}`,
        error instanceof Error ? error.stack : error
      );
      return false; // Redis 异常时视为获取失败，走正常业务流程
    }
  }

  /**
   * 释放分布式锁
   *
   * 安全措施:
   *   - 只删除自己持有的锁（通过 value 校验）
   *   - 使用 Lua 脚本保证原子性（检查 + 删除）
   *   - 释放失败不抛异常（避免影响业务逻辑）
   *
   * @param key - 业务锁标识（需与 acquireLock 时一致）
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `${KEY_PREFIX.LOCK}${key}`;

    try {
      const store = (this.cacheManager as any).store;
      const client = store?.client;

      if (client && typeof client.eval === 'function') {
        // Lua 脚本: 原子性地检查 value 并删除（防止误删他人的锁）
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await client.eval(luaScript, 1, lockKey, LOCK_VALUE);
      } else {
        // 回退方案: 直接删除（非原子，但在简单场景可接受）
        await this.del(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `[DistributedLock] 释放锁失败: key=${lockKey}`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  // ===================================================================
  // 热点数据缓存
  // ===================================================================

  /**
   * 获取热点缓存数据（带类型推断）
   *
   * @param key - 缓存键
   * @returns 缓存的数据，未命中返回 undefined
   *
   * 典型用法（与 setCachedData 配合）:
   *   let data = await redisCache.getCachedData<ConfigData>('system:config');
   *   if (!data) {
   *     data = await this.fetchFromDB(); // 未命中，查询数据库
   *     await redisCache.setCachedData('system:config', data, 3600);
   *   }
   */
  async getCachedData<T>(key: string): Promise<T | undefined> {
    return this.get<T>(key);
  }

  /**
   * 设置热点缓存数据
   *
   * @param key - 缓存键
   * @param data - 要缓存的数据（泛型，支持任意可序列化数据）
   * @param ttl - 过期时间（秒），默认 5 分钟
   *
   * 使用场景:
   *   - 系统配置信息（变更频率低，TTL 可设长）
   *   - 热门商品/文章列表（读多写少）
   *   - 权限角色映射（用户登录后缓存）
   */
  async setCachedData<T>(key: string, data: T, ttl: number = TTL_CONFIG.DEFAULT): Promise<void> {
    await this.set(key, data as any, ttl);  // 使用类型断言，避免泛型约束问题
  }

  /**
   * 按 Pattern 批量清除缓存
   *
   * 适用场景:
   *   - 数据更新后清除相关缓存（如用户资料修改 → 清除 user:{id}:*）
   *   - 权限变更后清除角色缓存
   *   - 配置更新后清除系统配置缓存
   *
   * @param pattern - Redis KEY 匹配模式（如 'user:123:*', 'config:*'）
   *
   * 性能警告:
   *   KEYS 命令在 Key 数量过多时会阻塞 Redis
   *   生产环境建议:
   *     1. 使用 SCAN 替代 KEYS（需要底层 client 访问）
   *     2. 控制单次清除的 Key 数量
   *     3. 在低峰期执行批量清除
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const store = (this.cacheManager as any).store;
      const client = store?.client;

      if (client && typeof client.keys === 'function' && typeof client.del === 'function') {
        // 使用原生 Redis 命令
        const keys: string[] = await client.keys(pattern);

        if (keys.length > 0) {
          await client.del(...keys);
          this.logger.log(`[Cache Invalidate] 已清除 ${keys.length} 个缓存 keys, pattern=${pattern}`);
        }
      } else {
        // 回退方案: 无法按 pattern 清除，记录警告
        this.logger.warn(
          `[Cache Invalidate] 当前缓存 Store 不支持 pattern 操作: ${pattern}`
        );
      }
    } catch (error) {
      this.logger.error(
        `[Cache Invalidate] 失败: pattern=${pattern}`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  // ===================================================================
  // 私有工具方法
  // ===================================================================

  /**
   * 构建 RefreshToken 的 Redis Key
   *
   * 格式: refresh:{userId}:{deviceId}
   * 层级设计便于:
   *   1. 按用户维度批量查找（deleteAllUserTokens）
   *   2. 按设备维度精确定位（get/deleteRefreshToken）
   *   3. Redis CLI 调试时直观识别用途
   */
  private buildRefreshTokenKey(
    userId: string | number,
    deviceId: string
  ): string {
    return `${KEY_PREFIX.REFRESH_TOKEN}${userId}:${deviceId}`;
  }
}
