import { Controller, Post, Body, UseGuards, Req, Res, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request, Response } from 'express';  // 使用 import type 导入，避免装饰器签名中的类型引用问题
import { AuthService } from './auth.service';
import { LoginDto, type LoginResponseDto } from './dto/login.dto';  // LoginDto 作为值使用（装饰器需要），LoginResponseDto 仅作类型
import { RefreshTokenDto, type RefreshTokenResponseDto } from './dto/refresh-token.dto';  // RefreshTokenDto 作为值使用
import { CaptchaResponseDto } from './dto/captcha.dto'; // 新增：验证码响应 DTO
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

/**
 * 认证控制器
 *
 * 功能说明:
 *   提供用户认证相关的 RESTful API 接口
 *   包括登录、Token 刷新、登出三个核心功能
 *
 * 路由前缀: /api/v1/auth (在 main.ts 中通过 setGlobalPrefix 设置)
 *
 * 接口列表:
 *   POST /api/v1/auth/login    - 用户登录（公开）
 *   POST /api/v1/auth/refresh  - 刷新 Token（公开）
 *   POST /api/v1/auth/logout   - 用户登出（需认证）
 *
 * 安全机制:
 *   - 登录和刷新接口使用 @Public() 装饰器，跳过 JWT 认证
 *   - 登出接口需要有效的 AccessToken，确保只有已登录用户才能调用
 *   - 所有接口都有完整的 Swagger 文档和响应示例
 */
