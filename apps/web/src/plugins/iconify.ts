import type { App } from 'vue';
import { Icon } from '@iconify/vue';

/**
 * Iconify 图标库配置
 * 集成 @iconify/vue 组件，注册为全局组件
 * 支持多种图标集（Element Plus、Material Design 等）
 */

/**
 * 默认图标集配置
 * 使用 Element Plus 图标集作为默认图标源
 * 可通过修改此配置切换到其他图标集（mdi、fa 等）
 */
export const ICONIFY_DEFAULTS = {
  /** 默认图标集前缀 */
  defaultIcon: 'ep:element-plus',
  /** Element Plus 图标集 */
  elementPlus: 'ep',
  /** Material Design Icons 图标集 */
  materialDesign: 'mdi',
  /** Font Awesome 图标集 */
  fontAwesome: 'fa',
} as const;

/**
 * 安装 Iconify 插件
 * 将 Icon 组件注册为 Vue 全局组件，可在任意模板中直接使用
 *
 * @param app - Vue 应用实例
 *
 * @example
 * // 在 main.ts 中调用
 * import { setupIconify } from './plugins/iconify';
 * setupIconify(app);
 *
 * // 在组件中使用
 * <template>
 *   <Icon icon="ep:edit" />
 *   <Icon icon="mdi:home" />
 * </template>
 */
export function setupIconify(app: App) {
  // 注册 Icon 为全局组件（无需在每个组件中单独导入）
  app.component('Icon', Icon);

  console.log('✅ Iconify 图标库已安装');
}

// 导出 Icon 组件类型定义（用于 TypeScript 类型提示）
export type { IconProps } from '@iconify/vue';
// 重新导出 Icon 组件（用于需要显式导入的场景）
export { Icon };
