import type { Middleware } from '../types/middleware.js';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@uni-admin/shared-types';
import { HttpError, BusinessError } from '../types/errors.js';

/** 默认业务成功码列表 */
const DEFAULT_SUCCESS_CODES = [200, 0];

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
 * ### 第二层：业务状态码校验
 * 检查响应体中的 code 字段（假设后端统一返回格式为 `{ code, message, data }`）。
 * 如果 code 不在 successCodes 列表中，抛出 BusinessError。
 *
 * ## 解包逻辑
 * 校验通过后，将 response.data 从 `{ code, message, data }` 提取为真正的 `data` 字段，
 * 让调用方直接拿到业务数据，无需关心响应包装结构。
 *
 * ## 特殊情况
 * - `returnBlob: true` → 跳过解包（文件下载场景）
 * - `returnRawResponse: true` → 跳过解包（需要完整响应的场景）
 * - 已有错误 → 直接返回（不覆盖上游设置的 error）
 */
export function createUnpackMiddleware(): Middleware {
  return async (ctx) => {
    // 先穿透到下游中间件（error → log.response），等待 HTTP 请求完成
    await ctx.next();

    // 如果已经有错误或没有响应，直接返回
    if (ctx.error || !ctx.response) return;

    const response = ctx.response;
    const internal = ctx.config._internal;

    // 特殊模式：返回 Blob 数据（如文件下载），跳过解包
    if (internal?.returnBlob) return;

    // 特殊模式：返回原始 Axios 响应（如需要访问 headers/status），跳过解包
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

    // ===== 第二层校验：业务状态码 =====
    const responseData = response.data as ApiResponse<unknown>;
    const successCodes = internal?.successCodes ?? DEFAULT_SUCCESS_CODES;

    // 如果业务 code 不在成功码列表中，视为业务错误
    if (!successCodes.includes(responseData.code)) {
      ctx.error = new BusinessError(
        responseData.message || '业务处理失败',
        responseData.code,
        responseData.data,
      );
      return;
    }

    // ===== 解包：提取真正的业务数据 =====
    // 将 response.data 从 { code, message, data } 替换为 data 字段的值
    response.data = responseData.data;
  };
}
