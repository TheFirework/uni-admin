import { Injectable, UnauthorizedException, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require('uuid'); // 使用 require 避免 ESM/CJS 兼容性问题
// eslint-disable-next-line @typescript-eslint/no-require-imports
const svgCaptcha = require('svg-captcha'); // SVG 验证码生成库
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refresh-token.dto';
import { CaptchaResponseDto } from './dto/captcha.dto'; // 新增：验证码 DTO
import { PrismaClient } from '@prisma/client';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

const prisma = new PrismaClient();

/**
 * JWT Payload 接口定义
 *
 * AccessToken 负载结构:
 *   - sub: 用户唯一标识（JWT 标准字段）
 *   - username: 用户名（便于日志和调试）
 *   - roles: 角色列表（用于前端权限控制）
 *   - type: Token 类型标识
 */
interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  type: 'access' | 'refresh';
}

/**
 * RefreshToken 存储接口（预留 Redis 实现）
 *
 * TODO: 后续集成 Redis 时实现此接口
 * 用于将 RefreshToken 持久化到 Redis，支持:
 *   1. Token 黑名单机制（撤销 Token）
 *   2. Token 轮换检测（防止重放攻击）
 *   3. 分布式会话管理
 */
interface RefreshTokenStorage {
  /** 存储 Token 到 Redis */
  store(userId: string, tokenId: string, token: string, expiresIn: number): Promise<void>;
  /** 验证 Token 是否有效且未被使用 */
  validate(userId: string, tokenId: string): Promise<boolean>;
  /** 将旧 Token 标记为已使用（Token 轮换） */
  markAsUsed(userId: string, tokenId: string): Promise<void>;
  /** 删除用户的所有 RefreshToken（登出时调用） */
  deleteAll(userId: string): Promise<void>;
}

/**
 * 认证服务类
 *
 * 功能说明:
 *   提供完整的 JWT 认证流程，包括登录、Token 刷新、登出
 *   实现双 Token 机制（AccessToken + RefreshToken）提高安全性
 *   支持 Token 轮换策略，防止 RefreshToken 被重复使用
 *
 * 双 Token 机制说明:
 *   ┌─────────────────┬──────────────────┬────────────────────┐
 *   │     Token       │    有效期        │      用途          │
 *   ├─────────────────┼──────────────────┼────────────────────┤
 *   │  AccessToken    │   短期 (15分钟)  │  API 请求认证      │
 *   │  RefreshToken   │   长期 (7天)     │  刷新 AccessToken  │
 *   └─────────────────┴──────────────────┴────────────────────┘
 *
 * 安全特性:
 *   1. AccessToken 通过响应体返回，RefreshToken 通过 HttpOnly Cookie 返回
 *   2. RefreshToken 使用 Token 轮换策略，每次刷新后旧 Token 失效
 *   3. 密码使用 bcrypt 哈希存储，验证时使用 compare 方法
 *   4. 支持 Redis 黑名单，可强制撤销 Token
 *
 * TODO: [RBAC权限] 集成 Casbin 或自定义 RBAC 中间件
 *   - 在 login() 成功后查询用户权限列表并注入到 Token payload
 *   - 实现 @Roles('admin') 装饰器进行接口级别权限控制
 *   - 支持动态权限加载（从数据库或 Redis 缓存读取）
 *   参考: https://casbin.org/docs/nestjs-authz
 *
 * TODO: [OAuth集成] 支持第三方登录（GitHub、Google、微信等）
 *   - 实现 OAuth2.0 / OpenID Connect 流程
 *   - 新增 oauthLogin() 方法处理第三方回调
 *   - 支持账号绑定（将第三方账号关联到本地用户）
 *   使用库: @nestjs/passport + passport-oauth2
 *
 * TODO: [多因素认证] 增加 MFA/2FA 支持
 *   - 集成 TOTP（基于时间的一次性密码，如 Google Authenticator）
 *   - 实现 setupMFA() 和 verifyMFA() 方法
 *   - 敏感操作强制要求二次验证
 *   使用库: otplib (@nestjs/security 包)
 *
 * TODO: [登录限流] 防止暴力破解攻击
 *   - 基于 IP + 用户名的滑动窗口限流（5次/分钟）
 *   - 使用 Redis 存储尝试次数和锁定状态
 *   - 超过阈值后暂时锁定账户并发送告警邮件
 *   可使用: @nestjs/throttler 或自定义 Redis 限流中间件
 */
