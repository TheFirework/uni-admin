import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

const ROOT_MENUS = [
  {
    name: 'Workbench',
    path: '/workbench',
    routeName: 'Workbench',
    title: '工作台',
    icon: 'mdi:view-dashboard',
    sort: 0,
  },
  {
    name: 'System',
    path: '/system',
    redirect: '/system/user',
    routeName: 'System',
    title: '系统管理',
    icon: 'mdi:cog-outline',
    permission: JSON.stringify(['admin']),
    sort: 10,
  },
  {
    name: 'Components',
    path: '/components',
    routeName: 'Components',
    title: '组件演示',
    icon: 'mdi:view-grid',
    sort: 20,
  },
  {
    name: 'Permission',
    path: '/permission',
    routeName: 'Permission',
    title: '权限管理',
    icon: 'mdi:shield-lock',
    sort: 30,
  },
  {
    name: 'Profile',
    path: '/profile',
    component: 'profile/index',
    routeName: 'Profile',
    title: '个人中心',
    icon: 'mdi:account-circle',
    sort: 80,
  },
  {
    name: 'About',
    path: '/about',
    component: 'about/index',
    routeName: 'About',
    title: '关于',
    icon: 'mdi:information-outline',
    sort: 90,
  },
  {
    name: 'External',
    path: '/external',
    routeName: 'External',
    title: '外部页面',
    icon: 'mdi:link-variant',
    sort: 95,
  },
];

const CHILD_MENUS = [
// 工作台子菜单
  { parentName: 'Workbench', name: 'Dashboard', path: 'dashboard', component: 'workbench/dashboard/index', routeName: 'Dashboard', title: '仪表盘', icon: 'mdi:speedometer', affix: true, sort: 0 },

  // 系统管理子菜单
  { parentName: 'System', name: 'UserManagement', path: 'user', component: 'system/user/index', routeName: 'UserManagement', title: '用户管理', icon: 'mdi:account-group', permission: JSON.stringify(['admin', 'system:user:list']), sort: 1 },
  { parentName: 'System', name: 'RoleManagement', path: 'role', component: 'system/role/index', routeName: 'RoleManagement', title: '角色管理', icon: 'mdi:shield-account', permission: JSON.stringify(['admin']), sort: 2 },
  { parentName: 'System', name: 'MenuManagement', path: 'menu', component: 'system/menu/index', routeName: 'MenuManagement', title: '菜单管理', icon: 'mdi:menu', permission: JSON.stringify(['admin']), sort: 3 },
  { parentName: 'System', name: 'DictionaryManagement', path: 'dictionary', component: 'system/dictionary/index', routeName: 'DictionaryManagement', title: '字典管理', icon: 'mdi:book-open-variant', permission: JSON.stringify(['admin']), sort: 4 },

  // 组件演示子菜单
  { parentName: 'Components', name: 'ComponentDemo', path: 'demo', component: 'components/demo/index', routeName: 'ComponentDemo', title: '组件说明', icon: 'mdi:file-document-outline', sort: 0 },

  // 权限管理 - 前端
  { parentName: 'Permission', name: 'FrontendPermission', path: 'frontend', routeName: 'FrontendPermission', title: '基于前端权限', icon: 'mdi:monitor' },
  // 权限管理 - 后端
  { parentName: 'Permission', name: 'BackendPermission', path: 'backend', routeName: 'BackendPermission', title: '基于后台权限', icon: 'mdi:server' },

  // 外部页面子菜单
  { parentName: 'External', name: 'ProjectDocs', path: 'docs', component: 'external/doc/index', routeName: 'ProjectDocs', title: '项目文档', icon: 'mdi:book-open-page-variant' },
];

const GRANDCHILD_MENUS = [
  // 前端权限子菜单
  { parentName: 'FrontendPermission', name: 'FrontendPagePermission', path: 'page', component: 'permission/frontend/page/index', routeName: 'FrontendPagePermission', title: '页面权限', icon: 'mdi:file-document' },
  { parentName: 'FrontendPermission', name: 'FrontendButtonPermission', path: 'button', component: 'permission/frontend/button/index', routeName: 'FrontendButtonPermission', title: '按钮权限', icon: 'mdi:gesture-tap-button' },
  // 后端权限子菜单
  { parentName: 'BackendPermission', name: 'BackendPagePermission', path: 'page', component: 'permission/backend/page/index', routeName: 'BackendPagePermission', title: '页面权限', icon: 'mdi:file-document' },
  { parentName: 'BackendPermission', name: 'BackendButtonPermission', path: 'button', component: 'permission/backend/button/index', routeName: 'BackendButtonPermission', title: '按钮权限', icon: 'mdi:gesture-tap-button' },
];

export class MenuSeeder implements ISeeder {
  readonly name = 'menus';

  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('🌱 开始初始化菜单数据...');

    const rootResults = await Promise.all(
      ROOT_MENUS.map((menu) =>
        prisma.menu.upsert({
          where: { name: menu.name },
          update: menu,
          create: menu,
        })
      )
    );

    const nameToId = new Map(rootResults.map((r) => [r.name, r.id]));

    const childResults = await Promise.all(
      CHILD_MENUS.map((menu) => {
        const parentId = nameToId.get(menu.parentName);
        if (!parentId) throw new Error(`父菜单 ${menu.parentName} 未找到`);
        const { parentName: _, ...data } = menu;
        return prisma.menu.upsert({
          where: { name: data.name },
          update: { ...data, parentId },
          create: { ...data, parentId },
        });
      })
    );

    const allNames = [...rootResults, ...childResults];
    const allNameToId = new Map(allNames.map((r) => [r.name, r.id]));

    const grandchildResults = await Promise.all(
      GRANDCHILD_MENUS.map((menu) => {
        const parentId = allNameToId.get(menu.parentName);
        if (!parentId) throw new Error(`父菜单 ${menu.parentName} 未找到`);
        const { parentName: _, ...data } = menu;
        return prisma.menu.upsert({
          where: { name: data.name },
          update: { ...data, parentId },
          create: { ...data, parentId },
        });
      })
    );

    const allResults = [...allNames, ...grandchildResults];

    console.log(`   ✅ 菜单数据初始化完成，共 ${allResults.length} 条记录`);

    for (const root of rootResults) {
      if (!root.hidden) {
        const children = allResults.filter((m) => m.parentId === root.id);
        if (children.length > 0) {
          console.log(`   └─ ${root.title || root.name}`);
          for (const child of children) {
            const grandChildren = allResults.filter((m) => m.parentId === child.id);
            if (grandChildren.length > 0) {
              console.log(`      ├─ ${child.title || child.name}`);
              for (const gc of grandChildren) {
                console.log(`      │   ├─ ${gc.title || gc.name}`);
              }
            } else {
              console.log(`      ├─ ${child.title || child.name}`);
            }
          }
        } else {
          console.log(`   ├─ ${root.title || root.name}`);
        }
      }
    }

    return {
      count: allResults.length,
      entityName: 'Menu',
      details: allResults.map((m) => `${m.title || m.name} (${m.path || '-'})`),
    };
  }

  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理菜单...');
    try {
      await prisma.menu.deleteMany({});
      console.log('   🧹 菜单已清空\n');
    } catch {
      console.log('   ⚠️ 菜单表不存在或清理失败，跳过\n');
    }
  }
}
