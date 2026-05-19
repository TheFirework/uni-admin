import { defineStore } from 'pinia';
import type { RouteRecordRaw } from 'vue-router';
import router from '@/router';
import { ElMessage } from 'element-plus';
import { RouteAdapter } from '@/router/adapters/RouteAdapter';
import { menuCacheManager } from '@/utils/cache/MenuCacheManager';
import { PromiseDeduplicator } from '@/utils/concurrency/PromiseDeduplicator';
import { routerConfig } from '@/config/router.config';
import type { MenuItem } from '@/router/staticMenus';

interface MenuState {
  menus: MenuItem[];
  routes: RouteRecordRaw[];
  isLoaded: boolean;
  isLoading: boolean;
  lastError: Error | null;
  cacheStatus: 'fresh' | 'stale' | 'error';
  collapsed: boolean;
}

const menuFetchDeduplicator = new PromiseDeduplicator<RouteRecordRaw[]>();

export const useMenuStore = defineStore('menu', {
  state: (): MenuState => ({
    menus: [],
    routes: [],
    isLoaded: false,
    isLoading: false,
    lastError: null,
    cacheStatus: 'error',
    collapsed: false,
  }),

  getters: {
    visibleMenus: (state): MenuItem[] => filterHiddenMenus(state.menus),
    isCollapsed: (state): boolean => state.collapsed,
  },

  actions: {
    /**
     * 获取菜单数据（带缓存和强制刷新支持）
     * @param options.force 是否强制从后端获取（忽略缓存和加载状态）
     */
    async fetchMenus(options?: { force?: boolean }): Promise<void> {
      // 强制刷新模式：最高优先级，跳过所有检查，直接从后端获取
      if (options?.force) {
        console.log('[Menu] ✅ 强制模式：忽略缓存和 isLoading 状态，直接从后端获取');

        // 防止并发：如果正在加载，等待完成后再强制刷新
        if (this.isLoading) {
          console.log('[Menu] ⏳ 正在其他地方加载中，等待完成后强制刷新...');
          // 轮询等待 isLoading 变为 false（最多等 5 秒）
          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              if (!this.isLoading) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 50);
            // 超时保护
            setTimeout(() => {
              clearInterval(checkInterval);
              resolve();
            }, 5000);
          });
        }

        await this.doFetchFromNetwork();
        return;
      }

      // 正常模式：检查是否正在加载或已加载
      if (this.isLoading) {
        console.log('[Menu] 正在加载中，跳过重复请求');
        return;
      }

      // 先检查是否已加载且缓存有效
      if (this.isLoaded && this.routes.length > 0 && this.cacheStatus === 'fresh') {
        console.log('[Menu] 已加载且缓存有效，跳过获取');
        return;
      }

      this.isLoading = true;
      this.lastError = null;

      try {
        // 缓存检查
        let shouldFetchFromNetwork = true;

        if (routerConfig.cacheEnabled) {
          const cacheResult = await menuCacheManager.getMenu<RouteRecordRaw[]>();

          if (cacheResult.hit && cacheResult.data) {
            console.log(`[Menu] 缓存命中 (source: ${cacheResult.source})`);
            this.routes = cacheResult.data;
            this.menus = this.routesToMenus(cacheResult.data);
            this.cacheStatus = cacheResult.source === 'L1' ? 'fresh' : 'stale';

            if (!this.isLoaded) {
              this.registerDynamicRoutes(cacheResult.data);
              this.isLoaded = true;
            }

            this.triggerBackgroundRefresh();
            shouldFetchFromNetwork = false;
          }
        }

        if (shouldFetchFromNetwork) {
          await this.doFetchFromNetwork();
        }
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));
        this.cacheStatus = 'error';

        const message = error instanceof Error ? error.message : '加载菜单数据失败，请重试';
        ElMessage.error(message);

        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async forceRefresh(): Promise<void> {
      this.isLoaded = false;
      this.cacheStatus = 'error';
      menuCacheManager.clearAll();
      menuFetchDeduplicator.clearResultCache();

      await this.fetchMenus();
    },

    toggleCollapse(): void {
      this.collapsed = !this.collapsed;
    },

    setCollapse(collapsed: boolean): void {
      this.collapsed = collapsed;
    },

    resetMenuState(): void {
      menuCacheManager.clearAll();
      menuFetchDeduplicator.clearResultCache();

      this.menus = [];
      this.routes = [];
      this.isLoaded = false;
      this.isLoading = false;
      this.lastError = null;
      this.cacheStatus = 'error';
    },

    async doFetchFromNetwork(): Promise<void> {
      const routes = await menuFetchDeduplicator.execute(
        'fetch-menus',
        () => RouteAdapter.fetchRoutes(),
        { cacheTTL: 5000 },
      );

      this.routes = routes;
      this.menus = this.routesToMenus(routes);

      if (routerConfig.cacheEnabled) {
        await menuCacheManager.setMenu(routes, 'network');
      }

      this.registerDynamicRoutes(routes);
      this.isLoaded = true;
      this.cacheStatus = 'fresh';

      console.log(`[Menu] 网络获取完成，共 ${routes.length} 个路由`);
    },

    registerDynamicRoutes(routes: RouteRecordRaw[]): void {
      // 用于去重：记录已处理的路径
      const processedPaths = new Set<string>();
      let successCount = 0;
      let skipCount = 0;

      console.log(`[Menu] 📝 开始注册 ${routes.length} 个动态路由到 BasicLayout...`);

      // 【关键修复】先移除 404 路由，确保动态路由不会被 404 拦截
      // 根据文档：404 路由必须最后添加，否则会拦截所有动态路由！
      if (router.hasRoute('NotFound')) {
        console.log('[Menu] 🗑️ 临时移除 NotFound 路由，确保动态路由优先匹配...');
        router.removeRoute('NotFound');
      }

      for (const route of routes) {
        // 跳过无效路由
        if (!route.path || route.name === 'NotFound') {
          console.warn(`[Menu] ⏭️ 跳过无效路由: path="${route.path}", name="${route.name}"`);
          skipCount++;
          continue;
        }

        // 去重检查：如果路径已经处理过，跳过
        if (processedPaths.has(route.path)) {
          console.warn(`[Menu] ⚠️ 发现重复路径，跳过: "${route.path}" (${route.name})`);
          skipCount++;
          continue;
        }

        try {
          const routeName = route.name as string;

          // 如果路由已存在，先删除再重新添加
          if (router.hasRoute(routeName)) {
            console.log(`[Menu] 🔄 更新已存在的路由: "${routeName}"`);
            router.removeRoute(routeName);
          }

          // 添加路由到 BasicLayout
          router.addRoute('BasicLayout', route);
          processedPaths.add(route.path);
          successCount++;

          // 验证添加结果
          const testResolve = router.resolve(route.path);
          const canMatch = !testResolve.matched.some(m => m.name === 'NotFound');

          console.log(
            `[Menu] ✅ 路由${canMatch ? '注册' : '添加'}成功: ${route.path} (${routeName})` +
            `\n  - component: ${route.component ? '✓' : '✗ (容器路由)'}` +
            `\n  - children: ${(route.children || []).length}个` +
            `\n  - redirect: ${route.redirect || '无'}` +
            `\n  - 可匹配: ${canMatch ? '✅ 是' : '❌ 否'}`
          );

          if (!canMatch) {
            console.warn(
              `[Menu] ⚠️ 警告: 路由 "${routeName}" 添加后无法匹配！`,
              `\n  匹配链:`, testResolve.matched.map(m => `${m.name}(${m.path})`).join(' → ')
            );
          }
        } catch (e) {
          console.error(`[Menu] ❌ 注册路由失败:`, route.name, e);
          skipCount++;
        }
      }

      // 【关键修复】所有动态路由注册完成后，重新添加 404 兜底路由
      // 这确保 404 始终是最后一个被匹配的路由
      console.log('[Menu] 🛡️ 重新添加 NotFound (404) 兜底路由...');
      router.addRoute('BasicLayout', {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/error/404.vue'),
        meta: { requiresAuth: true, title: '404' },
      });

      console.log(
        `[Menu] 🎯 路由注册统计: 成功 ${successCount} 个, 跳过 ${skipCount} 个` +
        `\n当前总路由数: ${router.getRoutes().filter(r => r.path !== '/:pathMatch(.*)*').length}`
      );

      // 最终验证：列出 BasicLayout 的子路由（包括 404）
      const allRoutes = router.getRoutes();
      const basicLayout = allRoutes.find(r => r.name === 'BasicLayout');

      if (basicLayout) {
        console.log(`\n[Menu] 📦 BasicLayout 最终状态:`);
        console.log(`   children 数量: ${basicLayout.children?.length || 0}`);

        if (basicLayout.children && basicLayout.children.length > 0) {
          console.log(`\n   子路由列表:`);
          basicLayout.children.forEach((child, i) => {
            const isNotFound = child.name === 'NotFound';
            console.log(`   ${i + 1}. ${isNotFound ? '🚫' : '✅'} ${child.name || '(无名)'} ("${child.path}")`);
          });
        }

        // 统计实际可匹配的动态路由
        let matchableCount = 0;
        for (const route of routes) {
          if (!route.name || route.name === 'NotFound') continue;

          const resolved = router.resolve(route.path);
          const isMatchable = !resolved.matched.some(m => m.name === 'NotFound');

          if (isMatchable) {
            matchableCount++;
          } else {
            console.warn(`   ❌ 无法匹配: ${route.name} (${route.path})`);
          }
        }

        console.log(`\n   可匹配的动态路由: ${matchableCount}/${routes.length}`);

        if (matchableCount === routes.length) {
          console.log(`   ✅ 所有动态路由均可正常访问！（404 在最后位置）\n`);
        } else {
          console.error(`   ⚠️ 有 ${routes.length - matchableCount} 个路由无法访问\n`);
        }
      }
    },

    routesToMenus(routes: RouteRecordRaw[]): MenuItem[] {
      return routes.map((route) => ({
        path: route.path,
        name: (route.name as string) || '',
        component: route.component as (() => Promise<unknown>) | undefined,
        meta: route.meta as MenuItem['meta'],
        children: route.children ? this.routesToMenus(route.children) : undefined,
      }));
    },

    async triggerBackgroundRefresh(): Promise<void> {
      setTimeout(async () => {
        try {
          const routes = await RouteAdapter.fetchRoutes();
          await menuCacheManager.setMenu(routes, 'background_refresh');
          this.routes = routes;
          this.menus = this.routesToMenus(routes);
          this.cacheStatus = 'fresh';
          console.log('[Menu] 后台静默刷新完成');
        } catch {
          // 静默刷新失败不影响用户体验
        }
      }, 3000);
    },
  },
});

function filterHiddenMenus(menus: MenuItem[]): MenuItem[] {
  return menus
    .filter((menu) => !menu.meta?.hidden)
    .map((menu) => {
      if (menu.children && menu.children.length > 0) {
        return { ...menu, children: filterHiddenMenus(menu.children) };
      }
      return menu;
    });
}
