import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 认证守卫
 *
 * 功能说明:
 *   1. 继承 AuthGuard('jwt')，使用 JwtStrategy 进行 Token 验证
 *   2. 支持通过 @Public() 装饰器跳过认证（用于登录、刷新等公开接口）
 *   3. 提供清晰的错误消息区分"缺少 Token"和"无效 Token"
 *
 * 使用方式:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user) { ... }
 *
 * 配合使用:
 *   - @Public() 装饰器: 标记接口为公开，跳过此守卫
 *   - @CurrentUser() 装饰器: 从 request.user 提取当前用户信息
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * 请求拦截处理
   *
   * @param context - 执行上下文，包含请求和响应对象
   * @returns 返回 true 表示认证通过，或抛出异常阻止请求
   *
   * 执行流程:
   *   1. 检查路由是否标记为 @Public()，如果是则直接放行
   *   2. 调用父类 AuthGuard 的 canActivate 进行 JWT 验证
   *   3. 捕获异常并转换为友好的错误消息
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查当前路由或控制器是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),     // 方法级别的 @Public()
      context.getClass(),       // 类级别的 @Public()
    ]);

    // 如果是公开接口，直接放行，不进行 Token 验证
    if (isPublic) {
      return true;
    }

    // 调用父类方法执行实际的 JWT 验证
    // 父类会自动调用 JwtStrategy.validate() 方法
    const result = await super.canActivate(context);

    // 如果验证失败，抛出带有明确信息的未授权异常
    if (!result) {
      throw new UnauthorizedException('无效的访问令牌，请重新登录');
    }

    return result as boolean;
  }

  /**
   * 异常处理回调
   *
   * 当 Passport 认证失败时调用，用于自定义错误消息
   *
   * @param error - 原始错误对象
   * @returns 标准化的 UnauthorizedException
   *
   * 错误场景:
   *   - No auth token: 请求头中未提供 Authorization 字段
   *   - jwt expired: Token 已过期
   *   - jwt malformed: Token 格式错误
   */
  handleRequest(err: any, user: any, info: any) {
    // 如果存在系统级错误，直接抛出
    if (err) {
      throw err;
    }

    // 根据 Passport 提供的错误信息返回不同的提示
    if (info instanceof Error) {
      const errorMessage = this.getErrorMessage(info);
      throw new UnauthorizedException(errorMessage);
    }

    // 如果用户对象不存在，说明认证失败
    if (!user) {
      throw new UnauthorizedException('无效的访问令牌，请重新登录');
    }

    // 认证成功，返回用户对象
    return user;
  }

  /**
   * 解析 Passport 错误信息并返回中文提示
   *
   * @param info - Passport 错误信息对象
   * @returns 用户友好的中文错误消息
   */
  private getErrorMessage(info: Error): string {
    const message = info.message || '';

    switch (message) {
      case 'No auth token':
        return '缺少访问令牌，请在请求头中提供 Authorization: Bearer <token>';
      case 'jwt expired':
        return '访问令牌已过期，请使用 RefreshToken 刷新或重新登录';
      case 'jwt malformed':
        return '令牌格式错误，请检查 Token 格式是否正确';
      default:
        return `认证失败: ${message}`;
    }
  }
}
