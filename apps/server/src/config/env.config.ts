/**
 * Server 端环境变量配置模块
 * 从 Node.js process.env 读取原生变量名
 * 提供类型安全 + 延迟严格校验（首次访问时触发）
 *
 * 注意: 此模块采用惰性初始化，确保在 ConfigModule 加载 .env 文件之后才执行校验
 */

type AppEnv = 'development' | 'test' | 'production';

/** Server 端环境配置接口 */
export interface ServerEnvConfig {
  appEnv: AppEnv;
  port: number;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  enableSwagger: boolean;
  buildVersion: string;
  buildTime: string;
}

// ====== 工具函数 ======

function parseBoolean(value: unknown): boolean {
  if (value === 'true' || value === '1' || value === true) return true;
  return false;
}

function parseNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`[Server Env] ${fieldName} 必须是有效数字，当前值: "${value}"`);
  }
  return num;
}

function parseStringArray(value: unknown): string[] {
  if (!value || value === '') return [];
  if (Array.isArray(value)) return value as string[];
  return String(value).split(',').map((s) => s.trim());
}

const VALID_APP_ENVS: AppEnv[] = ['development', 'test', 'production'];

/** 运行时读取 package.json version */
function readPackageVersion(): string {
  try {
    const fs = require('fs');
    const path = require('path');
    // 从 process.cwd() 或向上查找 package.json
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ====== 校验与构建（惰性执行）======

let cachedEnv: Readonly<ServerEnvConfig> | null = null;

function buildAndValidate(): ServerEnvConfig {
  const errors: { level: 'error' | 'warn'; message: string }[] = [];

  // 枚举校验
  const appEnvRaw = process.env.NODE_ENV;
  if (!appEnvRaw || appEnvRaw === '') {
    errors.push({ level: 'error', message: '[Server] ❌ 缺少必填环境变量: NODE_ENV' });
  } else if (!VALID_APP_ENVS.includes(appEnvRaw as AppEnv)) {
    errors.push({ level: 'error', message: `[Server] ❌ NODE_ENV 必须是: ${VALID_APP_ENVS.join(' | ')}, 当前值: "${appEnvRaw}"` });
  }
  const appEnv = (appEnvRaw || 'development') as AppEnv;

  // 必填检查
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '') {
    errors.push({ level: 'error', message: '[Server] ❌ 缺少必填环境变量: DATABASE_URL' });
  }

  // PORT 范围校验
  let port = 3000;
  if (process.env.PORT && process.env.PORT !== '') {
    port = parseNumber(process.env.PORT, 'PORT');
    if (port < 1 || port > 65535) {
      errors.push({ level: 'error', message: `[Server] ❌ PORT 必须是 1-65535 之间的整数，当前值: ${port}` });
    }
  }

  // JWT_SECRET 弱密钥警告（不终止）
  const DEFAULT_JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    errors.push({
      level: 'warn',
      message: `[Server] ⚠️ 警告: JWT_SECRET ${!process.env.JWT_SECRET ? '未设置' : '仍在使用默认值'}，请更改为安全密钥`,
    });
  }

  // 分离 error 和 warn
  const errorMessages = errors.filter((e) => e.level === 'error').map((e) => e.message);
  const warnMessages = errors.filter((e) => e.level === 'warn').map((e) => e.message);

  warnMessages.forEach((msg) => console.warn(msg));

  if (errorMessages.length > 0) {
    console.error('\n╔══════════════════════════════════════╗');
    console.error('║   Server 环境变量配置错误，启动已终止   ║');
    console.error('╠══════════════════════════════════════╣');
    errorMessages.forEach((msg) => console.error(`║  ${msg}`));
    console.error('╚══════════════════════════════════════╝\n');
    throw new Error('[Server Env] 环境变量校验失败，请检查 .env 配置');
  }

  // 生产环境强制关闭 Swagger
  const isProduction = appEnv === 'production';
  const enableSwagger = isProduction ? false : parseBoolean(process.env.ENABLE_SWAGGER);

  return Object.freeze({
    appEnv,
    port,
    databaseUrl: process.env.DATABASE_URL || '',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: process.env.REDIS_PORT ? parseNumber(process.env.REDIS_PORT, 'REDIS_PORT') : 6379,
    redisPassword: process.env.REDIS_PASSWORD || '',
    jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigins: parseStringArray(process.env.CORS_ORIGINS),
    enableSwagger,
    buildVersion: readPackageVersion(),
    buildTime: new Date().toISOString(),
  } satisfies ServerEnvConfig);
}

/**
 * 获取环境配置（惰性初始化）
 * 首次访问时执行校验，后续返回缓存结果
 *
 * 使用方式:
 *   1. 在 main.ts 的 bootstrap() 函数内部调用（非顶层 import）
 *   2. 确保 ConfigModule 已先加载 .env 文件
 */
export function getEnv(): Readonly<ServerEnvConfig> {
  if (!cachedEnv) {
    cachedEnv = buildAndValidate();
  }
  return cachedEnv;
}
