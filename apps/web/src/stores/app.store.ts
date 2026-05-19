import { defineStore } from 'pinia';

/** 页面加载类型枚举 */
export type PageLoadType = 'initial' | 'refresh' | 'navigate';

/** 全局应用状态接口 */
interface AppState {
  /** 全屏 Loading 显示状态 */
  isFullLoading: boolean;
  /** 路由切换骨架屏显示状态 */
  isRouteLoading: boolean;
  /** 页面加载类型（首次访问/刷新/导航） */
  pageLoadType: PageLoadType;
  /** 特性开关：是否启用页面加载过渡功能 */
  enabled: boolean;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    isFullLoading: false,
    isRouteLoading: false,
    pageLoadType: 'navigate',
    // 默认启用，可通过环境变量 VITE_PAGE_LOADING=false 禁用
    enabled: import.meta.env.VITE_PAGE_LOADING !== 'false',
  }),

  getters: {
    /**
     * 获取实际的全屏 Loading 状态
     * 如果功能被禁用，始终返回 false
     */
    actualIsFullLoading: (state): boolean => {
      return state.enabled ? state.isFullLoading : false;
    },

    /**
     * 获取实际的路由切换 Loading 状态
     * 如果功能被禁用，始终返回 false
     */
    actualIsRouteLoading: (state): boolean => {
      return state.enabled ? state.isRouteLoading : false;
    },
  },

  actions: {
    /** 设置全屏 Loading 状态 */
    setFullLoading(value: boolean): void {
      this.isFullLoading = value;
    },

    /** 设置路由切换 Loading 状态 */
    setRouteLoading(value: boolean): void {
      this.isRouteLoading = value;
    },

    /** 设置页面加载类型 */
    setPageLoadType(type: PageLoadType): void {
      this.pageLoadType = type;
    },
  },
});
