import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// 公开路由（无需认证）
const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { requiresAuth: false },
  },
];

// 受保护路由（需要认证）
const protectedRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/index.vue'),
    meta: { requiresAuth: true, title: '仪表盘' },
  },
  {
    path: '/system/user',
    name: 'UserManagement',
    component: () => import('@/views/system/user/index.vue'),
    meta: { requiresAuth: true, title: '用户管理' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...publicRoutes,
    ...protectedRoutes,
    // 未匹配路由重定向到首页
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

export default router;
