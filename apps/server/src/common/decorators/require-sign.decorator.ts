/**
 * RequireSign - 签名验证装饰器
 *
 * 用于标记需要请求签名验证的 Controller 或 Handler。
 * 与 SignAuthGuard 配合使用，实现按需启用签名验证能力。
 *
 * 使用方式:
 *
 *   方式 1: 标记在单个路由方法上（仅该接口需要签名）
 *   @Controller('webhook')
 *   export class WebhookController {
 *     @Post('callback')
 *     @RequireSign()
 *     @UseGuards(SignAuthGuard)
 *     handleCallback(@Body() dto: CallbackDto) {
 *       return { success: true };
 *     }
 *   }
 *
 *   方式 2: 标记在 Controller 类上（该控制器下所有接口都需要签名）
 *   @RequireSign()
 *   @UseGuards(SignAuthGuard)
 *   @Controller('api/pay')
 *   export class PaymentController {
 *     @Post('create')
 *     createOrder() {}
 *
 *     @Post('refund')
 *     refundOrder() {}
 *   }
 *
 *   方式 3: 混合使用（类级别开启，个别方法关闭）
 *   @RequireSign()
 *   @UseGuards(SignAuthGuard)
 *   @Controller('api/secure')
 *   export class SecureController {
 *     @Get('data')
 *     getData() {}
 *
 *     @Get('public')
 *     @RequireSign(false)
 *     getPublicData() {}
 *   }
 *
 * 签名 Header 要求:
 *   X-Sign:      HMAC-SHA256 签名值（十六进制小写）
 *   X-Timestamp: Unix 时间戳（秒或毫秒）
 *   X-Nonce:      随机字符串（防重放）
 */

import { SetMetadata } from '@nestjs/common';

/** 元数据 Key 常量，与 SignAuthGuard 中读取的 key 保持一致 */
export const REQUIRE_SIGN_KEY = 'requireSign' as const;

/**
 * 标记当前路由是否需要签名验证
 * @param enabled - 是否启用签名验证，默认 true
 */
export const RequireSign = (enabled = true) =>
  SetMetadata(REQUIRE_SIGN_KEY, enabled);
