import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 导入认证模块的各个组件
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { RedisCacheService } from '../../common/cache/redis-cache.service.js';

// 导入 Passport 策略
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';

/**
 * 认证模块
 *
 * 功能说明:
 *   聚合所有 JWT 认证相关的组件，提供完整的用户认证能力
 *   作为 NestJS 的功能模块，可被其他模块导入和复用
 *
 * 模块职责:
 *   1. 配置 JWT 和 Passport 模块（注册策略、配置密钥）
 *   2. 提供 AuthService 核心业务逻辑（登录、刷新、登出）
 *   3. 提供 AuthController RESTful API 接口
 *   4. 导出 AuthService 供其他模块使用（如用户管理、权限控制等）
 *
 * 依赖关系:
 *   ┌─────────────────────────────────────┐
 *   │           AuthModule                │
 *   ├─────────────────────────────────────┤
 *   │ Imports:                            │
 *   │  - ConfigModule (读取环境变量)       │
 *   │  - PassportModule (Passport 集成)    │
 *   │  - JwtModule (JWT 签名和验证)       │
 *   ├─────────────────────────────────────┤
 *   │ Providers:                          │
 *   │  - AuthService (核心业务逻辑)        │
 *   │  - JwtStrategy (AccessToken 验证)   │
 *   │  - RefreshTokenStrategy (刷新验证)   │
 *   ├─────────────────────────────────────┤
 *   │ Controllers:                        │
 *   │  - AuthController (API 路由)         │
 *   ├─────────────────────────────────────┤
 *   │ Exports:                            │
 *   │  - AuthService (供其他模块复用)      │
 *   └─────────────────────────────────────┘
 *
 * 使用方式:
 *
 *   1. 在 AppModule 中注册:
 *      ```typescript
 *      @Module({
 *        imports: [AuthModule],
 *      })
 *      export class AppModule {}
 *      ```
 *
 *   2. 在其他模块中复用 AuthService:
 *      ```typescript
 *      @Module({
 *        imports: [AuthModule],
 *        providers: [SomeService],
 *      })
 *      export class SomeModule {
 *        constructor(private readonly authService: AuthService) {}
 *      }
 *      ```
 */
@Module({
  /**
   * 导入依赖模块
   *
   * ConfigModule:
   *   - 用于读取环境变量（JWT_SECRET, JWT_EXPIRES_IN 等）
   *   - 已在 AppModule 中全局注册，此处再次导入确保可用性
   *
   * PassportModule:
   *   - NestJS 对 Passport 的封装
   *   - 提供 @UseGuards(AuthGuard('strategy')) 能力
   *   - 必须在使用任何 Passport 策略前注册
   *
   * JwtModule.registerAsync:
   *   - 异步配置 JWT 模块，支持从 ConfigService 动态读取配置
   *   - 注入 JwtService 到 AuthService 中用于签名和验证 Token
   *   - 使用 registerAsync 而非 register，因为需要依赖注入
   */
  imports: [
    // Passport 模块（必需：提供策略基础架构）
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块（异步配置：从环境变量读取密钥）
    JwtModule.registerAsync({
      imports: [ConfigModule],         // 导入 ConfigModule 以访问环境变量
      inject: [ConfigService],          // 注入 ConfigService
      useFactory: async (configService: ConfigService) => {
        // 从环境变量获取 JWT 密钥（必须与客户端保持一致）
        const secret = configService.get<string>('JWT_SECRET')!;

        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') ?? '15m';

        return {
          secret,
          signOptions: {
            // 使用 as any 绕过类型检查，因为 @nestjs/jwt 的类型定义可能过于严格
            // 实际支持 string 格式（如 '15m', '1h', '7d'）和 number 格式（如 900, 3600）
            expiresIn: expiresIn as any,
          },
        } as any;  // 使用 as any 绕过 JwtModuleOptions 类型检查
      },
    }),
  ],

  /**
   * 注册服务提供者
   *
   * 这些类会被 NestJS 的依赖注入容器管理，
   * 可以通过构造函数注入到其他组件中
   */
  providers: [
    AuthService,            // 核心认证服务（登录、刷新、登出）
    JwtStrategy,            // AccessToken 验证策略
    RefreshTokenStrategy,   // RefreshToken 验证策略
    RedisCacheService,      // Redis 缓存服务（RefreshToken 存储）
  ],

  /**
   * 注册控制器
   *
   * AuthController 会自动处理 /api/v1/auth/* 路由
   * 路由前缀在 main.ts 中通过 app.setGlobalPrefix('api/v1') 设置
   */
  controllers: [
    AuthController,
  ],

  /**
   * 导出服务
   *
   * 将 AuthService 导出，使其他模块可以:
   *   - 在构造函数中注入 AuthService
   *   - 复用登录、Token 生成等能力
   *   - 实现自定义的认证逻辑
   *
   * 典型使用场景:
   *   - UsersModule: 注册成功后自动登录
   *   - OAuthModule: 第三方登录后生成 JWT
   *   - AdminModule: 管理员强制用户下线
   */
  exports: [
    AuthService,
  ],
})
export class AuthModule {}
