import { SetMetadata } from '@nestjs/common';

/**
 * 公开路由元数据键名常量
 * 用于在 Reflector 中识别哪些路由需要跳过 JWT 认证
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public 路由装饰器
 *
 * 功能说明:
 *   标记 Controller 或路由方法为公开接口，跳过 JwtAuthGuard 认证
 *
 * 使用场景:
 *   - 登录接口: 用户还未获取 Token，必须公开
 *   - Token 刷新接口: 使用 RefreshToken 而非 AccessToken
 *   - 注册接口: 新用户注册
 *   - 健康检查接口: 监控和负载均衡探测
 *
 * 使用示例:
 *   ```typescript
 *   // 方式1: 在单个路由上使用
 *   @Public()
 *   @Post('login')
 *   login(@Body() dto: LoginDto) { ... }
 *
 *   // 方式2: 在整个 Controller 上使用（所有路由都公开）
 *   @Controller('public')
 *   @Public()
 *   export class PublicController { ... }
 *   ```
 *
 * 实现原理:
 *   使用 SetMetadata 将 { isPublic: true } 元数据附加到路由处理器上
 *   JwtAuthGuard 通过 Reflector 读取此元数据决定是否跳过认证
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
