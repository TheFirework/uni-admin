/**
 * Layer 4: 动态路由加载中间件（含全局请求锁）
 *
 * 职责：
 *   - 检查动态路由是否已加载
 *   - 未加载时从后端获取菜单数据并注册路由
 *   - 加载完成后需要重新触发当前导航
 *
 * 【关键改进】解决 menus 接口大量重复请求问题：
 *   - 使用模块级全局请求锁（requestLock）
 *   - 同一时间只允许一个 fetchMenus 请求在执行
 *   - 后续并发请求会复用同一个 Promise（Promise 共享）
 *   - 错误计数器：连续失败超过阈值时自动降级，避免无限重试
 *
 * 【关键修复】解决刷新页面进入 404 问题：
 *   - 使用 nextTick 确保路由注册完成后再导航
 *   - 添加路由存在性校验，避免导航到未注册的路由
 */

import { useMenuStore } from '@/stores/menu.store';
import { useAppStore } from '@/stores/app.store';
import { RoutePaths } from '@/config/route-paths';
import type { RouterGuardContext, RequestLock } from '../types';
import { createMiddleware } from '../middleware';
import { nextTick } from 'vue';

const MAX_RETRY_COUNT = 3;
const COOLDOWN_TIME = 5000;

const requestLock: RequestLock = {
  isFetching: false,
  fetchPromise: null,
  lastFetchTime: 0,
  errorCount: 0,
};

export const dynamicRouteMiddleware = createMiddleware('dynamicRoute', async (context, next) => {
  const { to, router, next: navigate } = context;
  const menuStore = useMenuStore();
  const appStore = useAppStore();

  console.log(`[Middleware:dynamicRoute] 检查动态路由状态, isLoaded: ${menuStore.isLoaded}, routes: ${menuStore.routes.length}, target: ${to.path}`);

  if (menuStore.isLoaded && menuStore.routes.length > 0) {
    // 额外检查：确认目标路由是否已注册
    const matchedRoute = router.hasRoute(to.name as string) || router.resolve(to.path).matched.length > 1;
    if (matchedRoute) {
      console.log('[Middleware:dynamicRoute] 动态路由已加载且目标路由已匹配，跳过');
      await next();
      return;
    }

    console.warn(`[Middleware:dynamicRoute] ⚠️ isLoaded=true 但目标路由 ${to.path} 未匹配，强制重新加载`);
  }

  if (requestLock.isFetching && requestLock.fetchPromise) {
    console.log('[Middleware:dynamicRoute] ⏳ 正在加载中，等待现有请求完成...');

    try {
      await requestLock.fetchPromise;
      console.log('[Middleware:dynamicRoute] 等待的请求已完成');

      if (menuStore.isLoaded && menuStore.routes.length > 0) {
        // 等待 DOM 更新和路由注册完成
        await nextTick();

        console.log('[Middleware:dynamicRoute] 路由已就绪（nextTick 后），触发重新导航');
        navigate({ ...to, replace: true });
        context.aborted = true;
        return;
      }
    } catch {
      console.warn('[Middleware:dynamicRoute] 等待的请求失败了，将发起新请求');
    }
  }

  if (requestLock.errorCount >= MAX_RETRY_COUNT) {
    const cooldownRemaining = COOLDOWN_TIME - (Date.now() - requestLock.lastFetchTime);

    if (cooldownRemaining > 0) {
      console.warn(
        `[Middleware:dynamicRoute] ⛔ 连续失败 ${requestLock.errorCount} 次，冷却 ${Math.ceil(cooldownRemaining / 1000)}s`
      );
      navigate({ path: RoutePaths.LOGIN, query: { redirect: to.fullPath } });
      context.aborted = true;
      return;
    }

    requestLock.errorCount = 0;
    console.log('[Middleware:dynamicRoute] 冷却结束，允许重试');
  }

  console.log('[Middleware:dynamicRoute] 开始加载动态路由（force mode）...');

  // 设置 Loading 状态（在 fetchMenus 之前）
  appStore.setFullLoading(true);
  appStore.setRouteLoading(true);

  requestLock.isFetching = true;
  requestLock.lastFetchTime = Date.now();

  requestLock.fetchPromise = menuStore
    .fetchMenus({ force: true })
    .then(async () => {
      requestLock.isFetching = false;
      requestLock.errorCount = 0;

      console.log(
        `[Middleware:dynamicRoute] ✅ 路由加载完成，共 ${menuStore.routes.length} 个路由`,
        `\n已注册路由列表:`,
        menuStore.routes.map((r) => `${r.path} (${r.name})`).join(', ')
      );

      // 清除 Loading 状态（加载成功后）
      appStore.setFullLoading(false);
      appStore.setRouteLoading(false);

      // 等待 Vue Router 处理完 addRoute 更新
      await nextTick();
    })
    .catch((error) => {
      requestLock.isFetching = false;
      requestLock.errorCount += 1;
      requestLock.fetchPromise = null;

      // 清除 Loading 状态（加载失败时，确保不卡在 Loading 界面）
      appStore.setFullLoading(false);
      appStore.setRouteLoading(false);

      console.error(`[Middleware:dynamicRoute] ❌ 加载失败 (${requestLock.errorCount}/${MAX_RETRY_COUNT}):`, error);
      throw error;
    });

  try {
    await requestLock.fetchPromise;

    if (!context.aborted) {
      // 再次确保路由已注册
      await nextTick();

      const finalCheck = router.hasRoute(to.name as string) || router.resolve(to.path).matched.length > 1;

      // 判断是否需要重定向到默认页面
      // 条件：目标是根路径 / 或 /index.html
      const isRootPath = to.path === '/' || to.path === '/index.html';

      if (isRootPath || !finalCheck) {
        // 智能选择默认首页：根据用户权限找到第一个可访问的页面
        const defaultPath = getDefaultPathByPermission(menuStore);

        if (isRootPath) {
          console.log(`[Middleware:dynamicRoute] 检测到根路径访问，智能跳转到: ${defaultPath}`);
        } else {
          console.warn(`[Middleware:dynamicRoute] 目标路径无法匹配，使用默认路径: ${defaultPath}`);
        }

        navigate({ path: defaultPath, replace: true });
        context.aborted = true;
        return;
      }

      console.log('[Middleware:dynamicRoute] 触发重新导航以匹配新路由...');
      navigate({ ...to, replace: true });
      context.aborted = true;
    }
  } catch (error) {
    // 清除 Loading 状态（异常时确保清理，避免 UI 卡死）
    appStore.setFullLoading(false);
    appStore.setRouteLoading(false);

    const err = error as Error;
    const isAuthError = err.message?.includes('401') || err.message?.includes('Unauthorized');

    if (isAuthError) {
      console.warn('[Middleware:dynamicRoute] 401 错误，Token 可能已失效，重定向到登录页');
    }

    navigate({
      path: RoutePaths.LOGIN,
      query: { redirect: to.fullPath },
    });
    context.aborted = true;
  }
});

