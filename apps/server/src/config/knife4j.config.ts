/**
 * Knife4j (Swagger 增强) 配置模块
 * Knife4j 是基于 Swagger 的增强版 API 文档工具
 * 提供更友好的 UI、离线文档、参数调试等功能
 *
 * 使用方式:
 *   import { KNIFE4J_CONFIG } from './config/knife4j.config';
 */

/** Knife4j 增强选项配置接口 */
export interface Knife4jOptions {
  /** 启用自定义首页 */
  enableHomeCustom: boolean;
  /** 自定义首页路径 */
  homeCustomLocation: string;
  /** 启用全局搜索 */
  enableSearch: boolean;
  /** 显示页脚 */
  enableFooter: boolean;
  /** 启用自定义页脚内容 */
  enableFooterCustom: boolean;
  /** 自定义页脚 HTML 内容 */
  footerCustomContent: string;
}

/** Knife4j 完整配置接口 */
export interface Knife4jConfig {
  /** 是否启用 Knife4j 文档界面 */
  enabled: boolean;
  /** 文档访问路径 */
  documentationPath: string;
  /** API 文档标题 */
  title: string;
  /** API 文档描述信息 */
  description: string;
  /** API 版本号 */
  version: string;
  /** 联系人信息 */
  contact: { name: string; email: string };
  /** Knife4j 增强功能选项 */
  options: Knife4jOptions;
}

/**
 * Knife4j 配置常量
 * 通过环境变量控制开关，默认非 false 即启用
 */
export const KNIFE4J_CONFIG: Knife4jConfig = {
  // 功能开关：除非显式设置为 'false'，否则默认启用
  enabled: process.env.ENABLE_KNIFE4J !== 'false',

  // 文档访问地址
  documentationPath: '/api/doc.html',

  // 基本信息
  title: 'Uni-Admin API 文档',
  description: '管理后台 RESTful API 接口文档（基于 Knife4j 增强）',

  // 版本号优先从 package.json 读取
  version: process.env.npm_package_version || '0.0.1',

  // 联系人信息 - 用于文档页面展示
  contact: { name: 'Uni-Admin Team', email: 'admin@example.com' },

  // Knife4j 增强功能配置
  options: {
    enableHomeCustom: true,
    homeCustomLocation: '',
    enableSearch: true,
    enableFooter: false,
    enableFooterCustom: true,
    footerCustomContent: 'Powered by Uni-Admin',
  },
} as const;
