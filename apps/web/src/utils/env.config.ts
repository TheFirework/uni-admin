/**
 * Web 端环境变量配置模块
 * 从 Vite 的 import.meta.env 读取 VITE_* 前缀变量
 * 提供类型安全 + 启动时严格校验
 */

type AppEnv = 'development' | 'test' | 'production';

/** Web 端环境配置接口 */
export interface WebEnvConfig {
  appTitle: string;
  appEnv: AppEnv;
  apiBaseUrl: string;
  apiTimeout: number;
  enableMock: boolean;
  enableDevtools: boolean;
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
    throw new Error(`[Web Env] ${fieldName} 必须是有效数字，当前值: "${value}"`);
  }
  return num;
}

const VALID_APP_ENVS: AppEnv[] = ['development', 'test', 'production'];

// ====== 校验逻辑 ======

function validateEnv(): WebEnvConfig {
  const meta = import.meta.env;
  const errors: string[] = [];

  // 必填检查
  if (!meta.VITE_APP_TITLE || meta.VITE_APP_TITLE === '') {
    errors.push('❌ 缺少必填环境变量: VITE_APP_TITLE');
  }
  if (!meta.VITE_API_BASE_URL || meta.VITE_API_BASE_URL === '') {
    errors.push('❌ 缺少必填环境变量: VITE_API_BASE_URL');
  }

  // 枚举校验
  const appEnvRaw = meta.VITE_APP_ENV;
  if (!appEnvRaw || appEnvRaw === '') {
    errors.push('❌ 缺少必填环境变量: VITE_APP_ENV');
  } else if (!VALID_APP_ENVS.includes(appEnvRaw as AppEnv)) {
    errors.push(`❌ VITE_APP_ENV 必须是: ${VALID_APP_ENVS.join(' | ')}, 当前值: "${appEnvRaw}"`);
  }
  const appEnv = (appEnvRaw || 'development') as AppEnv;

  // API_TIMEOUT 数字校验
  let apiTimeout = 15000;
  if (meta.VITE_API_TIMEOUT && meta.VITE_API_TIMEOUT !== '') {
    apiTimeout = parseNumber(meta.VITE_API_TIMEOUT, 'VITE_API_TIMEOUT');
    if (apiTimeout <= 0) {
      errors.push(`❌ VITE_API_TIMEOUT 必须是正整数，当前值: ${apiTimeout}`);
    }
  }

  // 输出错误并终止
  if (errors.length > 0) {
    console.error('\n╔════════════════════════════════════╗');
    console.error('║   Web 环境变量配置错误，启动已终止     ║');
    console.error('╠════════════════════════════════════╣');
    errors.forEach((msg) => console.error(`║  ${msg}`));
    console.error('╚════════════════════════════════════╝\n');
    throw new Error('[Web Env] 环境变量校验失败，请检查 .env 配置');
  }

  // 生产环境强制关闭功能开关
  const isProduction = appEnv === 'production';
  const enableMock = isProduction ? false : parseBoolean(meta.VITE_ENABLE_MOCK);
  const enableDevtools = isProduction ? false : parseBoolean(meta.VITE_ENABLE_DEVTOOLS);

  return Object.freeze({
    appTitle: meta.VITE_APP_TITLE || '',
    appEnv,
    apiBaseUrl: meta.VITE_API_BASE_URL || '/api/v1',
    apiTimeout,
    enableMock,
    enableDevtools,
    buildVersion: meta.VITE_BUILD_VERSION || '0.0.0',
    buildTime: meta.VITE_BUILD_TIME || new Date().toISOString(),
  } satisfies WebEnvConfig);
}

export const env: Readonly<WebEnvConfig> = validateEnv();
