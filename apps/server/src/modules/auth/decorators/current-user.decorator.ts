import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器工厂函数的参数接口
 */
export interface CurrentUserOptions {
  /** 是否要求用户必须已登录（默认: true） */
  required?: boolean;
}

/**
 * CurrentUser 自定义参数装饰器
 *
 * 功能说明:
 *   从 Request 对象中提取当前登录用户的信息
 *   由 JwtStrategy.validate() 方法注入到 request.user 中
 *
 * 数据结构（request.user 的类型）:
 * ```typescript
 * interface CurrentUserPayload {
 *   userId: string;        // 用户唯一标识
 *   username: string;      // 用户名
 *   roles: string[];       // 用户角色列表 ['admin', 'user']
 *   iat: number;           // Token 签发时间戳
 *   exp: number;           // Token 过期时间戳
 * }
 * ```
 *
 * 使用示例:
 * ```typescript
 *   // 必须登录（默认行为）
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: any) {
 *     console.log(user.userId);     // 当前用户ID
 *     console.log(user.username);   // 当前用户名
 *     console.log(user.roles);      // 用户角色
 *   }
 *
 *   // 可选登录（用户可能未登录）
 *   @Get('optional')
 *   getData(@CurrentUser({ required: false }) user?: any) {
 *     if (user) {
 *       // 已登录用户的逻辑
 *     } else {
 *       // 未登录用户的逻辑
 *     }
 *   }
 * ```
 *
 * 实现原理:
 *   createParamDecorator 创建自定义装饰器
 *   从 ExecutionContext 中提取 Request 对象
 *   返回 request.user 属性（由 Passport 注入）
 */
export const CurrentUser = createParamDecorator(
  (data: CurrentUserOptions | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有提供选项或 required 为 true（默认），则要求必须有用户信息
    const isRequired = data?.required !== false;

    // 当要求必须登录但用户不存在时，返回 null 或 undefined
    // 注意: 此处不抛出异常，让 JwtAuthGuard 处理认证逻辑
    if (!user && isRequired) {
      return null;
    }

    return user;
  },
);
