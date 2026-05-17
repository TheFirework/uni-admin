/**
 * HttpExceptionFilter - 全局 HTTP 异常过滤器
 *
 * 职责:
 *   1. 捕获所有未处理的异常，统一输出标准错误响应格式
 *   2. 区分 HttpException、ValidationError（class-validator）、未知异常
 *   3. 生产环境隐藏堆栈信息（仅记录到日志文件）
 *
 * 统一错误响应格式:
 *   {
 *     success: false,              // 统一标记为失败
 *     code: 401 | "INVALID_SIGNATURE",  // HTTP 状态码 或 自定义业务错误码
 *     message: "操作失败",            // 用户可读的错误描述
 *     details: [...],                // 可选：校验错误详情数组
 *     timestamp: "2026-05-15T...",   // ISO 时间戳
 *     path: "/api/auth/login"        // 请求路径
 *   }
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { getConfig } from '../../config/env.config.js';
import { LoggerService as AppLoggerService } from '../logger/logger.service.js';

/** 统一错误响应体结构 */
export interface ErrorResponse {
  /** 标记为失败响应 */
  success: false;
  /** 业务错误码（HTTP 状态码数字 或 自定义业务码字符串） */
  code: number | string;
  /** 用户可读消息 */
  message: string;
  /** 校验错误详情（仅 ValidationError 时存在） */
  details?: ValidationErrorDetail[];
  /** ISO 时间戳 */
  timestamp: string;
  /** 请求路径 */
  path: string;
}

/** 校验错误详情项 */
export interface ValidationErrorDetail {
  /** 校验失败的字段名 */
  field: string;
  /** 错误原因 */
  message: string;
}

/**
 * 异常类型到 { httpStatus, businessCode } 的映射表
 * 用于将不同类型的异常转换为统一的业务错误响应
 *
 * 注意：code 字段统一使用 HTTP 状态码数字格式
 */
const EXCEPTION_MAP: Record<string, { status: HttpStatus; code: number }> = {
  // HTTP 标准异常 → 业务错误码映射
  // 注意：使用完整的 NestJS 异常类名
  BadRequestException: { status: HttpStatus.BAD_REQUEST, code: 400 },
  UnauthorizedException: { status: HttpStatus.UNAUTHORIZED, code: 401 },
  ForbiddenException: { status: HttpStatus.FORBIDDEN, code: 403 },
  NotFoundException: { status: HttpStatus.NOT_FOUND, code: 404 },
  MethodNotAllowedException: { status: HttpStatus.METHOD_NOT_ALLOWED, code: 405 },
  UnprocessableEntityException: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 422,
  },
  TooManyRequestsException: { status: HttpStatus.TOO_MANY_REQUESTS, code: 429 },
};

/**
 * 基于 HTTP 状态码的兜底映射
 * 当异常类名无法匹配时，使用状态码作为 code
 */
