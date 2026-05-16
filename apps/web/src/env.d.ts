/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ====== 应用基础配置 ======
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_ENV: 'development' | 'test' | 'production';

  // ====== API 服务配置 ======
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;

  // ====== 功能开关 ======
  readonly VITE_ENABLE_DEVTOOLS: string;

  // ====== 构建元数据（由 vite.config.ts define 注入） ======
  readonly VITE_BUILD_VERSION: string;
  readonly VITE_BUILD_TIME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
