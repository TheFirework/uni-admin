/**
 * LoggingInterceptor - HTTP 请求日志拦截器
 *
 * 职责:
 *   1. 记录每个 HTTP 请求的入参、响应耗时、状态码
 *   2. 输出结构化 JSON 日志，便于日志平台采集分析
 *   3. 根据响应状态码动态调整日志级别:
 *      - 5xx → error（服务端异常，需立即关注）
 *      - 4xx → warn（客户端错误，可能存在异常调用）
 *      - 其他 → info（正常请求）
 *
 * 日志输出示例 (JSON):
 *   {
 *     "method": "POST",
 *     "url": "/api/v1/users",
 *     "statusCode": 201,
 *     "responseTime": 123,
 *     "ip": "127.0.0.1"
 *   }
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  LoggerService,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { LoggerService as AppLoggerService } from '../logger/logger.service.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 记录请求开始时间（毫秒级时间戳）
    const startTime = Date.now();

    // 提取请求基本信息
    const { method, url, ip, headers } = request;

    // 使用 tap 操作符在响应完成时记录日志
    return next.handle().pipe(
      tap({
        // 响应成功或失败都会触发（finally 语义）
        next: () => this.logRequest(startTime, method, url, response.statusCode ?? 200, ip ?? ''),
        complete: () => {
          // complete 在正常结束时也会触发，与 next 有重叠
          // 这里保留空实现，实际日志已在 next 中输出
        },
        error: (err) => {
          // 异常情况：尝试从 err 对象获取状态码
          const statusCode = (err.status || err.response?.statusCode || 500) as number;
          this.logRequest(startTime, method, url, statusCode, ip ?? '');
        },
      })
    );
  }

  /**
   * 核心日志输出方法
   *
   * 根据状态码选择日志级别并输出结构化信息
   */
  private logRequest(
    startTime: number,
    method: string,
    url: string,
    statusCode: number,
    ip: string
  ): void {
    // 计算响应耗时（毫秒）
    const responseTime = Date.now() - startTime;

    // 根据状态码动态选择日志级别
    if (statusCode >= 500) {
      this.logger.error(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
        method,
        url,
        statusCode,
        responseTime,
        ip,
      });
    } else if (statusCode >= 400) {
      this.logger.warn(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
        method,
        url,
        statusCode,
        responseTime,
        ip,
      });
    } else {
      this.logger.log(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
        method,
        url,
        statusCode,
        responseTime,
        ip,
      });
    }
  }
}
