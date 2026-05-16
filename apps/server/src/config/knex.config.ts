/**
 * Knex (SQL Query Builder) 配置工厂
 * 从统一配置构建数据库连接参数
 *
 * 使用方式:
 *   import { createKnexConfig } from './config/knex.config';
 *   const knexCfg = createKnexConfig(getConfig());
 */

import type { Knex } from 'knex';
import type { ValidatedConfig } from './env.validation.js';

export function createKnexConfig(config: ValidatedConfig): Knex.Config {
  return {
    client: 'mysql2',
    connection: {
      host: config.databaseUrl ? undefined : (process.env.DB_HOST || 'localhost'),
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'uni_admin',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    debug: config.appEnv === 'production' ? false : true,
  };
}
