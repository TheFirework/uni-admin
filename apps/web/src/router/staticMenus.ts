/**
 * 静态路由和菜单配置
 * 用于开发阶段展示完整的侧边栏菜单结构
 */

import type { RouteRecordRaw } from 'vue-router';

// 菜单项接口定义
export interface MenuItem {
  path: string;
  name: string;
  component?: () => Promise<unknown>;
  meta?: {
    title: string;
    icon?: string;
    hidden?: boolean;
    affix?: boolean;
  };
  children?: MenuItem[];
}

/**
 * 静态菜单配置
 * 结构：树形层级，支持无限嵌套
 */
export const staticMenus: MenuItem[] = [
  // ====== 仪表盘 ======
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/index.vue'),
    meta: { title: '仪表盘', icon: 'Odometer', affix: true },
  },

  // ====== 系统管理 ======
  {
    path: '/system',
    name: 'System',
    meta: { title: '系统管理', icon: 'Setting' },
    children: [
      {
        path: 'user',
        name: 'UserManagement',
        component: () => import('@/views/system/user/index.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'role',
        name: 'RoleManagement',
        component: () => import('@/views/system/role/index.vue'),
        meta: { title: '角色管理', icon: 'UserFilled' },
      },
      {
        path: 'menu',
        name: 'MenuManagement',
        component: () => import('@/views/system/menu/index.vue'),
        meta: { title: '菜单管理', icon: 'Menu' },
      },
    ],
  },

  // ====== 组件演示 ======
  {
    path: '/components',
    name: 'Components',
    meta: { title: '组件演示', icon: 'Grid' },
    children: [
      {
        path: 'demo',
        name: 'ComponentDemo',
        component: () => import('@/views/components/demo/index.vue'),
        meta: { title: '组件说明', icon: 'Document' },
      },
    ],
  },

  // ====== 权限管理 - 基于前端权限 ======
  {
    path: '/permission',
    name: 'Permission',
    meta: { title: '权限管理', icon: 'Lock' },
    children: [
      {
        path: 'frontend',
        name: 'FrontendPermission',
        meta: { title: '基于前端权限', icon: 'Monitor' },
        children: [
          {
            path: 'page',
            name: 'FrontendPagePermission',
            component: () => import('@/views/permission/frontend/page/index.vue'),
            meta: { title: '页面权限', icon: 'Document' },
          },
          {
            path: 'button',
            name: 'FrontendButtonPermission',
            component: () => import('@/views/permission/frontend/button/index.vue'),
            meta: { title: '按钮权限', icon: 'Pointer' },
          },
        ],
      },
      {
        path: 'backend',
        name: 'BackendPermission',
        meta: { title: '基于后台权限', icon: 'Connection' },
        children: [
          {
            path: 'page',
            name: 'BackendPagePermission',
            component: () => import('@/views/permission/backend/page/index.vue'),
            meta: { title: '页面权限', icon: 'Document' },
          },
          {
            path: 'button',
            name: 'BackendButtonPermission',
            component: () => import('@/views/permission/backend/button/index.vue'),
            meta: { title: '按钮权限', icon: 'Pointer' },
          },
        ],
      },
    ],
  },

  // ====== 关于页面 ======
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/about/index.vue'),
    meta: { title: '关于', icon: 'InfoFilled' },
  },

  // ====== 外部链接 ======
  {
    path: '/external',
    name: 'External',
    meta: { title: '外部页面', icon: 'Link' },
    children: [
      {
        path: 'docs',
        name: 'ProjectDocs',
        component: () => import('@/views/external/doc/index.vue'),
        meta: { title: '项目文档', icon: 'Reading' },
      },
    ],
  },
];

/**
 * 将静态菜单转换为 Vue Router 路由配置
 * 用于动态添加到路由表中
 */
export function generateRoutesFromMenus(menus: MenuItem[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  for (const menu of menus) {
    const route: RouteRecordRaw = {
      path: menu.path,
      name: menu.name,
      component: menu.component,
      meta: menu.meta,
    };

    // 递归处理子菜单
    if (menu.children && menu.children.length > 0) {
      route.children = generateRoutesFromMenus(menu.children);
      // 父级目录不需要 component，使用重定向到第一个子路由
      if (!route.component) {
        route.redirect = `/${menu.path}/${menu.children[0].path}`;
      }
    }

    routes.push(route);
  }

  return routes;
}