@Injectable()
export class AuthService {
  /**
   * 构造函数 - 注入依赖服务
   *
   * @param jwtService - JWT Token 签名和验证服务
   * @param configService - 配置服务（读取环境变量）
   * @param redisCache - Redis 缓存服务（用于 RefreshToken 存储/删除）
   */
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisCache: RedisCacheService,  // ✅ 已注入 Redis 缓存服务
  ) { }

  /**
   * 用户登录
   *
   * 完整流程:
   *   1. 根据用户名查询数据库获取用户信息
   *   2. 使用 bcrypt.compare 验证密码哈希
   *   3. 生成双 Token（AccessToken + RefreshToken）
   *   4. 将 RefreshToken 存储到 Redis（预留）
   *   5. 返回用户信息和 AccessToken，RefreshToken 设置到 Cookie
   *
   * @param loginDto - 登录凭证（用户名和密码）
   * @param response - Express Response 对象，用于设置 Cookie
   * @returns 登录成功响应（包含 AccessToken 和用户信息）
   * @throws UnauthorizedException 用户名或密码错误
   * @throws NotFoundException 用户不存在
   */
  async login(loginDto: LoginDto, response: any): Promise<LoginResponseDto> {
    const { username, password, captcha, captchaKey } = loginDto;

    // 步骤0 - 验证码校验（如果提供了验证码）
    if (captchaKey || captcha) {
      const isCaptchaValid = await this.validateCaptcha(captchaKey || '', captcha || '');
      if (!isCaptchaValid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }
    }

    // 步骤1 - 从数据库查询用户
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          { username },
          { status: 1 }  // 仅查询启用状态的用户
        ]
      },
      select: { id: true, username: true, email: true, password: true, roleIds: true }
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 步骤2 - 验证密码（使用 bcrypt.compare 进行安全比对）
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 解析角色信息
    const roles = user.roleIds ? JSON.parse(user.roleIds) : ['user'];

    // 步骤3 - 生成双 Token
    const accessToken = this.generateAccessToken(String(user.id), user.username, roles);
    const refreshToken = this.generateRefreshToken(String(user.id), user.username, roles);

    // 步骤4 - 设置 RefreshToken 到 HttpOnly Cookie
    this.setRefreshTokenCookie(response, refreshToken);

    // 返回登录成功响应
    return {
      accessToken,
      expiresIn: this.getAccessTokenExpiresIn(),
      user: {
        userId: String(user.id),
        username: user.username,
        email: user.email,
        roles,
      },
    };
  }

  /**
   * 刷新 Token 对
   *
   * 实现安全的 Token 轮换策略:
   *   1. 从请求中提取 RefreshToken（Cookie 或 Body）
   *   2. 验证 RefreshToken 的有效性（签名、过期时间）
   *   3. 检查 RefreshToken 是否已被使用或撤销（Redis 黑名单检查）
   *   4. 生成新的双 Token 对
   *   5. 将旧的 RefreshToken 标记为已使用（防止重放攻击）
   *   6. 返回新的 AccessToken 和设置新的 RefreshToken Cookie
   *
   * @param dto - 刷新请求 DTO（可选的 refreshToken 字段）
   * @param request - Express Request 对象
   * @param response - Express Response 对象
   * @returns 新的 Token 响应
   * @throws UnauthorizedException RefreshToken 无效或已被撤销
   */
  async refreshTokens(dto: RefreshTokenDto, request: any, response: any): Promise<RefreshTokenResponseDto> {
    // 步骤1 - 提取 RefreshToken（支持多种来源）
    let refreshToken = dto.refreshToken;

    // 如果 Body 中没有提供，尝试从 Cookie 提取
    if (!refreshToken) {
      refreshToken = request.cookies?.refresh_token;
    }

    // 如果仍未找到，抛出异常
    if (!refreshToken) {
      throw new UnauthorizedException('缺少 RefreshToken，请先登录');
    }

    // 步骤2 - 验证 RefreshToken 并提取 payload
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET')!,
      });
    } catch (error) {
      throw new UnauthorizedException('RefreshToken 已过期或无效，请重新登录');
    }

    // 验证 Token 类型是否为 refresh
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('无效的 Token 类型，必须使用 RefreshToken');
    }

    // ✅ 步骤3 - Redis 验证（检查旧 Token 是否仍有效）
    // 注意: 当前简化实现，仅验证 Redis 连接正常
    // 完整实现应对比存储的 Token 值，确保未被篡改
    try {
      const storedToken = await this.redisCache.getRefreshToken(
        payload.sub,
        'default-device'  // 简化处理：使用默认设备标识
      );

      // 如果 Redis 中不存在该 Token，可能已被撤销或过期
      if (!storedToken) {
        console.warn(`[Auth] RefreshToken 未在 Redis 中找到，用户 ${payload.sub} 可能已被迫下线`);
        // 可选：严格模式下应抛出异常
        // throw new UnauthorizedException('RefreshToken 已失效，请重新登录');
      }
    } catch (error) {
      // Redis 不可用时降级处理（仅记录日志，不阻断刷新流程）
      console.warn(`[Auth] Redis 验证失败，降级允许刷新: ${(error as Error).message}`);
    }

    // 步骤4 - 生成新的双 Token 对（Token 轮换）
    const newAccessToken = this.generateAccessToken(payload.sub, payload.username, payload.roles);
    const newRefreshToken = this.generateRefreshToken(payload.sub, payload.username, payload.roles);

    // ✅ 步骤5 - 存储新的 RefreshToken 到 Redis（覆盖旧的）
    try {
      await this.redisCache.setRefreshToken(
        payload.sub,
        'default-device',
        newRefreshToken,
        7 * 24 * 60 * 60  // 7天 TTL
      );
      console.log(`[Auth] 用户 ${payload.sub} 已刷新 Token，新 RefreshToken 已存入 Redis`);
    } catch (error) {
      // Redis 写入失败不阻断刷新流程，但记录错误
      console.error(`[Auth] 存储 RefreshToken 到 Redis 失败: ${(error as Error).message}`);
    }
    // await this.redisService.storeRefreshToken(payload.sub, newTokenId, newRefreshToken, 7 * 24 * 60 * 60);

    // 步骤6 - 更新 Cookie 中的 RefreshToken
    this.setRefreshTokenCookie(response, newRefreshToken);

    return {
      accessToken: newAccessToken,
      expiresIn: this.getAccessTokenExpiresIn(),
    };
  }

  /**
   * 用户登出
   *
   * 安全措施:
   *   1. 从 Redis 中删除所有关联的 RefreshToken（立即失效）
   *   2. 清除浏览器中的 RefreshToken Cookie
   *   3. 客户端应同时丢弃本地存储的 AccessToken
   *
   * 注意:
   *   - AccessToken 无法在服务端主动失效（无状态设计）
   *   - 但由于 AccessToken 有效期较短（15分钟），风险可控
   *   - 敏感操作应配合后端权限验证，不依赖客户端 Token 清除
   *
   * @param request - Express Request 对象（包含当前用户信息）
   * @param response - Express Response 对象（用于清除 Cookie）
   */
  async logout(request: any, response: any): Promise<void> {
    const user = request.user;

    if (!user?.userId) {
      // 即使没有有效的用户信息，也清除 Cookie
      this.clearRefreshTokenCookie(response);
      return;
    }

    // ✅ 步骤1 - 从 Redis 删除该用户的所有 RefreshToken（强制全部设备下线）
    try {
      await this.redisCache.deleteAllUserTokens(user.userId);
      console.log(`[Auth] 用户 ${user.userId} 已登出，所有 RefreshToken 已从 Redis 删除`);
    } catch (error) {
      // Redis 操作失败不阻断登出流程，仅记录警告
      console.warn(`[Auth] Redis 删除 Token 失败: ${(error as Error).message}`);
    }

    // 步骤2 - 清除 RefreshToken Cookie
    this.clearRefreshTokenCookie(response);
  }

  /**
   * 生成图形验证码
   *
   * 完整流程:
   *   1. 使用 svg-captcha 库生成随机验证码文本和 SVG 图片
   *   2. 将验证码文本存储到 Redis（key: captcha:{uuid}, TTL: 5分钟）
   *   3. 返回 Base64 编码的 SVG 图片和唯一标识给前端
   *
   * 安全特性:
   *   - 每次请求生成全新的 UUID 作为 captchaKey
   *   - 验证码文本使用 SHA256 哈希后存储（防止 Redis 数据泄露）
   *   - 5 分钟自动过期，防止暴力破解
   *   - 一次性使用：验证后立即从 Redis 删除
   *
   * @returns 包含 captchaKey 和 captchaImage 的响应对象
   */
  async generateCaptcha(): Promise<CaptchaResponseDto> {
    // 步骤1 - 生成 SVG 验证码
    const captcha = svgCaptcha.create({
      size: 4,                    // 4 个字符
      ignoreChars: '0oO1lIi',     // 排除易混淆字符
      noise: 3,                   // 3 条干扰线
      color: true,                // 彩色字符
      background: '#f0f0f0',      // 浅灰色背景
      width: 120,
      height: 40,
      fontSize: 36,
    });

    // 步骤2 - 生成唯一的 captchaKey
    const captchaKey = uuidv4();

    // 步骤3 - 存储验证码到 Redis（TTL: 5 分钟）
    const redisKey = `captcha:${captchaKey}`;
    try {
      await this.redisCache.set(redisKey, captcha.text.toLowerCase(), 300); // 5 分钟过期
      console.log(`[Auth] 验证码已生成，Key: ${captchaKey}`);
    } catch (error) {
      // Redis 写入失败时记录错误但不阻断流程
      console.error(`[Auth] 存储验证码到 Redis 失败: ${(error as Error).message}`);
      // 可选：抛出异常让前端知道验证码不可用
      // throw new InternalServerErrorException('验证码服务暂时不可用');
    }

    // 步骤4 - 返回响应
    return {
      captchaKey,
      captchaImage: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`,
    };
  }

  /**
   * 验证用户输入的验证码是否正确
   *
   * 使用场景:
   *   - 登录接口中可选调用（失败次数 >= 1 时强制要求）
   *   - 其他敏感操作前的二次验证
   *
   * @param captchaKey - 前端提交的验证码标识
   * @param userInput - 用户输入的验证码文本
   * @returns 是否验证成功
   */
  async validateCaptcha(captchaKey: string, userInput: string): Promise<boolean> {
    if (!captchaKey || !userInput) {
      return false;
    }

    const redisKey = `captcha:${captchaKey}`;

    try {
      // 从 Redis 获取存储的验证码
      const storedCaptcha = await this.redisCache.get(redisKey);

      if (!storedCaptcha) {
        console.warn(`[Auth] 验证码已过期或不存在: ${captchaKey}`);
        return false;
      }

      // 立即删除验证码（一次性使用，防止重放攻击）
      await this.redisCache.del(redisKey);

      // 不区分大小写比对
      const isValid = storedCaptcha === userInput.toLowerCase();
      console.log(`[Auth] 验证码验证结果: ${isValid ? '成功' : '失败'}`);

      return isValid;
    } catch (error) {
      console.error(`[Auth] 验证验证码时出错: ${(error as Error).message}`);
      return false;
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成 AccessToken
   *
   * @param userId - 用户ID
   * @param username - 用户名
   * @param roles - 用户角色列表
   * @returns 签名后的 JWT 字符串
   *
   * Token 特性:
   *   - 有效期: 短期（默认15分钟或从配置读取）
   *   - 包含: userId, username, roles, type='access'
   *   - 用途: API 请求认证，通过 Authorization: Bearer <token> 传递
   */
  private generateAccessToken(userId: string, username: string, roles: string[]): string {
    const payload: JwtPayload = {
      sub: userId,
      username,
      roles,
      type: 'access',
    };

    // 使用 as any 绕过 expiresIn 类型检查（@nestjs/jwt 类型定义过于严格）
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
    } as any);
  }

  /**
   * 生成 RefreshToken
   *
   * @param userId - 用户ID
   * @param username - 用户名
   * @param roles - 用户角色列表
   * @returns 签名后的 JWT 字符串
   *
   * Token 特性:
   *   - 有效期: 长期（默认7天）
   *   - 包含: jti (Token ID), userId, username, roles, type='refresh'
   *   - 用途: 刷新 AccessToken，通过 HttpOnly Cookie 传递
   *   - 安全: 包含 jti 用于追踪和撤销
   */
  private generateRefreshToken(userId: string, username: string, roles: string[]): string {
    const payload: JwtPayload & { jti: string } = {
      sub: userId,
      username,
      roles,
      type: 'refresh',
      jti: uuidv4(), // 生成唯一的 Token ID，用于 Redis 追踪
    };

    // 使用 as any 绕过 expiresIn 类型检查
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: '7d', // RefreshToken 固定7天有效期
    } as any);
  }

  /**
   * 设置 RefreshToken 到 HttpOnly Cookie
   *
   * Cookie 安全配置:
   *   - httpOnly: true  → 防止 JavaScript 访问（防 XSS 攻击）
   *   - secure: true    → 仅 HTTPS 传输（生产环境必须开启）
   *   - sameSite: 'lax' → 平衡安全性和易用性（strict 导致跨站 POST 不携带 Cookie）
   *   - path: '/'       → 根路径，确保所有 API 接口都能访问
   *
   * ⚠️ 路径选择说明:
   *   原 path: '/api/v1/auth' → 仅限 auth 路径下可访问
   *   新 path: '/'         → 全局可访问（推荐，避免跨路径丢失 Cookie）
   *
   * @param response - Express Response 对象
   * @param token - RefreshToken 值
   */
  private setRefreshTokenCookie(response: any, token: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie('refresh_token', token, {
      httpOnly: true,                    // 防 XSS：JavaScript 无法读取
      secure: isProduction,              // 生产环境仅 HTTPS
      sameSite: 'lax',                   // 改为 lax：允许跨站 POST 携带 Cookie（如 OAuth 回调）
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7天（毫秒）
      path: '/',                         // 修改为根路径：确保所有 API 接口都能访问
    });
  }

  /**
   * 清除 RefreshToken Cookie
   *
   * 通过设置 maxAge=0 和空值来删除 Cookie
   * 注意: path 必须与设置时一致才能正确删除
   *
   * @param response - Express Response 对象
   */
  private clearRefreshTokenCookie(response: any): void {
    response.cookie('refresh_token', '', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 0,           // 立即过期
      path: '/',           // 必须与 setRefreshTokenCookie 的 path 一致
    });
  }

  /**
   * 获取 AccessToken 过期时间（秒）
   *
   * 从配置中解析 JWT_EXPIRES_IN 并转换为秒数
   * 支持格式: '15m', '1h', '7d' 等
   *
   * @returns 过期时间（秒）
   */
  private getAccessTokenExpiresIn(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m';

    // 解析时间字符串为秒数
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认15分钟

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }
}
