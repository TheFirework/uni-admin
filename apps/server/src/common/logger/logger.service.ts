/**
 * LoggerService - 基于 Winston 的结构化日志服务
 *
 * 职责:
 *   1. 封装 winston logger 实例，提供 NestJS Logger 接口兼容
 *   2. 支持结构化元数据 (traceId, userId 等)，便于链路追踪
 *   3. 自动记录调用模块名称 (context 参数)
 *
 * 使用方式:
 *   constructor(private readonly logger: LoggerService) {}
 *   this.logger.log('info', '用户登录成功', { traceId: 'xxx', userId: 123 });
 */

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import { getConfig } from '../../config/env.config.js';

/** 结构化日志元数据接口 */
export interface LogMetadata {
  /** 链路追踪 ID，用于关联同一请求的所有日志 */
  traceId?: string;
  /** 操作用户 ID */
  userId?: number | string;
  /** 客户端 IP 地址 */
  ip?: string;
  /** 请求路径 */
  path?: string;
  /** HTTP 方法 */
  method?: string;
  /** 自定义扩展字段 */
  [key: string]: unknown;
}

/**
 * 根据当前环境构建 winston 日志格式
 * 开发环境使用彩色控制台输出，生产环境使用 JSON 格式
 */
function buildLogFormat() {
  const config = getConfig();

  if (config.appEnv === 'production') {
    // 生产环境：纯 JSON 格式，便于 ELK/日志平台采集解析
    return format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.json()
    );
  }

  // 开发环境：彩色可读格式
  return format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, context, ...meta }) => {
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      const ctxStr = context ? ` [${context}]` : '';
      return `${timestamp} ${level}${ctxStr} ${message}${metaStr}`;
    })
  );
}

@Injectable()
export class LoggerService implements NestLoggerService {
  /** 内部 winston 实例 */
  private readonly logger: Logger;

  constructor() {
    const config = getConfig();
    const isProduction = config.appEnv === 'production';

    this.logger = createLogger({
      level: isProduction ? 'info' : 'debug',
      format: buildLogFormat(),
      defaultMeta: { service: 'uni-admin-server' },
      transports: [
        new transports.Console(),
        ...(isProduction
          ? [
              new transports.File({
                filename: 'logs/app-error.log',
                level: 'error',
                maxsize: 5242880,
                maxFiles: 5,
              }),
              new transports.File({
                filename: 'logs/app-combined.log',
                maxsize: 5242880,
                maxFiles: 5,
              }),
            ]
          : []),
      ],
    exceptionHandlers:
      isProduction
        ? [new transports.File({ filename: 'logs/app-exceptions.log' })]
        : undefined,
    rejectionHandlers:
      isProduction
        ? [new transports.File({ filename: 'logs/app-rejections.log' })]
        : undefined,
    });
  }

  /**
   * 记录通用日志
   * @param message - 日志消息内容
   * @param meta - 可选的结构化元数据
   */
  log(message: string, ...optionalParams: [...unknown[]]): void;
  log(message: string, meta?: LogMetadata | string, ...optionalParams: unknown[]): void {
    this.logger.info(message, this.resolveParams(meta, optionalParams));
  }

  /**
   * 记录错误日志
   * 通常用于捕获异常、业务逻辑错误等需要关注的情况
   */
  error(message: string, ...optionalParams: [...unknown[]]): void;
  error(message: string, meta?: LogMetadata | string | Error, ...optionalParams: unknown[]): void {
    this.logger.error(message, this.resolveParams(meta, optionalParams));
  }

  /**
   * 记录警告日志
   * 用于潜在问题、降级策略触发等场景
   */
  warn(message: string, ...optionalParams: [...unknown[]]): void;
  warn(message: string, meta?: LogMetadata | string, ...optionalParams: unknown[]): void {
    this.logger.warn(message, this.resolveParams(meta, optionalParams));
  }

  /**
   * 记录调试日志
   * 仅在开发环境或显式开启 debug 级别时输出
   */
  debug(message: string, ...optionalParams: [...unknown[]]): void;
  debug(message: string, meta?: LogMetadata | string, ...optionalParams: unknown[]): void {
    this.logger.debug(message, this.resolveParams(meta, optionalParams));
  }

  /**
   * 记录详细日志
   * 比 debug 更详细的跟踪信息，通常用于性能分析
   */
  verbose(message: string, ...optionalParams: [...unknown[]]): void;
  verbose(message: string, meta?: LogMetadata | string, ...optionalParams: unknown[]): void {
    this.logger.verbose(message, this.resolveParams(meta, optionalParams));
  }

  /**
   * 解析可选参数，统一合并为 winston 可接受的元数据格式
   *
   * 设计说明：
   *   NestJS Logger 接口的签名是 (message, ...optionalParams)
   *   我们约定第一个 optionalParam 可以是字符串(context) 或对象(metadata)
   */
  private resolveParams(
    metaOrContext: unknown,
    restParams: unknown[]
  ): Record<string, unknown> {
    // 无参数时返回空对象
    if (!metaOrContext && restParams.length === 0) {
      return {};
    }

    // 第一个参数是字符串 → 视为 context（模块名）
    if (typeof metaOrContext === 'string') {
      return { context: metaOrContext };
    }

    // 第一个参数是 Error 对象 → 提取堆栈信息
    if (metaOrContext instanceof Error) {
      return {
        ...(metaOrContext as object),
        stack: metaOrContext.stack,
        message: metaOrContext.message,
      };
    }

    // 第一个参数是普通对象 → 视为元数据
    if (typeof metaOrContext === 'object' && metaOrContext !== null) {
      const result = { ...(metaOrContext as Record<string, unknown>) };

      // 如果后续参数中还有字符串，优先作为 context
      for (const param of restParams) {
        if (typeof param === 'string' && !result.context) {
          result.context = param;
        }
      }

      return result;
    }

    return {};
  }
}
