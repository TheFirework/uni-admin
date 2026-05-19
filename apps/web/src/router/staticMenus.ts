/**
 * 静态路由和菜单配置
 * 用于开发阶段展示完整的侧边栏菜单结构（基于 views 目录实际页面生成）
 */

import type { RouteRecordRaw } from 'vue-router';
import { resolveComponent } from './componentResolver';

export interface MenuItem {
  id?: string;
  path: string;
  name: string;
  component?: string | (() => Promise<unknown>);
  redirect?: string;
  meta: {
    title: string;
    icon?: string;
    hidden?: boolean;
    affix?: boolean;
    noCache?: boolean;
    externalLink?: string;
    access?: string | string[];
    permission?: string | string[];
    sort?: number;
  };
  children?: MenuItem[];
}

export const staticMenus: MenuItem[] = [
  {
    path: '/workbench',
    name: 'Workbench',
    meta: { title: '工作台', icon: 'mdi:view-dashboard', sort: 0 },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: 'views/workbench/dashboard/index',
        meta: { title: '仪表盘', icon: 'mdi:speedometer', affix: true, sort: 0 },
      },
    ],
  },
  {
    path: '/system',
    name: 'System',
    redirect: '/system/user',
    meta: { title: '系统管理', icon: 'mdi:cog-outline', permission: ['admin'], sort: 10 },
    children: [
      {
        path: 'user',
        name: 'UserManagement',
        component: 'views/system/user/index',
        meta: { title: '用户管理', icon: 'mdi:account-group', permission: ['admin', 'system:user:list'], sort: 1 },
      },
      {
        path: 'role',
        name: 'RoleManagement',
        component: 'views/system/role/index',
        meta: { title: '角色管理', icon: 'mdi:shield-account', permission: ['admin'], sort: 2 },
      },
      {
        path: 'menu',
        name: 'MenuManagement',
        component: 'views/system/menu/index',
        meta: { title: '菜单管理', icon: 'mdi:menu', permission: ['admin'], sort: 3 },
      },
    ],
  },
  {
    path: '/components',
    name: 'Components',
    meta: { title: '组件演示', icon: 'mdi:view-grid', sort: 20 },
    children: [
      {
        path: 'demo',
        name: 'ComponentDemo',
        component: 'views/components/demo/index',
        meta: { title: '组件说明', icon: 'mdi:file-document-outline', sort: 0 },
      },
    ],
  },
  {
    path: '/permission',
    name: 'Permission',
    meta: { title: '权限管理', icon: 'mdi:shield-lock', sort: 30 },
    children: [
      {
        path: 'frontend',
        name: 'FrontendPermission',
        meta: { title: '基于前端权限', icon: 'mdi:monitor' },
        children: [
          {
            path: 'page',
            name: 'FrontendPagePermission',
            component: 'views/permission/frontend/page/index',
            meta: { title: '页面权限', icon: 'mdi:file-document' },
          },
          {
            path: 'button',
            name: 'FrontendButtonPermission',
            component: 'views/permission/frontend/button/index',
            meta: { title: '按钮权限', icon: 'mdi:gesture-tap-button' },
          },
        ],
      },
      {
        path: 'backend',
        name: 'BackendPermission',
        meta: { title: '基于后台权限', icon: 'mdi:server' },
        children: [
          {
            path: 'page',
            name: 'BackendPagePermission',
            component: 'views/permission/backend/page/index',
            meta: { title: '页面权限', icon: 'mdi:file-document' },
          },
          {
            path: 'button',
            name: 'BackendButtonPermission',
            component: 'views/permission/backend/button/index',
            meta: { title: '按钮权限', icon: 'mdi:gesture-tap-button' },
          },
        ],
      },
    ],
  },
  {
    path: '/about',
    name: 'About',
    component: 'views/about/index',
    meta: { title: '关于', icon: 'mdi:information-outline', sort: 90 },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: 'views/profile/index',
    meta: { title: '个人中心', icon: 'mdi:account-circle', sort: 80 },
  },
  {
    path: '/external',
    name: 'External',
    meta: { title: '外部页面', icon: 'mdi:link-variant', sort: 95 },
    children: [
      {
        path: 'docs',
        name: 'ProjectDocs',
        component: 'views/external/doc/index',
        meta: { title: '项目文档', icon: 'mdi:book-open-page-variant' },
      },
    ],
  },
];

