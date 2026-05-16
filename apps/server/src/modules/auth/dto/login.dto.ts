import { IsString, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户登录请求 DTO
 *
 * 功能说明:
 *   定义登录接口的输入参数格式和验证规则
 *   使用 class-validator 进行自动验证（配合 ValidationPipe）
 *   使用 @nestjs/swagger 自动生成 API 文档
 *
 * 使用方式:
 *   POST /api/v1/auth/login
 *   Body: { "username": "admin", "password": "Admin@123" }
 *
 * 验证规则:
 *   - username: 必填，字符串类型，最小长度3个字符
 *   - password: 必填，字符串类型，最小长度8个字符，必须包含大小写字母和数字
 */
export class LoginDto {
  /**
   * 用户名
   *
   * 验证规则:
   *   - 不能为空
   *   - 必须是字符串
   *   - 最小长度 3 个字符
   */
  @ApiProperty({
    description: '用户名',
    example: 'admin',
    minLength: 3,
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度至少为 3 个字符' })
  username!: string;  // 使用 definite assignment assertion（!），表示该属性会在验证后由 class-validator 赋值

  /**
   * 密码
   *
   * 安全要求:
   *   - 最小长度 8 个字符
   *   - 至少包含一个大写字母 (?=.*[A-Z])
   *   - 至少包含一个小写字母 (?=.*[a-z])
   *   - 至少包含一个数字 (?=.*\d)
   *   - 可选特殊字符
   *
   * 示例有效密码: Admin@123, Passw0rd, Test1234
   */
  @ApiProperty({
    description: '密码（需包含大小写字母和数字）',
    example: 'Admin@123',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度至少为 8 个字符' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    {
      message: '密码必须包含至少一个大写字母、一个小写字母和一个数字',
    },
  )
  password!: string;  // 使用 definite assignment assertion（!），表示该属性会在验证后由 class-validator 赋值

  /**
   * 验证码文本（可选）
   *
   * 使用场景:
   *   - 首次登录失败后，前端会显示验证码
   *   - 用户需要输入验证码才能继续登录
   *   - 后端通过 captchaKey 从 Redis 获取存储的验证码进行比对
   *
   * 验证规则:
   *   - 可选字段（首次登录不需要）
   *   - 如果提供则必须是字符串
   */
  @ApiPropertyOptional({
    description: '验证码文本（首次失败后必填）',
    example: 'A3xK',
  })
  @IsOptional()
  @IsString({ message: '验证码必须是字符串' })
  captcha?: string;

  /**
   * 验证码唯一标识（可选）
   *
   * 功能说明:
   *   - 与 captcha 成对使用
   *   - 用于从 Redis 查找对应的验证码文本
   *   - 每次获取验证码图片时生成新的 UUID
   */
  @ApiPropertyOptional({
    description: '验证码标识（与 captcha 成对使用）',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsString({ message: 'captchaKey 必须是字符串' })
  captchaKey?: string;
}

/**
 * 登录成功响应 DTO（内部使用）
 *
 * 返回给客户端的数据结构:
 *   - accessToken: 短期访问令牌（放在响应体中）
 *   - expiresIn: Token 有效期（秒）
 *   - user: 当前用户基本信息
 *
 * 注意: refreshToken 通过 HTTP-Only Cookie 返回，不在响应体中
 */
export interface LoginResponseDto {
  /** 访问令牌 */
  accessToken: string;
  /** Token 有效期（秒） */
  expiresIn: number;
  /** 当前用户信息 */
  user: {
    userId: string;
    username: string;
    email?: string;
    roles: string[];
  };
}
