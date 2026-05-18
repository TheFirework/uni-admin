import { defineStore } from 'pinia';
import router from '@/router';
import { ElMessage } from 'element-plus';
import { staticMenus, generateRoutesFromMenus } from '@/router/staticMenus';
import type { MenuItem } from '@/router/staticMenus';

// 菜单状态接口
interface MenuState {
  menus: MenuItem[];           // 菜单树数据（内存存储，不持久化）
  isLoaded: boolean;          // 菜单是否已加载
  collapsed: boolean;         // 侧边栏折叠状态
}

export const useMenuStore = defineStore('menu', {
  state: (): MenuState => ({
    menus: [],                // 初始为空数组
    isLoaded: false,          // 初始未加载
    collapsed: false,         // 默认展开
  }),

  getters: {
    /**
     * 获取过滤后的可见菜单列表
     * 过滤掉 meta.hidden 为 true 的菜单项
     */
    visibleMenus: (state): MenuItem[] => {
      return filterHiddenMenus(state.menus);
    },

    /**
     * 获取侧边栏折叠状态
     */
    isCollapsed: (state): boolean => state.collapsed,
  },

  actions: {
    /**
     * 获取菜单数据并注册动态路由
     * 完整流程：使用静态菜单数据 → 转换路由 → addRoute → 更新 store 状态
     */
    async fetchMenus(): Promise<void> {
      // 防止重复加载
      if (this.isLoaded) {
        console.info('[Menu] 菜单已加载，跳过重复请求');
        return;
      }

      try {
        console.log('[Menu] 开始加载静态菜单数据...');

        // 1. 使用静态菜单配置（开发阶段）
        const menuData: MenuItem[] = staticMenus;

        // 2. 存储到 state（内存存储）
        this.menus = menuData;

        // 3. 将静态菜单转换为路由配置并动态注册
        const routes = generateRoutesFromMenus(menuData);
        console.log('[Menu] 生成的路由配置:', JSON.stringify(routes, null, 2));
        for (const route of routes) {
          console.log('[Menu] 注册路由:', route.path, route.name);
          router.addRoute('BasicLayout', route); // 使用父路由的 name 属性
        }

        // 4. 标记为已加载
        this.isLoaded = true;

        console.log(`[Menu] 静态菜单加载完成，共 ${menuData.length} 个顶级菜单`);
      } catch (error: unknown) {
        console.error('[Menu] 加载菜单失败:', error);
        this.isLoaded = false;

        // 显示错误提示
        const errorMessage = error instanceof Error ? error.message : '加载菜单数据失败，请重试';
        ElMessage.error(errorMessage);

        throw error;
      }
    },

    /**
     * 切换侧边栏折叠状态
     */
    toggleCollapse(): void {
      this.collapsed = !this.collapsed;

      // 可选：将折叠状态持久化到 Storage
      // storage.set('sidebarCollapsed', this.collapsed, { namespace: 'app' });
    },

    /**
     * 设置侧边栏折叠状态
     * @param collapsed 是否折叠
     */
    setCollapse(collapsed: boolean): void {
      this.collapsed = collapsed;
    },

    /**
     * 重置菜单状态（登出时调用）
     */
    resetMenuState(): void {
      this.menus = [];
      this.isLoaded = false;
      // 注意：不清除 collapsed 状态，因为它是用户偏好设置
    },
  },
});

/**
 * 递归过滤隐藏的菜单项
 * @param menus 原始菜单数组
 * @returns 过滤后的菜单数组（仅移除 children 中的隐藏项，保留父级）
 */
function filterHiddenMenus(menus: MenuItem[]): MenuItem[] {
  return menus
    .filter((menu) => !menu.meta?.hidden)
    .map((menu) => {
      // 如果有子菜单，递归处理子菜单
      if (menu.children && menu.children.length > 0) {
        return {
          ...menu,
          children: filterHiddenMenus(menu.children),
        };
      }

      return menu;
    });
}
