import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './common/app.controller.js';

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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', `.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
