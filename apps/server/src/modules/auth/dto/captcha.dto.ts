import { ApiProperty } from '@nestjs/swagger';

/**
 * 验证码响应 DTO
 *
 * 功能说明:
 *   定义验证码接口的返回数据格式
 *   包含 Base64 编码的图片和用于验证的唯一标识
 *
 * 响应示例:
 * ```json
 * {
 *   "captchaKey": "uuid-xxxx",
 *   "captchaImage": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci..."
 * }
 * ```
 */
export class CaptchaResponseDto {
  /**
   * 验证码唯一标识（用于提交时匹配）
   *
   * 安全说明:
   *   - 每次请求生成唯一的 UUID
   *   - 存储在 Redis 中，与用户输入的验证码进行比对
   *   - 有效期 5 分钟，过期自动删除
   *   - 一次性使用，验证成功或失败后立即失效
   */
  @ApiProperty({
    description: '验证码唯一标识',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  captchaKey!: string;

  /**
   * Base64 编码的 SVG 验证码图片
   *
   * 格式说明:
   *   - data URI 格式: data:image/svg+xml;base64,...
   *   - 可直接设置为 <img> 标签的 src 属性
   *   - SVG 格式保证清晰度，不受分辨率影响
   *
   * 使用方式:
   *   <img :src="captchaImage" alt="验证码" />
   */
  @ApiProperty({
    description: 'Base64 编码的 SVG 验证码图片',
    example: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci...',
    format: 'base64',
  })
  captchaImage!: string;
}
