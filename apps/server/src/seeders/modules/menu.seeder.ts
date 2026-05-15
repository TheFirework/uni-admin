/**
 * 菜单种子数据模块
 *
 * 职责：初始化系统基础菜单结构（仪表盘/系统管理/用户管理/角色管理）
 *
 * 菜单层级说明：
 *   - parentId=null 表示顶级菜单
 *   - component 为 null 表示目录（不可点击，仅用于分组）
 *   - sort 值越小越靠前显示
 */

import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

/** 菜单种子数据定义 */
const MENUS = [
  // 一级菜单
  {
    parentId: null,
    name: '仪表盘',
    path: '/dashboard',
    icon: 'Odometer',
    component: 'dashboard/index',
    sort: 1,
  },
  {
    parentId: null,
    name: '系统管理',
    path: '/system',
    icon: 'Setting',
    component: null,  // 目录节点，无组件
    sort: 99,
  },

  // 二级菜单（系统管理下）
  {
    parentId: null,  // 实际应在 seed() 中动态设置父级 ID
    name: '用户管理',
    path: '/system/users',
    icon: 'User',
    component: 'system/user/index',
    sort: 100,
  },
  {
    parentId: null,
    name: '角色管理',
    path: '/system/roles',
    icon: 'UserFilled',
    component: 'system/role/index',
    sort: 101,
  },
] as const;

export class MenuSeeder implements ISeeder {
  readonly name = 'menus';

  /**
   * 填充菜单数据
   * 特殊处理：动态设置子菜单的 parentId
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('📱 创建系统菜单...');

    // 先查找或创建"系统管理"父菜单
    const systemMenu = await prisma.menu.upsert({
      where: { id: 999 },  // 使用固定 ID 作为系统管理目录
      update: {},
      create: {
        parentId: null,
        name: '系统管理',
        path: '/system',
        icon: 'Setting',
        component: null,
        sort: 99,
      },
    });

    // 定义子菜单（依赖系统管理的 ID）
    const subMenus = [
      {
        parentId: systemMenu.id,
        name: '用户管理',
        path: '/system/users',
        icon: 'User',
        component: 'system/user/index',
        sort: 100,
      },
      {
        parentId: systemMenu.id,
        name: '角色管理',
        path: '/system/roles',
        icon: 'UserFilled',
        component: 'system/role/index',
        sort: 101,
      },
    ];

    // 创建仪表盘（独立一级菜单）和子菜单
    const allMenus = [
      {
        parentId: null,
        name: '仪表盘',
        path: '/dashboard',
        icon: 'Odometer',
        component: 'dashboard/index',
        sort: 1,
      },
      ...subMenus,
    ];

    const results = await Promise.all(
      allMenus.map((menu, index) =>
        prisma.menu.upsert({
          where: { id: index + 1 },  // 使用索引作为临时唯一标识
          update: {},
          create: menu,
        }).catch(() => {
          // ID 冲突时忽略（幂等性保证）
          return null;
        })
      )
    );

    const successCount = results.filter(Boolean).length;
    console.log(`   ✅ 已创建 ${successCount} 个菜单项\n`);

    return {
      count: successCount,
      entityName: 'Menu',
      details: allMenus.map((m) => `${m.name} | ${m.path}`),
    };
  }

  /**
   * 清空菜单表
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理菜单...');
    try {
      await prisma.menu.deleteMany({});
      console.log('🧹 菜单已清空\n');
    } catch (error) {
      console.log('⚠️  菜单表不存在或清理失败，跳过');
    }
  }
}