export function generateRoutesFromMenus(menus: MenuItem[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];
  // 用于去重：记录已处理的路径
  const processedPaths = new Set<string>();

  for (const menu of menus) {
    // 跳过无效菜单
    if (!menu.path || !menu.name) {
      console.warn(`[staticMenus] ⚠️ 跳过无效菜单: path="${menu.path}", name="${menu.name}"`);
      continue;
    }

    // 检查路径是否已处理（去重）
    if (processedPaths.has(menu.path)) {
      console.warn(`[staticMenus] ⚠️ 发现重复路径，跳过: "${menu.path}" (name: "${menu.name}")`);
      continue;
    }

    // 判断是否为有效的可访问路由
    // 规则：有 component 或者有 redirect 才能作为可访问路由
    const hasComponent = typeof menu.component === 'string' || typeof menu.component === 'function';
    const hasRedirect = !!menu.redirect;
    const hasChildren = menu.children && menu.children.length > 0;

    // 如果既没有组件也没有重定向，且不是只有子菜单的容器，则跳过
    if (!hasComponent && !hasRedirect && !hasChildren) {
      console.warn(
        `[staticMenus] ⏭️ 跳过无组件/无重定向的菜单: path="${menu.path}", name="${menu.name}"`
      );
      continue;
    }

    const route: RouteRecordRaw = {
      path: menu.path,
      name: menu.name,
      meta: menu.meta,
    };

    // 解析组件
    if (typeof menu.component === 'string') {
      const resolved = resolveComponent(menu.component);
      if (resolved) {
        route.component = resolved;
        console.log(`[staticMenus] ✓ 组件解析成功: ${menu.path} → ${menu.component}`);
      } else {
        console.error(
          `[staticMenus] ❌ 组件解析失败: path="${menu.path}", name="${menu.name}", component="${menu.component}"`,
          `\n将使用 404 占位组件，请检查组件路径是否正确`
        );
        route.component = () => import('@/views/error/404.vue');
      }
    } else if (typeof menu.component === 'function') {
      route.component = menu.component;
    }

    // 设置重定向
    if (menu.redirect) {
      route.redirect = menu.redirect;
    }

    // 处理子路由
    if (hasChildren) {
      // 递归生成子路由（子路由也会进行去重和验证）
      route.children = generateRoutesFromMenus(menu.children);

      // 对于只有子路由的容器路由，自动设置重定向到第一个子路由
      if (!hasComponent && !hasRedirect && route.children.length > 0) {
        const firstChild = route.children[0];
        if (firstChild?.path) {
          route.redirect = `${menu.path}/${firstChild.path}`;
          console.log(
            `[staticMenus] 📦 容器路由自动重定向: ${menu.path} → ${route.redirect}`
          );
        }
      }
    }

    // 标记路径已处理并添加到结果集
    processedPaths.add(menu.path);
    routes.push(route);

    console.log(
      `[staticMenus] ✅ 路由生成完成: ${menu.path} (${menu.name})` +
      `\n  - component: ${hasComponent ? '✓' : '✗'}` +
      `\n  - children: ${hasChildren ? `${route.children?.length || 0}个` : '无'}` +
      `\n  - redirect: ${route.redirect || '无'}`
    );
  }

  console.log(
    `[staticMenus] 🎯 路由生成统计: 输入 ${menus.length} 个菜单, 输出 ${routes.length} 个有效路由` +
    (processedPaths.size < menus.length ? `, 过滤 ${menus.length - processedPaths.size} 个重复/无效` : '')
  );

  return routes;
}
