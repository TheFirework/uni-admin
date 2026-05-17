import { Controller, Post, Body, UseGuards, Req, Res, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { Public } from './decorators/public.decorator.js';
import { Result } from '../../common/result.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('captcha')
  @ApiOperation({
    summary: '获取图形验证码',
    description: '生成 SVG 格式的图形验证码，返回 Base64 编码的图片和唯一标识',
  })
  @ApiResponse({
    status: 200,
    description: '验证码生成成功',
    example: {
      success: true,
      code: 200,
      message: 'ok',
      data: {
        captchaKey: '550e8400-e29b-41d4-a716-446655440000',
        captchaImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci...',
      },
      timestamp: '2026-05-16T00:00:00.000Z',
    },
  })
  async getCaptcha() {
    const result = await this.authService.generateCaptcha();
    return Result.success(result);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '用户登录', description: '使用用户名和密码登录，返回 AccessToken 和 RefreshToken' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    example: {
      success: true,
      code: 200,
      message: 'ok',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900,
        user: {
          userId: '1',
          username: 'admin',
          roles: ['admin'],
        },
      },
      timestamp: '2026-05-16T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 401,
    description: '用户名或密码错误',
    example: {
      success: false,
      code: 401,
      message: '用户名或密码错误',
      timestamp: '2026-05-16T00:00:00.000Z',
      path: '/api/auth/login',
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto, response);
    return Result.success(result);
  }

  @Public()
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
      success: true,
      code: 200,
      message: 'ok',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900,
      },
      timestamp: '2026-05-16T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'RefreshToken 无效或已过期',
  })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refreshTokens(dto, request, response);
    return Result.success(result);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary: '用户登出',
    description: '使 RefreshToken 失效并清除认证状态',
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    example: {
      success: true,
      code: 200,
      message: 'ok',
      timestamp: '2026-05-16T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 401,
    description: '未认证，请先登录',
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request, response);
    return Result.success(null);
  }
}
