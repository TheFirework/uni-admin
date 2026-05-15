/**
 * CacheInterceptor - 响应缓存拦截器
 *
 * 职责:
 *   1. 检测 Controller 方法是否标注了 @Cache() 装饰器
 *   2. 命中缓存 → 直接返回缓存数据，跳过 Controller 执行（提升性能）
 *   3. 未命中缓存 → 正常执行 Controller，将响应结果写入 Redis 缓存
 *   4. 支持 TTL 自动过期（时间到后自动失效）
 *
 * 工作流程:
 *
 *   客户端请求
 *       │
 *       ▼
 *   ┌─────────────────┐
 *   │ 读取 @Cache 元数据  │ ──→ 无装饰器 → 放行（正常执行 Controller）
 *   └────────┬────────┘
 *            │ 有 @Cache
 *            ▼
 *   ┌─────────────────┐
 *   │ 构建 Cache Key    │ ← 支持 {param} 动态替换
 *   └────────┬────────┘
 *            │
 *            ▼
 *   ┌─────────────────┐     ┌──────────────┐
 *   │ 查询 Redis 缓存    │────│ 命中 (HIT)  │→ 直接返回缓存数据
 *   └────────┬────────┘     └──────────────┘
 *            │ 未命中 (MISS)
 *            ▼
 *   ┌─────────────────┐
 *   │ 执行 Controller   │ ← 调用 next.handle()
 *   └────────┬────────┘
 *            │
 *            ▼
 *   ┌─────────────────┐
 *   │ 将响应写入缓存     │ ← 使用 tap 操作符
 *   └────────┬────────┘
 *            │
 *            ▼
 *      返回给客户端
 *
 * 使用方式:
 *
 *   // 方式 1: 全局注册（所有带 @Cache 的方法都生效）
 *   app.useGlobalInterceptors(new CacheInterceptor(redisCacheService));
 *
 *   // 方式 2: 在特定 Controller 或方法上使用
 *   @UseInterceptors(CacheInterceptor)
 *   @Get('data')
 *   @Cache('api:data', 300)
 *   async getData() { ... }
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { CACHE_KEY_METADATA, type CacheMetadata } from '../decorators/cache.decorator.js';

/** 拦截器默认 TTL（秒），当 @Cache() 未指定 ttl 时使用 */
const DEFAULT_TTL = 300; // 5 分钟

/**
 * 动态参数匹配正则
 * 匹配格式: {paramName}
 * 示例: 'user:{id}:profile' → 'user:123:profile' (id=123)
 */