@ApiTags('Auth') // Swagger 分组标签
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * 获取图形验证码
   *
   * 功能说明:
   *   生成 SVG 格式的图形验证码，用于防止机器人暴力破解
   *   验证码文本存储在 Redis 中，有效期 5 分钟
   *
   * 使用场景:
   *   - 登录页面显示验证码（首次失败后强制要求）
   *   - 注册、找回密码等敏感操作前的二次验证
   *   - 其他需要人机验证的场景
   *
   * 接口特性:
   *   - 公开接口，无需认证（@Public）
   *   - 每次请求生成全新的验证码图片和唯一标识
   *   - 返回 Base64 编码的 SVG 图片，可直接在 <img> 标签中使用
   *   - 验证码一次性使用，提交后立即失效
   *
   * @returns 包含 captchaKey 和 captchaImage 的响应对象
   *
   * 响应示例:
   * ```json
   * {
   *   "code": 200,
   *   "message": "验证码生成成功",
   *   "data": {
   *     "captchaKey": "550e8400-e29b-41d4-a716-446655440000",
   *     "captchaImage": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci..."
   *   }
   * }
   * ```
   *
   * 安全机制:
   *   - 验证码文本使用小写存储，比对时不区分大小写
   *   - Redis TTL: 300 秒（5 分钟），过期自动删除
   *   - UUID 作为 captchaKey，防止预测攻击
   *   - SVG 格式避免字体依赖，保证跨平台一致性
   */
  @Public() // 公开接口，无需 Token 认证
  @Get('captcha')
  @ApiOperation({
    summary: '获取图形验证码',
    description: '生成 SVG 格式的图形验证码，返回 Base64 编码的图片和唯一标识',
  })
  @ApiResponse({
    status: 200,
    description: '验证码生成成功',
    type: 'object',
    example: {
      code: 200,
      message: '验证码生成成功',
      data: {
        captchaKey: '550e8400-e29b-41d4-a716-446655440000',
        captchaImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci...',
      },
    },
  })
  async getCaptcha(): Promise<any> {
    // 调用 AuthService 生成验证码
    const result = await this.authService.generateCaptcha();

    return {
      code: 200,
      message: '验证码生成成功',
      data: result,
    };
  }

  /**
   * 用户登录接口
   *
   * 完整流程:
   *   1. 接收用户名和密码
   *   2. 验证凭证并查询用户信息
   *   3. 生成双 Token (AccessToken + RefreshToken)
   *   4. 返回 AccessToken 在响应体中，RefreshToken 通过 HttpOnly Cookie 设置
   *
   * @param loginDto - 登录凭证 DTO
   * @param response - Express Response 对象（用于设置 Cookie）
   * @returns 包含 AccessToken 和用户信息的响应对象
   *
   * 成功响应示例:
   * ```json
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "expiresIn": 900,
   *   "user": {
   *     "userId": "1",
   *     "username": "admin",
   *     "roles": ["admin"]
   *   }
   * }
   * ```
   *
   * 错误响应:
   *   - 400: 参数验证失败（密码格式错误等）
   *   - 401: 用户名或密码错误
   *   - 404: 用户不存在
   */
  @Public() // 公开接口，无需 Token 认证
  @Post('login')
  @ApiOperation({ summary: '用户登录', description: '使用用户名和密码登录，返回 AccessToken 和 RefreshToken' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: 'object', // 使用 object 类型，实际结构见 LoginResponseDto
    example: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
      user: {
        userId: '1',
        username: 'admin',
        roles: ['admin'],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '用户名或密码错误',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res() response: Response,
  ): Promise<any> {
    // 调用 AuthService 执行登录逻辑
    const result = await this.authService.login(loginDto, response);

    // 返回 JSON 响应（RefreshToken 已通过 Cookie 设置）
    return response.status(200).json({
      code: 200,
      message: '登录成功',
      data: result,
    });
  }

  /**
   * Token 刷新接口
   *
   * 使用场景:
   *   当 AccessToken 过期后，客户端使用此接口获取新的双 Token
   *   无需用户重新输入密码，提供无缝的认证体验
   *
   * 安全机制 - Token 轮换策略:
   *   每次刷新成功后，旧的 RefreshToken 立即失效
   *   防止 Token 被截获后重复使用，提高安全性
   *
   * @param dto - 刷新请求 DTO（可选的 refreshToken 字段）
   * @param request - Express Request 对象（用于提取 Cookie）
   * @param response - Express Response 对象（用于设置新 Cookie）
   * @returns 新的 AccessToken 和过期时间
   *
   * 请求方式:
   *   方式1: 从 Cookie 自动提取（推荐）
   *     POST /api/v1/auth/refresh
   *     Cookie: refresh_token=<old-refresh-token>
   *
   *   方式2: 在请求体中显式传递
   *     POST /api/v1/auth/refresh
   *     Body: { "refreshToken": "<old-refresh-token>" }
   *
   * 成功响应示例:
   * ```json
   * {
   *   "code": 200,
   *   "message": "Token 刷新成功",
   *   "data": {
   *     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *     "expiresIn": 900
   *   }
   * }
   * ```
   */
  @Public() // 公开接口，使用 RefreshToken 验证
  @Post('refresh')
  @ApiOperation({
    summary: '刷新 Token',
    description: '使用 RefreshToken 获取新的 Access 和 Refresh Token 对（支持 Token 轮换）',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    example: {
      code: 200,
      message: 'Token 刷新成功',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'RefreshToken 无效或已过期',
  })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<any> {
    // 调用 AuthService 执行 Token 刷新逻辑
    const result = await this.authService.refreshTokens(dto, request, response);

    return response.status(200).json({
      code: 200,
      message: 'Token 刷新成功',
      data: result,
    });
  }

  /**
   * 用户登出接口
   *
   * 功能说明:
   *   1. 使当前用户的 RefreshToken 立即失效（从 Redis 中删除）
   *   2. 清除浏览器中的 RefreshToken Cookie
   *   3. 客户端应同时丢弃本地存储的 AccessToken
   *
   * 注意事项:
   *   - 此接口需要有效的 AccessToken（已登录状态）
   *   - AccessToken 本身无法在服务端主动失效（无状态设计）
   *   - 但由于 AccessToken 有效期较短（15分钟），安全风险可控
   *   - 敏感操作应配合后端权限验证，不依赖客户端 Token 清除
   *
   * @param request - Express Request 对象（包含当前用户信息）
   * @param response - Express Response 对象（用于清除 Cookie）
   * @returns 操作结果
   *
   * 成功响应示例:
   * ```json
   * {
   *   "code": 200,
   *   "message": "登出成功"
   * }
   * ```
   *
   * 错误响应:
   *   - 401: 未提供有效的 AccessToken
   */
  @UseGuards(JwtAuthGuard) // 需要认证：只有已登录用户才能登出
  @ApiBearerAuth() // Swagger UI 显示 Authorization 输入框
  @Post('logout')
  @ApiOperation({
    summary: '用户登出',
    description: '使 RefreshToken 失效并清除认证状态',
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    example: {
      code: 200,
      message: '登出成功',
    },
  })
  @ApiResponse({
    status: 401,
    description: '未认证，请先登录',
  })
  async logout(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<any> {
    // 调用 AuthService 执行登出逻辑
    await this.authService.logout(request, response);

    return response.status(200).json({
      code: 200,
      message: '登出成功',
    });
  }
}
