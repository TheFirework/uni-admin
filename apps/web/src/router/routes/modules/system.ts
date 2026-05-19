import type { UniAdminRouteRecord } from '../types';

export const systemRoutes: UniAdminRouteRecord[] = [
  {
    path: '/system',
    name: 'System',
    redirect: '/system/user',
    meta: { title: '系统管理', icon: 'mdi:cog-outline', order: 10, access: ['admin'] },
    children: [
      {
        path: 'user',
        name: 'UserManagement',
        component: () => import('@/views/system/user/index.vue'),
        meta: { title: '用户管理', icon: 'mdi:account-group', access: ['admin', 'system:user:list'], keepAlive: true, order: 1 },
      },
      {
        path: 'role',
        name: 'RoleManagement',
        component: () => import('@/views/system/role/index.vue'),
        meta: { title: '角色管理', icon: 'mdi:shield-account', access: ['admin'], order: 2 },
      },
      {
        path: 'menu',
        name: 'MenuManagement',
        component: () => import('@/views/system/menu/index.vue'),
        meta: { title: '菜单管理', icon: 'mdi:menu', access: ['admin'], order: 3 },
      },
    ],
  },
];
