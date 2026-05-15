import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

/**
 * JWT 认证策略
 *
 * 功能说明:
 *   1. 从 HTTP 请求的 Authorization 头提取 Bearer Token
 *   2. 使用 JwtService 验证 Token 的签名和有效期
 *   3. 将解码后的 payload (userId, username, roles) 注入到 Request.user 对象
 *   4. 配合 @UseGuards(JwtAuthGuard) 使用，保护需要认证的路由
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // 从 Authorization 头提取 Bearer Token（格式: Bearer <token>）
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 使用环境变量中的 JWT_SECRET 作为签名密钥
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production',
    });
  }

  /**
   * Passport 验证成功后的回调函数
   *
   * @param payload - JWT 解码后的负载，包含用户信息
   * @returns 返回用户信息对象，将被赋值给 request.user
   * @throws UnauthorizedException 当 payload 无效时抛出异常
   *
   * 使用场景:
   *   - 在 Controller 中通过 @CurrentUser() 装饰器获取当前登录用户
   *   - 在 Service 中通过 request.user 获取用户信息进行业务逻辑判断
   */
  async validate(payload: any) {
    // 验证 payload 中是否包含必要的用户标识字段
    if (!payload?.sub || !payload?.username) {
      throw new UnauthorizedException('无效的 Token 负载');
    }

    // 返回的用户信息结构，供后续使用
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles || [],       // 用户角色列表，用于权限控制
      iat: payload.iat,                  // Token 签发时间戳
      exp: payload.exp,                  // Token 过期时间戳
    };
  }
}
