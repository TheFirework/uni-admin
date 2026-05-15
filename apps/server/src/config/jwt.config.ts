/**
 * JWT (JSON Web Token) 配置模块
 * 管理访问令牌 (Access Token) 和刷新令牌 (Refresh Token) 的密钥与过期时间
 *
 * 使用方式:
 *   import { JWT_CONFIG } from './config/jwt.config';
 */

/** JWT 完整配置接口 */
export interface JwtConfig {
  /** 访问令牌签名密钥（至少32字符） */
  accessTokenSecret: string;
  /** 访问令牌过期时间，如 '15m'、'1h'、'2d' */
  accessTokenExpiresIn: string;
  /** 刷新令牌签名密钥（至少32字符） */
  refreshTokenSecret: string;
  /** 刷新令牌过期时间，如 '7d'、'30d' */
  refreshTokenExpiresIn: string;
}

/**
 * JWT 配置常量
 * 从环境变量读取，提供合理的默认值
 *
 * 安全提示: 生产环境必须通过环境变量设置强密钥，不要使用默认值
 */
export const JWT_CONFIG: JwtConfig = {
  // 访问令牌配置 - 用于 API 请求认证
  accessTokenSecret:
    process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-min-32-chars',
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',

  // 刷新令牌配置 - 用于获取新的访问令牌
  refreshTokenSecret:
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-min-32-chars',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
} as const;
