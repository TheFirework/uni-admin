import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './common/app.controller.js';
import { LoggerService } from './common/logger/logger.service.js';
import { AuthModule } from './modules/auth/auth.module.js';

/**
 * 应用根模块
 * 聚合所有子模块和全局配置
 *
 * 配置层级说明:
 *   ConfigModule.forRoot() → 负责将 .env 文件加载到 process.env（NestJS 原生能力）
 *   @/config (env.config.ts) → 负责类型安全校验和统一接口封装
 *
 * 两者共存，各司其职：
 *   - ConfigService: 用于 NestJS 模块注入（@InjectConfig）
 *   - env 对象:     用于应用启动逻辑（端口、开关、校验等）
 */
@Module({
  imports: [
    // ====== 基础配置 ======
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', `.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),

    // ====== [8.1] Redis 缓存模块 ======
    // 用于签名 nonce 防重放、RefreshToken 存储、热点数据缓存等场景
    //
    // import { CacheModule } from '@nestjs/cache-manager';
    // import { redisStore } from 'cache-manager-redis-store';
    //
    // CacheModule.registerAsync({
    //   isGlobal: true,                    // 全局注册，所有模块可直接注入 CACHE_MANAGER
    //   useFactory: async () => ({
    //     store: redisStore,               // 使用 Redis 作为缓存存储后端
    //     host: process.env.REDIS_HOST,
    //     port: Number(process.env.REDIS_PORT),
    //     password: process.env.REDIS_PASSWORD || undefined,
    //     ttl: 300,                        // 默认 TTL: 5 分钟（秒）
    //     // 可选配置项:
    //     // db: Number(process.env.REDIS_DB) || 0,   // Redis 数据库编号
    //     // keyPrefix: 'uni-admin:',                   // Key 前缀，避免多应用冲突
    //   }),
    // }),
    //
    // 使用示例（在 Service 中注入）:
    //   constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
    //   await this.cacheManager.set('key', value, 300);
    //   const data = await this.cacheManager.get<T>('key');
    //
    // 推荐使用封装后的 RedisCacheService:
    //   constructor(private readonly redisCache: RedisCacheService) {}
    //   await this.redisCache.set('key', value);

    // TODO: [BullModule] 队列任务模块 - 用于异步邮件发送、数据导出、日志清理等耗时任务
    // import { BullModule } from '@nestjs/bull';
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     redis: {
    //       host: configService.get<string>('REDIS_HOST', 'localhost'),
    //       port: configService.get<number>('REDIS_PORT', 6379),
    //       password: configService.get<string>('REDIS_PASSWORD'),
    //       db: configService.get<number>('REDIS_DB', 0),
    //     },
    //     defaultJobOptions: {
    //       removeOnComplete: { count: 1000 },   // 成功作业保留数量
    //       removeOnFail: { count: 5000 },       // 失败作业保留数量
    //       attempts: 3,                          // 最大重试次数
    //       backoff: { type: 'exponential', delay: 1000 },  // 指数退避策略
    //     },
    //   }),
    // }),
    //
    // 使用方式（在 TaskQueueModule 中注册具体队列）:
    //   BullModule.registerQueue(
    //     { name: 'email-queue' },
    //     { name: 'report-queue' },
    //     { name: 'cleanup-queue' },
    //   ),

    // TODO: [Knex Module] SQL 查询构建器模块 - 用于复杂报表查询、批量操作等场景
    // import { KnexModule } from 'nest-knex-lemmy';
    // KnexModule.forRootAsync({
    //   useFactory: () => ({
    //     config: {
    //       client: 'mysql2',
    //       connection: process.env.DATABASE_URL,
    //       pool: { min: 2, max: 10 },
    //     },
    //   }),
    // }),

    // 注册认证模块（提供 JWT 登录、刷新、登出功能）
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // 全局 LoggerService（供 main.ts 中全局拦截器/过滤器使用）
    LoggerService,
  ],
})
export class AppModule {}
