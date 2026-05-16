/**
 * Winston 日志配置模块
 * 基于 winston 库的统一日志管理方案
 *
 * 使用方式:
 *   import { getWinstonConfig } from './config/winston.config';
 *   const logger = createLogger(getWinstonConfig());
 */

import * as winston from 'winston';
import { getConfig } from './env.config.js';

const { combine, timestamp, colorize, json, printf } = winston.format;

const customTimestamp = winston.format((info) => {
  if (info.timestamp) {
    const date = new Date(info.timestamp as string | number);
    info.timestamp = date.toISOString().replace('T', ' ').slice(0, 19);
  }
  return info;
});

const devLogFormat = printf(({ timestamp, level, context, message }) => {
  return `${timestamp} [${level}] [${context}]: ${message}`;
});

export function getWinstonConfig(): winston.LoggerOptions {
  const config = getConfig();
  const isProduction = config.appEnv === 'production';
  const logDir = 'logs';

  return {
    level: isProduction ? 'info' : 'debug',
    format: isProduction
      ? combine(timestamp(), json())
      : combine(customTimestamp(), colorize(), devLogFormat),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: `${logDir}/app-%DATE%.log`,
        dirname: logDir,
        maxsize: 20 * 1024 * 1024,
        maxFiles: 30,
        tailable: true,
      }),
      new winston.transports.File({
        filename: `${logDir}/error-%DATE%.log`,
        dirname: logDir,
        level: 'error',
        maxsize: 20 * 1024 * 1024,
        maxFiles: 30,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: `${logDir}/exceptions-%DATE%.log` }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: `${logDir}/rejections-%DATE%.log` }),
    ],
  };
}
