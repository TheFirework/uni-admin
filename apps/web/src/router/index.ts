import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { setupRouterGuards } from './guards';

// 公开路由（无需认证，独立渲染，不经过 Layout）
const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
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
// 注意：这些是基础路由，后续会被动态路由补充
const protectedRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/index.vue'),
    meta: { requiresAuth: true, title: '仪表盘', affix: true },
  },
];

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
      component: () => import('@/layouts/BasicLayout.vue'),
      redirect: '/dashboard', // 默认重定向到仪表盘
      children: [
        // 基础受保护路由
        ...protectedRoutes,

        // 404 兜底路由（Layout 的子路由，确保有侧边栏和顶栏）
        {
          path: '/:pathMatch(.*)*',
          name: 'NotFound',
          component: () => import('@/views/error/404.vue'),
          meta: { requiresAuth: true, title: '404' },
        },
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
