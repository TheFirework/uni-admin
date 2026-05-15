/**
 * @Cache() - 响应缓存装饰器
 *
 * 用于标记 Controller 方法，启用自动响应缓存功能。
 * 与 CacheInterceptor 配合使用，实现声明式缓存控制。
 *
 * 工作原理:
 *   1. 装饰器将缓存配置（key, ttl）写入方法元数据
 *   2. CacheInterceptor 在请求处理前读取元数据
 *   3. 命中缓存 → 直接返回，跳过 Controller 执行
 *   4. 未命中缓存 → 执行 Controller 并将结果写入 Redis
 *
 * 使用方式:
 *
 *   // 示例 1: 基础用法（默认 TTL 5 分钟）
 *   @Get('profile')
 *   @Cache('user:profile')
 *   async getProfile() { ... }
 *
 *   // 示例 2: 自定义 TTL（10 分钟）
 *   @Get('config')
 *   @Cache('system:config', 600)
 *   async getConfig() { ... }
 *
 *   // 示例 3: 动态 Key（支持路径参数）
 *   @Get(':id')
 *   @Cache('user:detail:{id}')  // 拦截器会自动替换参数
 *   async getUser(@Param('id') id: string) { ... }
 *
 * 适用场景:
 *   - 读多写少的接口（如配置、字典、公告）
 *   - 计算成本高的聚合查询（如统计报表）
 *   - 变更频率低的数据（如用户资料、权限列表）
 *
 * 不适用场景:
 *   - 写操作接口（POST/PUT/DELETE）
 *   - 实时性要求高的数据
 *   - 个性化内容（每个用户返回不同数据）
 */

import { SetMetadata } from '@nestjs/common';

/** 元数据 Key 常量，与 CacheInterceptor 中读取的 key 保持一致 */
export const CACHE_KEY_METADATA = 'cache' as const;

/** 缓存元数据结构 */
export interface CacheMetadata {
  /** 缓存键标识（支持动态参数占位符，如 'user:{id}'） */
  key: string;
  /**
   * 缓存过期时间（秒）
   * 不传则使用拦截器中的默认值（通常为 300 秒 / 5 分钟）
   */
  ttl?: number;
}

/**
 * 响应缓存装饰器
 *
 * 将缓存配置附加到方法的元数据中，供 CacheInterceptor 读取并执行缓存逻辑。
 *
 * @param key - 缓存键（建议使用命名空间格式，如 'module:resource'）
 * @param ttl - 可选的过期时间（秒），不传则使用全局默认值
 *
 * @example
 *   // 系统配置接口 - 数据变更少，缓存 10 分钟
 *   @Get('settings')
 *   @Cache('system:settings', 600)
 *   async getSettings() {
 *     return this.configService.getAll();
 *   }
 */
export const Cache = (key: string, ttl?: number) =>
  SetMetadata(CACHE_KEY_METADATA, { key, ttl });
