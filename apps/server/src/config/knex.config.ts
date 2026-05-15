/**
 * Knex (SQL Query Builder) 配置模块
 * Knex 提供类型安全的 SQL 构建能力，支持多种数据库
 *
 * 本项目使用 mysql2 作为数据库驱动
 *
 * 使用方式:
 *   import { knexConfig } from './config/knex.config';
 *   const knex = require('knex')(knexConfig);
 */

import type { Knex } from 'knex';
import { getEnv } from './env.config';

/**
 * Knex 数据库配置
 * 从 env.config.ts 获取连接参数，确保配置集中管理
 */
export const knexConfig: Knex.Config = {
  // 数据库驱动类型 - MySQL/MariaDB
  client: 'mysql2',

  // 数据库连接配置 - 复用环境变量模块
  connection: {
    host: getEnv().databaseUrl
      ? undefined // 如果使用 DATABASE_URL，由 knex 自动解析
      : (process.env.DB_HOST || 'localhost'),
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'uni_admin',
  },

  // 连接池配置 - 平衡性能与资源占用
  pool: {
    min: 2,   // 最小空闲连接数
    max: 10,  // 最大连接数
  },

  // 数据库迁移配置
  migrations: {
    directory: './migrations',        // 迁移脚本存放目录
    tableName: 'knex_migrations',     // 迁移记录表名
  },

  // 开发环境开启 SQL 调试日志，方便排查问题
  debug: getEnv().appEnv !== 'production',
};
