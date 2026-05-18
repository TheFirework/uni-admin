/**
 * 路由守卫中间件
 * 四级守卫链：白名单检查 → Token 校验 → 动态路由就绪 → 权限校验
 */

import type { Router, RouteLocationNormalized } from 'vue-router';
import { storage } from '@/utils/storage';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';

// ====== 常量配置 ======

/** 白名单路由（无需认证） */
const WHITE_LIST = ['/login', '/404', '/403'];

/** 全局状态：动态路由是否已加载 */
let isRoutesLoaded = false;

/**
 * 获取动态路由加载状态（供外部读取）
 */
export function getRoutesLoadedStatus(): boolean {
  return isRoutesLoaded;
}

/**
 * 设置动态路由加载状态（供外部设置）
 */
export function setRoutesLoadedStatus(loaded: boolean): void {
  isRoutesLoaded = loaded;
}

// ====== 守卫链实现 ======

/**
 * Stage 1: 白名单检查
 * 在白名单中的路由直接放行，不执行后续阶段
 */
function checkWhiteList(to: RouteLocationNormalized): boolean {
  return WHITE_LIST.includes(to.path);
}

/**
 * Stage 2: Token 校验
 * 通过 storage.get 读取 auth 命名空间的 token
 * 无 token 或 token 已过期则重定向到登录页
 * 支持加密和非加密两种存储格式（向后兼容）
 */
async function checkToken(to: RouteLocationNormalized): Promise<boolean> {
  try {
    // 优先尝试从加密存储读取 token
    let token = await storage.get<string>('token', {
      defaultValue: '',
      namespace: 'auth',
      encrypt: true,
    });

    // 如果加密读取失败或为空，尝试非加密读取（兼容旧数据）
    if (!token) {
      token = await storage.get<string>('token', {
        defaultValue: '',
        namespace: 'auth',
        encrypt: false,
      });
    }

    return !!token;
  } catch (error) {
    console.warn('[Router Guard] Token 校验失败:', error);
    return false;
  }
}

/**
 * Stage 3: 动态路由就绪检查
 * 如果动态路由未加载，则先加载菜单并注册路由
 * @returns 是否刚刚完成了路由加载（用于判断是否需要重新导航）
 */
async function checkDynamicRoutes(router: Router): Promise<boolean> {
  console.log('[Router Guard] checkDynamicRoutes called, isRoutesLoaded:', isRoutesLoaded);
  
  if (isRoutesLoaded) {
    return false; // 已加载，无需重新导航
  }

  // 动态路由未加载，需要先加载
  console.log('[Router Guard] About to call fetchMenus...');
  try {
    const menuStore = useMenuStore();
    console.log('[Router Guard] menuStore obtained:', !!menuStore, 'isLoaded:', menuStore.isLoaded);
    
    await menuStore.fetchMenus();
    console.log('[Router Guard] fetchMenus completed');
  } catch (e) {
    console.error('[Router Guard] fetchMenus error:', e);
    throw e;
  }

  // 标记为已加载
  isRoutesLoaded = true;

  return true; // 返回 true 表示刚刚完成了路由加载
}

/**
 * Stage 4: 权限校验
 * 检查 route.meta.roles 与当前用户角色匹配
 * 如果路由无特殊权限要求则直接放行
 */
function checkPermission(to: RouteLocationNormalized): boolean {
  const authStore = useAuthStore();

  // 如果路由没有 roles 要求，直接放行
  if (!to.meta?.roles || !Array.isArray(to.meta.roles)) {
    return true;
  }

  // 检查用户是否拥有所需角色
  const userRoles = authStore.roles || [];
  const requiredRoles = to.meta.roles as string[];

  return requiredRoles.some((role) => userRoles.includes(role));
}

// ====== 主守卫函数 ======

/**
 * 路由前置守卫
 * 按顺序执行四级守卫链
 */
export async function setupRouterGuards(router: Router): Promise<void> {
  console.log('[Router Guard] ✅ setupRouterGuards 被调用，正在注册 beforeEach 守卫...');

  router.beforeEach(async (to, from, next) => {
    console.log('[Router Guard] beforeEach triggered, to:', to.path);

    // ========== Stage 1: 白名单检查 ==========
    if (checkWhiteList(to)) {
      // 如果已登录用户访问登录页，重定向到首页
      if (to.path === '/login') {
        const hasToken = await checkToken(to);
        if (hasToken) {
          next({ path: '/' });
          return;
        }
      }
      next();
      return;
    }

    // ========== Stage 2: Token 校验 ==========
    // 【开发模式】开发环境下跳过 Token 验证，方便调试
    const isDev = import.meta.env.DEV;
    if (isDev) {
      console.log('[Router Guard] 开发模式：跳过 Token 验证');
    }

    const hasToken = isDev || await checkToken(to);

    if (!hasToken) {
      // 无 Token，重定向到登录页，携带原始路径用于登录后跳回
      next({
        path: '/login',
        query: { redirect: to.fullPath },
      });
      return;
    }

    // ========== Stage 3: 动态路由就绪检查 ==========
    let needsReload = false;
    try {
      needsReload = await checkDynamicRoutes(router);
    } catch (error) {
      console.error('[Router Guard] 动态路由加载失败:', error);
      // 加载失败时重定向到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath },
      });
      return;
    }

    // 如果刚刚加载了新路由，需要重新触发当前导航
    // 这是因为 addRoute() 后新路由才能被匹配到
    if (needsReload) {
      next({ ...to, replace: true });
      return;
    }

    // ========== Stage 4: 权限校验 ==========
    if (!checkPermission(to)) {
      // 权限不足，重定向到 403 页面
      next({ path: '/403' });
      return;
    }

    // 所有检查通过，放行
    next();
  });

  // 路由后置钩子：可用于日志记录、性能监控等
  router.afterEach((to, from) => {
    // 可在此处添加页面访问日志、标题设置等逻辑
    if (to.meta?.title) {
      document.title = `${to.meta.title} - UniAdmin`;
    }
  });
}
