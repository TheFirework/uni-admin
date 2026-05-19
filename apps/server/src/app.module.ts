import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './common/app.controller.js';
import { LoggerService } from './common/logger/logger.service.js';
import { RedisCacheService } from './common/cache/redis-cache.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { validationSchema } from './config/env.validation.js';
import { getConfig } from './config/env.config.js';

/**
 * 应用根模块
 * 聚合所有子模块和全局配置
 *
 * 配置层级:
 *   1. dotenv 加载 .env.* 文件 → process.env
 *   2. Zod Schema 校验 + 类型转换 → ValidatedConfig
 *   3. ConfigService (DI) / getConfig() (同步) 双通道访问
 */
@Module({
  imports: [
    // ====== 基础配置（Zod 校验集成）======
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', `.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validate: (config) => {
        const result = validationSchema.safeParse(config);
        if (!result.success) {
          console.error('\n╔══════════════════════════════════════╗');
          console.error('║   环境变量校验失败，启动已终止       ║');
          console.error('╠══════════════════════════════════════╣');
          result.error.issues.forEach((issue) => {
            console.error(`║  ${issue.path.join('.')}: ${issue.message}`);
          });
          console.error('╚══════════════════════════════════════╝\n');
          throw new Error('[Config] 环境变量校验失败，请检查 .env 配置');
        }
        return result.data;
      },
    }),

    // ====== Redis 缓存模块 ======
    // 用于签名 nonce 防重放、RefreshToken 存储、热点数据缓存等场景
    // RedisCacheService 依赖此模块提供的 cacheManager 注入
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const config = getConfig();
        return {
          store: await redisStore({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword || undefined,
            db: config.redisDb,
            ttl: 300,
          }),
        };
      },
    }),

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
    // 注册菜单模块（提供 /api/v1/system/menus 路由菜单 API）
    MenuModule,
  ],
  controllers: [AppController],
  providers: [
    // 全局 LoggerService（供 main.ts 中全局拦截器/过滤器使用）
    LoggerService,
    // RedisCacheService（全局注册，供 AuthService 等模块注入使用）
    RedisCacheService,
  ],
})
export class AppModule {}
