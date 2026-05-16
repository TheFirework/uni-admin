/**
 * Knife4j (Swagger 增强) 配置工厂
 * Knife4j 是基于 Swagger 的增强版 API 文档工具
 *
 * 使用方式:
 *   import { createKnife4jConfig } from './config/knife4j.config';
 *   const knife4jCfg = createKnife4jConfig(getConfig());
 */

import { getConfig } from './env.config.js';

export interface Knife4jOptions {
  enableHomeCustom: boolean;
  homeCustomLocation: string;
  enableSearch: boolean;
  enableFooter: boolean;
  enableFooterCustom: boolean;
  footerCustomContent: string;
}

export interface Knife4jConfig {
  enabled: boolean;
  documentationPath: string;
  title: string;
  description: string;
  version: string;
  contact: { name: string; email: string };
  options: Knife4jOptions;
}

export function createKnife4jConfig(): Knife4jConfig {
  const config = getConfig();

  return {
    enabled: config.enableKnife4j,
    documentationPath: '/api/doc.html',
    title: 'Uni-Admin API 文档',
    description: '管理后台 RESTful API 接口文档（基于 Knife4j 增强）',
    version: '0.0.1',
    contact: { name: 'Uni-Admin Team', email: 'admin@example.com' },
    options: {
      enableHomeCustom: true,
      homeCustomLocation: '',
      enableSearch: true,
      enableFooter: false,
      enableFooterCustom: true,
      footerCustomContent: 'Powered by Uni-Admin',
    },
  };
}
