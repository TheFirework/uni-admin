/**
 * 数据库菜单数据清理脚本
 *
 * 功能：
 *   1. 查找所有重复路径的菜单记录
 *   2. 显示重复数据的详细信息
 *   3. 提供清理选项（删除重复项或保留最新的）
 *
 * 使用方法：
 *   npx tsx scripts/cleanup-duplicate-menus.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  path: string;
  records: Array<{
    id: number;
    name: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

async function findDuplicateMenus(): Promise<DuplicateGroup[]> {
  console.log('🔍 正在查找重复路径的菜单...\n');

  // 获取所有有 path 的菜单
  const allMenus = await prisma.menu.findMany({
    where: {
      path: { not: null },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      name: true,
      path: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 按 path 分组
  const pathGroups = new Map<string, typeof allMenus>();

  for (const menu of allMenus) {
    if (menu.path) {
      const existing = pathGroups.get(menu.path);
      if (existing) {
        existing.push(menu as (typeof allMenus)[number]);
      } else {
        pathGroups.set(menu.path, [menu as (typeof allMenus)[number]]);
      }
    }
  }

  // 找出有重复的分组
  const duplicates: DuplicateGroup[] = [];

  for (const [path, records] of pathGroups.entries()) {
    if (records.length > 1) {
      duplicates.push({ path, records });
    }
  }

  return duplicates;
}

async function showMenuStatistics() {
  console.log('📊 当前菜单统计:\n');

  const totalCount = await prisma.menu.count();
  const rootCount = await prisma.menu.count({
    where: { parentId: null },
  });
  const childCount = await prisma.menu.count({
    where: { parentId: { not: null } },
  });

  console.log(`   总计: ${totalCount} 条`);
  console.log(`   一级菜单: ${rootCount} 条`);
  console.log(`   子菜单: ${childCount} 条`);

  // 列出所有一级菜单
  console.log('\n📋 一级菜单列表:\n');
  const rootMenus = await prisma.menu.findMany({
    where: { parentId: null },
    orderBy: { sort: 'asc' },
    select: {
      id: true,
      name: true,
      path: true,
      title: true,
      component: true,
      children: {
        select: {
          id: true,
          name: true,
          path: true,
          title: true,
        },
      },
    },
  });

  for (const menu of rootMenus) {
    console.log(`   ${menu.id}. [${menu.name}] "${menu.title}"`);
    console.log(`      path: ${menu.path || '(空)'}`);
    console.log(`      component: ${menu.component || '(空)'}`);
    if (menu.children.length > 0) {
      console.log(`      children (${menu.children.length}):`);
      for (const child of menu.children) {
        console.log(`         - ${child.id}. [${child.name}] "${child.title}" (${child.path})`);
      }
    }
    console.log('');
  }
}

async function cleanupDuplicates(duplicates: DuplicateGroup[], keepStrategy: 'first' | 'last' = 'first') {
  console.log(`\n🧹 开始清理重复数据（策略: 保留${keepStrategy === 'first' ? '最早' : '最新'}）...\n`);

  let deletedCount = 0;

  for (const group of duplicates) {
    // 确定要保留和删除的记录
    const sortedRecords = [...group.records].sort((a, b) =>
      keepStrategy === 'first'
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime()
    );

    const toKeep = sortedRecords[0];
    const toDelete = sortedRecords.slice(1);

    console.log(`\n📍 处理路径: "${group.path}"`);
    console.log(`   ✅ 保留: #${toKeep.id} [${toKeep.name}] "${toKeep.title}" (${toKeep.createdAt.toISOString()})`);

    for (const record of toDelete) {
      console.log(`   🗑️ 删除: #${record.id} [${record.name}] "${record.title}" (${record.createdAt.toISOString()})`);

      try {
        // 先检查是否有子菜单关联
        const childCount = await prisma.menu.count({
          where: { parentId: record.id },
        });

        if (childCount > 0) {
          // 如果有子菜单，将子菜单转移到保留的记录下
          console.log(`      ⚠️ 发现 ${childCount} 个子菜单，正在转移...`);
          await prisma.menu.updateMany({
            where: { parentId: record.id },
            data: { parentId: toKeep.id },
          });
        }

        // 删除重复记录
        await prisma.menu.delete({
          where: { id: record.id },
        });

        deletedCount++;
      } catch (error) {
        console.error(`      ❌ 删除失败:`, error);
      }
    }
  }

  return deletedCount;
}

async function main() {
  console.log('🚀 菜单数据清理工具\n');
  console.log('='.repeat(60));

  try {
    // 1. 显示当前统计
    await showMenuStatistics();

    // 2. 查找重复数据
    const duplicates = await findDuplicateMenus();

    if (duplicates.length === 0) {
      console.log('\n✅ 未发现重复路径的菜单数据！');
      return;
    }

    console.log('\n⚠️ 发现重复数据:\n');
    console.log(`共 ${duplicates.length} 组重复:\n`);

    for (let i = 0; i < duplicates.length; i++) {
      const group = duplicates[i];
      console.log(`${i + 1}. 路径: "${group.path}" (${group.records.length} 条重复):`);
      for (const record of group.records) {
        console.log(`   - #${record.id} [${record.name}] "${record.title}" (创建于: ${record.createdAt.toLocaleString()})`);
      }
      console.log('');
    }

    // 3. 执行清理（保留最早的记录）
    const deletedCount = await cleanupDuplicates(duplicates, 'first');

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ 清理完成！共删除 ${deletedCount} 条重复记录\n`);

    // 4. 再次显示统计确认
    console.log('清理后的菜单统计:');
    await showMenuStatistics();

  } catch (error) {
    console.error('\n❌ 清理过程出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
