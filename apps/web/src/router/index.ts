import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { setupRouterGuards } from './guards';

// 公开路由（无需认证，独立渲染，不经过 Layout）
const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/login/index.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { requiresAuth: false, title: '无权限' },
  },
];

// 受保护路由（需要认证，包裹在 BasicLayout 中）
// 注意：不再预定义静态路由，完全由动态路由系统控制
// 动态路由会在应用启动后通过 menu.store.ts 从后端加载并注册
const protectedRoutes: RouteRecordRaw[] = [];

// 路由配置
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ====== 第一层路由：公开页面（直接渲染） ======
    ...publicRoutes,

    // ====== 第二层路由：受保护页面（BasicLayout 包裹） ======
    {
      path: '/',
      name: 'BasicLayout', // 添加路由名称，供动态路由 addRoute 使用
      // 注意：不设置 redirect，由 dynamicRoute 中间件处理首次导航
      // 如果在这里设置 redirect: '/dashboard'，会在动态路由加载前就触发重定向
      // 导致 /dashboard 还未注册就被访问，最终显示 404
      component: () => import('@/layouts/BasicLayout.vue'),
      children: [
        // 基础受保护路由（现在为空，完全由动态路由控制）
        ...protectedRoutes,

        // 注意：404 兜底路由不再在静态定义中添加
        // 改为由 menu.store.ts 的 registerDynamicRoutes() 动态添加
        // 这确保 404 始终在所有动态路由之后，避免拦截正常路由
      ],
    },

    // 兜底：如果 / 也不匹配（理论上不会发生）
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// 注册路由守卫（四级中间件链）
setupRouterGuards(router);

export default router;
