/**
 * 布局断点 composable
 * 封装 @vueuse/core 的 useBreakpoints，导出常用的响应式状态
 */

import { computed } from 'vue';
import { useBreakpoints } from '@vueuse/core';

// ====== 断点定义 ======

/** 断点配置（与设计稿和 SCSS 变量保持一致） */
const breakpoints = {
  sm: 768,   // 小屏幕（平板竖屏及以下）
  md: 992,   // 中等屏幕（平板横屏）
  xl: 1200,  // 大屏幕（桌面显示器）
};

// ====== 创建断点实例 ======

/** 使用 @vueuse/core 的 useBreakpoints */
const breakpointsInstance = useBreakpoints(breakpoints);

// ====== 导出响应式状态 ======

/** 是否为小屏幕（< 768px） */
export const isMobile = breakpointsInstance.smaller('sm');

/** 是否为中等屏幕（768px - 991px） */
export const isTablet = breakpointsInstance.between('sm', 'md');

/** 是否为大屏幕（≥ 1200px） */
export const isDesktop = breakpointsInstance.greater('xl');

/**
 * 当前设备类型
 * 返回值: 'mobile' | 'tablet' | 'desktop'
 */
export const deviceType = computed((): string => {
  if (isMobile.value) return 'mobile';
  if (isTablet.value) return 'tablet';
  return 'desktop';
});

/**
 * 侧边栏应该显示的模式
 * 返回值: 'full' | 'icon' | 'hidden' | 'drawer'
 * - full: 完整展开模式（240px，显示图标+文字）
 * - icon: 图标模式（64px，仅显示图标）
 * - hidden: 隐藏模式（不显示侧边栏）
 * - drawer: 抽屉模式（移动端全屏覆盖或弹出抽屉）
 */
export const sidebarMode = computed((): string => {
  if (isMobile.value) return 'drawer';
  if (isTablet.value) return 'hidden';
  if (isDesktop.value) return 'full';
  // lg 断点（992px - 1199px）: 图标模式
  return 'icon';
});

/**
 * 标签栏是否应该简化显示
 * 在小屏幕时隐藏标签栏或改为下拉菜单
 */
export const shouldSimplifyTagsView = isMobile;

/**
 * Header 是否应该简化显示
 * 在小屏幕时仅显示必要元素
 */
export const shouldSimplifyHeader = isMobile;
