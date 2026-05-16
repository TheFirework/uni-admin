/**
 * 统一配置访问入口
 *
 * 从 ConfigModule 已校验的 process.env 构建类型安全的只读配置对象
 * 提供 getConfig() 函数，供无法参与 DI 的场景使用：
 *   - Guards / Filters / Interceptors (在 main.ts 中手动 new)
 *   - 模块级配置常量工厂函数
 *   - 静态工具方法
 *
 * 使用方式:
 *   import { getConfig } from './config/env.config';
 *   const config = getConfig();
 *   console.log(config.port, config.jwtSecret);
 */

import { envSchema, type ValidatedConfig } from './env.validation.js';

let cachedConfig: Readonly<ValidatedConfig> | null = null;

export function getConfig(): Readonly<ValidatedConfig> {
  if (!cachedConfig) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('\n╔══════════════════════════════════════╗');
      console.error('║   环境变量校验失败，启动已终止       ║');
      console.error('╠══════════════════════════════════════╣');
      result.error.issues.forEach((issue) => {
        console.error(`║  ${issue.path.join('.')}: ${issue.message}`);
      });
      console.error('╚══════════════════════════════════════╝\n');
      throw new Error('[Config] 环境变量校验失败，请检查 .env 配置');
    }
    cachedConfig = Object.freeze(result.data) as Readonly<ValidatedConfig>;
  }
  return cachedConfig;
}

export type { ValidatedConfig };