const PARAM_REGEX = /\{(\w+)\}/g;

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    /** NestJS 反射器 - 用于读取方法元数据 */
    private readonly reflector: Reflector,
    /** Redis 缓存服务封装 */
    private readonly redisCache: RedisCacheService
  ) {}

  /**
   * 拦截器核心逻辑
   *
   * @param context - 执行上下文（包含 Request、Handler 等信息）
   * @param next - 下一个处理器（Controller 方法）
   * @returns Observable 响应流
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // ====== 第一步: 读取 @Cache 元数据 ======
    const cacheMeta = this.reflector.get<CacheMetadata | undefined>(
      CACHE_KEY_METADATA,
      context.getHandler()
    );

    // 如果当前方法没有 @Cache 装饰器，直接放行（不进行任何缓存操作）
    if (!cacheMeta) {
      return next.handle();
    }

    // ====== 第二步: 构建 Cache Key ======
    const cacheKey = this.resolveCacheKey(context, cacheMeta.key);

    // ====== 第三步: 尝试从缓存读取 ======
    return this.tryGetFromCache(cacheKey, cacheMeta.ttl, next);
  }

  /**
   * 尝试获取缓存数据
   *
   * 核心缓存逻辑:
   *   1. 同步查询 Redis（此时还未执行 Controller）
   *   2. 命中 → 返回 of(缓存数据) 的 Observable（短路返回）
   *   3. 未命中 → 执行 Controller 并在响应成功后写入缓存
   */
  private tryGetFromCache(
    cacheKey: string,
    ttl: number | undefined,
    next: CallHandler
  ): Observable<unknown> {
    // 将异步的缓存查询转换为同步流程
    // 注意: 这里使用 async/await 在 intercept 内部处理，
    // 因为需要在决定是否调用 next.handle() 之前知道缓存状态

    // 创建一个新的 Observable 来包裹异步逻辑
    return new Observable<unknown>((subscriber) => {
      // 异步检查缓存
      this.redisCache
        .getCachedData<unknown>(cacheKey)
        .then((cachedData) => {
          // ====== 缓存命中 ======
          if (cachedData !== undefined) {
            this.logger.debug(`[Cache HIT] key=${cacheKey}`);
            subscriber.next(cachedData); // 发送缓存数据
            subscriber.complete();       // 完成 Observable
            return;
          }

          // ====== 缓存未命中，执行 Controller 并缓存结果 ======
          this.logger.debug(`[Cache MISS] key=${cacheKey}`);

          // 订阅 Controller 的响应流
          next
            .handle()
            .pipe(
              // tap 操作符: 不修改响应内容，仅在响应发出时触发副作用（写缓存）
              tap({
                next: (response) => {
                  // 仅缓存成功的响应（非错误、非空值）
                  if (response !== null && response !== undefined) {
                    const effectiveTtl = ttl ?? DEFAULT_TTL;

                    // 异步写缓存（不阻塞响应返回）
                    this.redisCache
                      .setCachedData(cacheKey, response, effectiveTtl)
                      .then(() => {
                        this.logger.debug(
                          `[Cache SET] key=${cacheKey}, ttl=${effectiveTtl}s`
                        );
                      })
                      .catch((err) => {
                        // 写缓存失败不应影响用户收到的响应
                        this.logger.warn(
                          `[Cache SET FAIL] key=${cacheKey}, error=${err.message}`
                        );
                      });
                  }
                },
              })
            )
            .subscribe({
              // 将 Controller 的响应转发给原始订阅者
              next: (value) => subscriber.next(value),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        })
        .catch((err) => {
          // Redis 查询异常时降级：放行请求，不使用缓存
          this.logger.warn(
            `[Cache ERROR] key=${cacheKey}, 降级为直接请求, error=${err.message}`
          );

          // 出错时直接执行 Controller，不做任何缓存操作
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        });
    });
  }

  /**
   * 解析并构建最终的 Cache Key
   *
   * 功能:
   *   1. 替换动态参数占位符（如 {id} → 实际值）
   *   2. 追加查询参数哈希（区分不同查询条件）
   *   3. 确保生成的 Key 唯一且可读
   *
   * @param context - 执行上下文
   * @param template - @Cache() 中定义的 Key 模板
   * @returns 解析后的完整 Cache Key
   *
   * @example
   *   // URL: /api/users/123?role=admin
   *   // Template: 'user:detail:{id}'
   *   // Result: 'user:detail:123'
   *
   *   // URL: /api/articles?page=1&size=10
   *   // Template: 'article:list'
   *   // Result: 'article:list:?page=1&size=10'  (追加查询参数)
   */
  private resolveCacheKey(context: ExecutionContext, template: string): string {
    const request = context.switchToHttp().getRequest();

    // 替换路径参数占位符: {paramName} → actualValue
    let resolvedKey = template.replace(PARAM_REGEX, (_, paramName) => {
      // 从 params 中获取路径参数值
      const value = request.params?.[paramName];
      // 如果参数不存在，保留原始占位符（便于调试）
      return value ?? `{${paramName}}`;
    });

    // 如果有查询参数且模板未显式处理，则追加查询字符串
    // 这确保相同接口不同查询参数有独立缓存
    const queryString = this.buildQueryString(request);

    if (queryString) {
      resolvedKey += `:${queryString}`;
    }

    return resolvedKey;
  }

  /**
   * 构建查询参数字符串（用于 Cache Key 后缀）
   *
   * 处理规则:
   *   1. 排序参数名确保顺序一致性（a=1&b=2 与 b=2&a=1 视为同一请求）
   *   2. 过滤掉无关参数（如 timestamp、_t、random 等防缓存参数）
   *   3. 只取值的前 50 字符（避免超长 Key）
   *
   * @param request - Express Request 对象
   * @returns 格式化后的查询字符串，无参数时返回空字符串
   */
  private buildQueryString(request: any): string {
    const query = request.query;

    // 无查询参数或空对象
    if (!query || typeof query !== 'object' || Object.keys(query).length === 0) {
      return '';
    }

    // 需要排除的参数（这些参数不影响业务数据，但会导致缓存无法命中）
    const EXCLUDE_PARAMS = new Set([
      '_t',         // 时间戳（防缓存用）
      'timestamp',  // 时间戳
      '_',          // 版本号/随机数
      'random',     // 随机数
      'nocache',    // 强制不缓存标记
      'v',          // 版本号
    ]);

    // 过滤并排序参数
    const sortedParams = Object.entries(query)
      .filter(([key]) => !EXCLUDE_PARAMS.has(key))
      .sort(([a], [b]) => a.localeCompare(b)) // 参数名字典序排序
      .map(([key, value]) => {
        // 截断过长的值，避免 Key 过长影响 Redis 性能
        const strValue = String(value).slice(0, 50);
        return `${key}=${strValue}`;
      });

    return sortedParams.length > 0 ? `q:${sortedParams.join('&')}` : '';
  }
}
