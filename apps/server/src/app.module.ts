import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './common/app.controller';

/**
 * 应用根模块
 * 聚合所有子模块和全局配置
 */
@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // 业务模块（后续添加）
    // AuthModule,
    // UserModule,
    // RoleModule,
    // PermissionModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
