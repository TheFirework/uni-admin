import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// 注意: 此策略使用自定义名称 'jwt-refresh'，避免与默认的 'jwt' 策略冲突
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * RefreshToken 刷新策略
 *
 * 功能说明:
 *   1. 用于 Token 刷新流程，验证过期的 RefreshToken
 *   2. 从请求中提取 refreshToken（支持 Header 或 Body）
 *   3. 验证 Token 格式和有效性（预留 Redis 黑名单验证接口）
 *   4. 返回用户信息用于生成新的 Access + Refresh Token 对
 *
 * 安全机制 - Token 轮换策略:
 *   每次刷新后，旧的 RefreshToken 会失效（存入 Redis 黑名单）
 *   防止 Token 被重复使用，提高安全性
 *
 * 使用场景:
 *   POST /api/v1/auth/refresh - 当 AccessToken 过期时获取新的双 Token
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      // 优先从 Body 提取 refreshToken 字段，兼容从 Authorization 头提取
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          // 方式1: 从请求体提取（推荐方式）
          if (request?.body?.refreshToken) {
            return request.body.refreshToken;
          }
          // 方式2: 从 Cookie 提取（备用方案）
          if (request?.cookies?.refresh_token) {
            return request.cookies.refresh_token;
          }
          // 方式3: 从 Authorization 头提取（兼容方案）
          return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),

      // 使用独立的密钥或与 AccessToken 相同的密钥
      secretOrKey: configService.get<string>('JWT_SECRET')!,

      // 不检查过期时间，因为 RefreshToken 可能已过期但仍在有效期内用于刷新
      ignoreExpiration: false,
    });
  }

  /**
   * RefreshToken 验证回调
   *
   * @param payload - RefreshToken 解码后的负载
   * @returns 返回用户信息，用于生成新的 Token 对
   * @throws UnauthorizedException 当 Token 无效或已被撤销时
   *
   * TODO: 后续集成 Redis 后需添加以下逻辑:
   *   1. 查询 Redis 检查此 RefreshToken 是否在黑名单中
   *   2. 如果存在黑名单记录，说明 Token 已被撤销或已轮换
   *   3. 返回 401 错误提示客户端重新登录
   */
  async validate(payload: any) {
    // 基础字段校验
    if (!payload?.sub || !payload?.username || !payload?.type || payload.type !== 'refresh') {
      throw new UnauthorizedException('无效的 RefreshToken 格式');
    }

    // TODO: Redis 黑名单检查（预留接口）
    // const isBlacklisted = await this.redisService.isRefreshTokenBlacklisted(payload.jti);
    // if (isBlacklisted) {
    //   throw new UnauthorizedException('RefreshToken 已被撤销，请重新登录');
    // }

    // 返回用户信息，AuthService 将使用这些信息生成新的 Token 对
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles || [],
      tokenId: payload.jti,           // Token 唯一标识符，用于标记旧 Token 为已使用
    };
  }
}
