import type { App } from 'vue';
import { Form, Field, ErrorMessage, configure } from 'vee-validate';
import { localize, setLocale } from '@vee-validate/i18n';
import zhCN from '@vee-validate/i18n/dist/locale/zh_CN.json';

/**
 * VeeValidate 表单验证库配置
 * 集成表单验证功能，支持中文错误提示
 *
 * 功能特性：
 * - 失焦时验证（validateOnBlur）
 * - 中文错误信息（zh-CN）
 * - 自定义错误组件样式
 */

/**
 * 安装 VeeValidate 插件
 * 配置验证规则并注册全局组件
 *
 * @param app - Vue 应用实例
 *
 * @example
 * // 在 main.ts 中调用
 * import { setupVeeValidate } from './plugins/vee-validate';
 * setupVeeValidate(app);
 */
export function setupVeeValidate(app: App) {
  // 配置 VeeValidate 全局选项
  configure({
    // 验证时机：仅在失焦时触发（避免输入过程中频繁提示）
    validateOnBlur: true,
    // 输入内容变化时不验证（减少干扰）
    validateOnChange: false,
    // 输入时不实时验证（提升用户体验）
    validateOnInput: false,
  });

  // 设置中文语言包（错误消息显示为中文）
  localize({ zhCN });
  setLocale('zhCN');

  // 注册全局组件
  app.component('VForm', Form);         // 表单容器组件
  app.component('VField', Field);       // 字段输入组件
  app.component('VErrorMessage', ErrorMessage);  // 错误消息展示组件

  console.log('✅ VeeValidate 表单验证库已安装');
}

// 导出核心组件和工具函数（用于需要显式导入的场景）
export { Form, Field, ErrorMessage, configure };
export * from 'vee-validate/rules';  // 导出所有内置验证规则
