import type { UniAdminRouteRecord } from '../types';

export const coreRoutes: UniAdminRouteRecord[] = [
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限', hidden: true, requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', hidden: true, requiresAuth: false },
  },
];

export default coreRoutes;
