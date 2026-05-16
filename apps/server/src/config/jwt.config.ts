/**
 * JWT (JSON Web Token) 配置工厂
 * 统一使用 JWT_SECRET 签名 Access Token 和 Refresh Token
 *
 * 使用方式:
 *   import { createJwtConfig } from './config/jwt.config';
 *   const jwtConfig = createJwtConfig(getConfig());
 */

import type { ValidatedConfig } from './env.validation.js';

/** JWT 完整配置接口 */
export interface JwtConfig {
  accessTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
}

export function createJwtConfig(config: ValidatedConfig): JwtConfig {
  return {
    accessTokenSecret: config.jwtSecret,
    accessTokenExpiresIn: '15m',
    refreshTokenSecret: config.jwtSecret,
    refreshTokenExpiresIn: config.jwtExpiresIn || '7d',
  };
}
