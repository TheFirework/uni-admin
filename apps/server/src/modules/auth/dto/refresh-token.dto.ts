import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * RefreshToken 刷新请求 DTO
 *
 * 功能说明:
 *   定义 Token 刷新接口的输入参数
 *   refreshToken 字段为可选，因为系统支持从 Cookie 自动提取
 *
 * 使用场景:
 *   当 AccessToken 过期后，客户端调用此接口获取新的双 Token
 *
 * 提取优先级:
 *   1. 请求体中的 refreshToken 字段（显式传递）
 *   2. Cookie 中的 refresh_token 字段（自动提取）
 *   3. Authorization 头中的 Bearer Token（兼容方案）
 *
 * 使用方式:
 *   POST /api/v1/auth/refresh
 *   Body: { "refreshToken": "<refresh-token>" }
 *   或依赖 Cookie 自动提取
 */
export class RefreshTokenDto {
  /**
   * 刷新令牌（可选）
   *
   * 说明:
   *   - 如果不提供，系统会尝试从 Cookie 中自动提取
   *   - 建议前端通过 Cookie 方式传递，避免手动管理
   *   - 此字段主要用于非浏览器环境（如移动端 App）
   */
  @ApiPropertyOptional({
    description: '刷新令牌（可选，如果不提供则从 Cookie 提取）',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'RefreshToken 必须是字符串' })
  @IsOptional()
  refreshToken?: string;
}

/**
 * Token 刷新成功响应 DTO（内部使用）
 *
 * 与 LoginResponseDto 结构相同，返回新的双 Token
 */
export interface RefreshTokenResponseDto {
  /** 新的访问令牌 */
  accessToken: string;
  /** Token 有效期（秒） */
  expiresIn: number;
}
