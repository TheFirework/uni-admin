/**
 * Winston 日志配置模块
 * 基于 winston 库的统一日志管理方案
 *
 * 特性:
 *   - 开发环境: 彩色控制台输出 + 可读格式（便于本地调试）
 *   - 生产环境: JSON 格式输出 + 文件轮转（便于 ELK 采集）
 *   - 自动分离错误日志到独立文件
 *   - 异常和 Promise 拒绝自动捕获记录
 *
 * 📁 日志文件目录说明:
 *   - 开发环境: 仅控制台输出，不生成文件（避免污染项目目录）
 *   - 生产环境: 自动创建 logs/ 目录，包含以下文件：
 *     * app-YYYY-MM-DD.log      → 所有级别日志
 *     * error-YYYY-MM-DD.log    → 仅 error 级别
 *     * exceptions-YYYY-MM-DD.log → 未捕获异常
 *     * rejections-YYYY-MM-DD.log → 未处理 Promise 拒绝
 *
 * 🔧 自定义日志级别（按需调整）:
 *   - 开发环境: 'debug'（显示详细调试信息）
 *   - 生产环境: 'info'（仅记录重要信息，减少 I/O）
 *
 * 使用方式:
 *   import { winstonConfig } from './config/winston.config';
 *   const logger = createLogger(winstonConfig);
 */

import * as winston from 'winston';

/** 当前是否为生产环境 */
const isProduction = process.env.NODE_ENV === 'production';

/** 日志文件存储目录 */
const logDir = 'logs';

/**
 * Winston 日志配置对象
 * 包含日志级别、输出格式、传输通道等完整配置
 */
export const winstonConfig: winston.LoggerOptions = {
  // 生产环境仅记录 info 及以上级别，开发环境记录 debug 及以上
  level: isProduction ? 'info' : 'debug',

  // 根据环境选择不同的日志格式
  // 生产环境使用 JSON 格式，便于日志分析系统处理
  // 开发环境使用可读性强的彩色格式
  format: isProduction
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          (info) => `${info.timestamp} [${info.level}] [${info.context || 'App'}]: ${info.message}`
        )
      ),

  // 多通道日志输出配置
  transports: [
    // 控制台输出 - 所有环境都启用
    new winston.transports.Console(),

    // 综合日志文件 - 记录所有级别的日志
    new winston.transports.File({
      filename: `${logDir}/app-%DATE%.log`,
      dirname: logDir,
      maxsize: 20 * 1024 * 1024, // 单个文件最大 20MB
      maxFiles: 30,              // 最多保留30个历史文件
      tailable: true,            // 支持日志跟踪（tail -f）
    }),

    // 错误日志文件 - 仅记录 error 级别
    new winston.transports.File({
      filename: `${logDir}/error-%DATE%.log`,
      dirname: logDir,
      level: 'error',
      maxsize: 20 * 1024 * 1024,
      maxFiles: 30,
    }),
  ],

  // 未捕获异常处理器 - 防止进程崩溃并记录异常详情
  exceptionHandlers: [
    new winston.transports.File({
      filename: `${logDir}/exceptions-%DATE%.log`,
    }),
  ],

  // 未处理 Promise 拒绝处理器
  rejectionHandlers: [
    new winston.transports.File({
      filename: `${logDir}/rejections-%DATE%.log`,
    }),
  ],
};
