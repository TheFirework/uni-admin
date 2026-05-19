/**
 * 清理残留的旧中文菜单数据
 *
 * 问题：
 *   从旧的 #5 [系统管理] 转移过来的子菜单使用了中文命名
 *   这些与新的英文版本冲突，需要删除
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOldChineseMenus() {
  console.log('🧹 开始清理残留的旧中文菜单数据...\n');

  // 查找需要删除的旧菜单（通过特征识别）
  const oldMenus = await prisma.menu.findMany({
    where: {
      OR: [
        {
          name: { in: ['用户管理', '角色管理'] },
          path: { in: ['/system/users', '/system/roles'] },
        },
        {
          title: null,
          name: { in: ['用户管理', '角色管理'] },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      path: true,
      title: true,
      parentId: true,
      createdAt: true,
    },
  });

  if (oldMenus.length === 0) {
    console.log('✅ 未发现需要清理的旧中文菜单');
    return;
  }

  console.log(`🔍 发现 ${oldMenus.length} 条旧菜单记录:\n`);

  for (const menu of oldMenus) {
    console.log(`   #${menu.id} [${menu.name}] "${menu.title}"`);
    console.log(`      path: ${menu.path}`);
    console.log(`      parentId: ${menu.parentId || '(一级菜单)'}`);
    console.log('');
  }

  // 删除这些旧菜单
  let deletedCount = 0;
  for (const menu of oldMenus) {
    try {
      await prisma.menu.delete({
        where: { id: menu.id },
      });
      console.log(`   🗑️ 已删除 #${menu.id} [${menu.name}]`);
      deletedCount++;
    } catch (error) {
      console.error(`   ❌ 删除失败 #${menu.id}:`, error);
    }
  }

  console.log(`\n✅ 清理完成！共删除 ${deletedCount} 条旧菜单\n`);

  // 显示清理后的 System 菜单结构
  console.log('📋 清理后的系统管理菜单:\n');

  const systemMenu = await prisma.menu.findFirst({
    where: {
      name: 'System',
      path: '/system',
    },
    include: {
      children: {
        orderBy: { sort: 'asc' },
        include: {
          children: {
            orderBy: { sort: 'asc' },
          },
        },
      },
    },
  });

  if (systemMenu) {
    console.log(`📁 [${systemMenu.name}] "${systemMenu.title}" (${systemMenu.path})\n`);

    if (systemMenu.children.length > 0) {
      for (const child of systemMenu.children) {
        console.log(`   └─ [${child.name}] "${child.title}" (${child.path})`);

        if (child.children?.length > 0) {
          for (const grandchild of child.children) {
            console.log(`       └─ [${grandchild.name}] "${grandchild.title}" (${grandchild.path})`);
          }
        }
      }
    }
  }

  // 统计总数
  const totalCount = await prisma.menu.count();
  console.log(`\n📊 当前总菜单数: ${totalCount}`);
}

async function main() {
  try {
    await cleanupOldChineseMenus();
  } catch (error) {
    console.error('\n❌ 清理过程出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
