import type { Middleware } from '../types/middleware.js';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@uni-admin/shared-types';
import { HttpError, BusinessError } from '../types/errors.js';

/**
 * 创建响应解包中间件
 *
 * ## 核心职责
 * 在 HTTP 请求完成后，执行双层状态码校验并自动解包响应数据。
 *
 * ## 双层校验机制
 * ### 第一层：HTTP 状态码校验
 * 检查 axios 返回的 status 字段，范围 [200, 300) 为合法。
 * 不在此范围则抛出 HttpError。
 *
 * ### 第二层：业务 success 字段校验
 * 检查响应体中的 success 字段（统一响应格式为 `{ success, code, message, data }`）。
 * 如果 success !== true，则抛出 BusinessError（从 responseData.code 取业务错误码）。
 *
 * ## 解包逻辑
 * 校验通过后，将 response.data 从 `{ success, code, message, data }` 提取为真正的 `data` 字段值，
 * 让调用方直接拿到业务数据，无需关心响应包装结构。
 *
 * ## 特殊情况
 * - `returnBlob: true` → 跳过解包（文件下载场景）
 * - `returnRawResponse: true` → 跳过解包（需要完整响应的场景）
 * - 已有错误 → 直接返回（不覆盖上游设置的 error）
 */
export function createUnpackMiddleware(): Middleware {
  return async (ctx) => {
    await ctx.next();

    if (ctx.error || !ctx.response) return;

    const response = ctx.response;
    const internal = ctx.config._internal;

    if (internal?.returnBlob) return;
    if (internal?.returnRawResponse) return;

    // ===== 第一层校验：HTTP 状态码 =====
    if (response.status < 200 || response.status >= 300) {
      ctx.error = new HttpError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        response.data,
      );
      return;
    }

    // ===== 第二层校验：业务 success 字段 =====
    const responseData = response.data as ApiResponse<unknown>;

    if (responseData.success !== true) {
      ctx.error = new BusinessError(
        responseData.message || '业务处理失败',
        responseData.code as number,
        responseData.data,
      );
      return;
    }

    // ===== 解包：提取真正的业务数据 =====
    response.data = responseData.data;
  };
}