/**
 * 根据用户权限智能选择默认首页
 *
 * 逻辑：
 *   1. 管理员（有 admin 角色）：跳转到工作台（Workbench）
 *   2. 普通用户：跳转到第一个有权限访问的页面（第一个有 component 的叶子菜单）
 *
 * @param menuStore 菜单 Store 实例
 * @returns 默认首页路径
 */
function getDefaultPathByPermission(menuStore: ReturnType<typeof useMenuStore>): string {
  const { menus, routes } = menuStore;

  // 优先查找仪表盘路由（工作台下的默认页面）
  const dashboardRoute = routes.find(
    (r) => r.name === 'Dashboard' || r.path === '/workbench/dashboard'
  );

  if (dashboardRoute) {
    console.log('[getDefaultPath] 找到仪表盘路由，使用作为默认首页');
    return dashboardRoute.path;
  }

  // 如果没有仪表盘，查找第一个可访问的叶子节点（有 component 的菜单）
  function findFirstAccessibleMenu(menuList: typeof menus): string | null {
    for (const menu of menuList) {
      // 如果当前菜单有 component，说明是可直接访问的页面
      if (menu.component && menu.path) {
        return menu.path;
      }

      // 如果有子菜单，递归查找
      if (menu.children && menu.children.length > 0) {
        const childPath = findFirstAccessibleMenu(menu.children);
        if (childPath) {
          return childPath;
        }
      }
    }
    return null;
  }

  const firstAccessiblePath = findFirstAccessibleMenu(menus);

  if (firstAccessiblePath) {
    console.log(`[getDefaultPath] 未找到仪表盘，使用第一个可访问页面: ${firstAccessiblePath}`);
    return firstAccessiblePath;
  }

  // 兜底：返回根路径（会触发重新加载）
  console.warn('[getDefaultPath] ⚠️ 未找到任何可访问的菜单，返回根路径');
  return '/';
}
