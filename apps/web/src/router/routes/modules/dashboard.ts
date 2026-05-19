import type { UniAdminRouteRecord } from '../types';

export const workbenchRoutes: UniAdminRouteRecord[] = [
  {
    path: '/workbench',
    name: 'Workbench',
    meta: { title: '工作台', icon: 'mdi:view-dashboard', affix: true, order: 0, keepAlive: true },
    redirect: '/workbench/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/workbench/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'mdi:view-dashboard', affix: true, order: 0, keepAlive: true },
      },
    ],
  },
];