const STATUS_CODE_MAP: Record<number, number> = {
  [HttpStatus.BAD_REQUEST]: 400,
  [HttpStatus.UNAUTHORIZED]: 401,
  [HttpStatus.FORBIDDEN]: 403,
  [HttpStatus.NOT_FOUND]: 404,
  [HttpStatus.METHOD_NOT_ALLOWED]: 405,
  [HttpStatus.UNPROCESSABLE_ENTITY]: 422,
  [HttpStatus.TOO_MANY_REQUESTS]: 429,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) { }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const config = getConfig();

    let status: HttpStatus;
    let errorResponse: ErrorResponse;

    // ====== 分支 1: NestJS HttpException (含自定义业务异常) ======
    if (exception instanceof HttpException) {
      const result = this.handleHttpException(exception, request);
      status = result.status;
      errorResponse = result.body;

      // 记录服务端异常到日志（4xx 不记录 error 级别）
      if (status >= 500) {
        this.logger.error(`[HttpException] ${request.method} ${request.url}`, {
          path: request.url,
          method: request.method,
          statusCode: status,
          stack: exception.stack,
        });
      }
    }
    // ====== 分支 2: class-validator ValidationError 数组 ======
    else if (this.isValidationErrorArray(exception)) {
      status = HttpStatus.BAD_REQUEST;
      errorResponse = this.handleValidationErrors(
        exception as ValidationError[],
        request
      );
    }
    // ====== 分支 3: 未知异常（兜底） ======
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.handleUnknownError(exception, request, config.appEnv);

      // 未知异常必须记录完整堆栈
      this.logger.error(`[UnknownError] ${request.method} ${request.url}`, {
        path: request.url,
        method: request.method,
        statusCode: status,
        stack: exception instanceof Error ? exception.stack : String(exception),
        error: exception instanceof Error ? exception.message : String(exception),
      });
    }

    // 输出统一格式的 JSON 响应
    response.status(status).json(errorResponse);
  }

  /**
   * 处理 HttpException 类型异常
   * 从 EXCEPTION_MAP 中查找对应的状态码和业务错误码
   * 如果类名无法匹配，则基于 HTTP 状态码进行兜底匹配
   */
  private handleHttpException(
    exception: HttpException,
    request: Request
  ): { status: HttpStatus; body: ErrorResponse } {
    const status = exception.getStatus();
    const exceptionName = exception.constructor.name;

    const exceptionResponse = exception.getResponse();
    const exceptionBody =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : null;

    // 保留异常自带的 code：
    // 1) SignAuthGuard 场景：code 为 string 类型（如 'INVALID_SIGNATURE'）
    // 2) BusinessException 场景：body 包含 success: false，code 为业务错误码数字
    const hasCustomCode =
      (exceptionBody && typeof exceptionBody.code === 'string') ||
      (exceptionBody && exceptionBody.success === false);

    let mapped = EXCEPTION_MAP[exceptionName];

    if (!mapped) {
      const code = STATUS_CODE_MAP[status] || 500;
      mapped = { status, code };
    }

    const code: number | string =
      hasCustomCode && exceptionBody
        ? (exceptionBody.code as number | string)
        : mapped.code;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionBody?.message ||
        exception.message ||
        '服务器内部错误';

    return {
      status: mapped.status,
      body: {
        success: false,
        code,
        message: Array.isArray(message) ? message.join('; ') : String(message),
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };
  }

  /**
   * 处理 class-validator 校验错误
   * 将嵌套的 ValidationError 扁平化为可读的 details 数组
   */
  private handleValidationErrors(
    errors: ValidationError[],
    request: Request
  ): ErrorResponse {
    // 递归提取校验错误信息
    const details: ValidationErrorDetail[] = [];
    const extractErrors = (
      validationErrors: ValidationError[],
      prefix = ''
    ) => {
      for (const error of validationErrors) {
        // 构建字段路径（支持嵌套对象: user.name）
        const field = prefix ? `${prefix}.${error.property}` : error.property;

        if (error.constraints && Object.keys(error.constraints).length > 0) {
          // 有约束错误 → 提取所有约束消息
          details.push({
            field,
            message: Object.values(error.constraints).join(', '),
          });
        }

        // 递归处理子级校验错误（嵌套对象）
        if (error.children && error.children.length > 0) {
          extractErrors(error.children, field);
        }
      }
    };

    extractErrors(errors);

    return {
      success: false,
      code: 422,
      message: '请求参数校验失败',
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  /**
   * 处理未知异常（兜底逻辑）
   * 生产环境下隐藏具体错误细节，防止敏感信息泄露
   */
  private handleUnknownError(
    exception: unknown,
    request: Request,
    appEnv: string
  ): ErrorResponse {
    const isProduction = appEnv === 'production';

    return {
      success: false,
      code: 500,
      message: isProduction ? '服务器内部错误，请稍后重试' : `未知异常: ${String(exception)}`,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  /**
   * 判断是否为 class-validator 的 ValidationError 数组
   * 当全局 ValidationPipe 未捕获时，异常可能是 ValidationError[]
   */
  private isValidationErrorArray(exception: unknown): boolean {
    if (!Array.isArray(exception)) return false;
    return (
      exception.length > 0 &&
      typeof exception[0] === 'object' &&
      exception[0] !== null &&
      'property' in exception[0] &&
      'constraints' in exception[0]
    );
  }
}
