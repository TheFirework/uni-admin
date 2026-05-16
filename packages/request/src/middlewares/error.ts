import type { Middleware } from '../types/middleware.js';
import type { AuthLockManager } from '../managers/AuthLockManager.js';
import type { ErrorNotifier } from '../types/notifier.js';
import { CancelError, isCancelError } from '../types/errors.js';

/** 安全地将 unknown 转为可索引对象（用于属性检查） */
function asIndexable(error: unknown): Record<string, unknown> {
  return error as unknown as Record<string, unknown>;
}

/**
 * 类型守卫：判断是否为 HTTP 错误（带 status 属性）
 */
function isHttpError(error: unknown, status?: number): error is Error & { status?: number } {
  if (!(error instanceof Error)) return false;

  const record = asIndexable(error);
  // 检查是否有 status 属性且为数字类型
  if ('status' in record && typeof record.status === 'number') {
    if (status !== undefined) {
      return record.status === status;
    }
    return true;
  }
  return false;
}

/**
 * 类型守卫：判断是否为业务错误（带 code 属性）
 */
function isBusinessError(error: unknown): error is Error & { code: number; message: string } {
  const record = asIndexable(error);
  return (
    error instanceof Error &&
    'code' in record &&
    typeof record.code === 'number'
  );
}

/**
 * 类型守卫：判断是否为超时错误
 */
function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const record = asIndexable(error);
  return (
    error.message.includes('timeout') ||
    error.message.includes('ECONNABORTED') ||
    record.code === 'ECONNABORTED'
  );
}

/**
 * HTTP 状态码 → 中文错误消息映射表
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  403: '没有权限访问该资源',
  404: '请求的资源不存在',
  429: '操作过于频繁，请稍后再试',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时',
};

/**
 * 创建全局错误处理中间件
 *
 * ## 核心设计
 * 作为管道的**全局错误边界**，使用 try/catch 包裹 `ctx.next()`，
 * 对所有异常进行统一分类和处理。
 *
 * ## 错误分类与处理策略
 *
| 错误类型 | 判断条件 | 处理方式 |
|---------|---------|---------|
| **取消错误** | isCancelError() 或 name='CancelError' | 静默忽略，不提示用户 |
| **401 未授权** | HTTP 状态码 401 | 触发 Token 刷新/跳转登录 |
| **业务错误** | BusinessError（有 code 字段） | 显示后端返回的错误消息 |
| **HTTP 错误** | 4xx/5xx 状态码 | 显示对应中文提示 |
| **超时错误** | timeout / ECONNABORTED | 显示"请求超时"提示 |
| **网络错误** | 无 response 的 Error | 显示"网络连接失败"提示 |
| **其他** | 未知错误 | 显示默认提示 |
 *
 * ## 配置控制
 * - `showError: false` → 跳过所有错误提示
 * - `skipErrorHandler: true` → 跳过错误处理（完全由调用方自行处理）
 *
 * @param authLockManager - 认证锁管理器（处理 401 场景）
 * @param errorNotifier - 错误通知器（UI 提示实现）
 */
export function createErrorMiddleware(
  authLockManager: AuthLockManager,
  errorNotifier: ErrorNotifier,
): Middleware {
  return async (ctx) => {
    try {
      // 使用 try/catch 包裹下游中间件（log.response），捕获所有未处理的异常
      await ctx.next();
    } catch (err) {
      // 将异常记录到上下文，避免丢失
      ctx.error = err;
    }

    // 如果没有错误，直接返回
    if (!ctx.error) return;

    const error = ctx.error;

    // ===== 1. 取消错误：静默处理 =====
    if (isCancelError(error) || (error instanceof Error && error.name === 'CancelError')) {
      return;
    }

    // ===== 2. 401 未授权：触发认证流程（排除登录等业务接口） =====
    if (isHttpError(error, 401)) {
      // 检查是否跳过认证跳转（如登录接口的 401 是业务错误，不应跳转）
      if (!ctx.config._internal?.skipAuthRedirect) {
        await authLockManager.handle401();
      }
      return;
    }

    // ===== 3. 检查配置：是否跳过错误提示 =====
    if (ctx.config._internal?.showError === false || ctx.config._internal?.skipErrorHandler) {
      return;
    }

    // ===== 4. 根据错误类型生成用户友好的消息 =====
    let message = '请求失败';

    if (isBusinessError(error)) {
      // 业务错误：直接使用后端返回的消息
      message = error.message;
    } else if (isHttpError(error)) {
      // HTTP 错误：根据状态码查找中文消息
      const record = asIndexable(error);
      const status = record.status as number;
      message = HTTP_ERROR_MESSAGES[status] || `请求失败 (${status})`;
    } else if (isTimeoutError(error)) {
      // 超时错误
      message = '请求超时，请稍后重试';
    } else if (error instanceof Error && !('response' in asIndexable(error))) {
      // 网络错误（无 response 属性，说明根本没收到服务端响应）
      message = '网络连接失败，请检查网络';
    }

    // ===== 5. 通过通知器展示错误消息 =====
    errorNotifier.error(message);
  };
}
