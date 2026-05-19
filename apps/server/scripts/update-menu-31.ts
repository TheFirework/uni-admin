/**
 * 更新菜单记录：将 id=31 的 component 设置为 null
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMenuComponent() {
  try {
    console.log('🔧 正在更新菜单记录...\n');

    // 查找当前状态
    const menu = await prisma.menu.findUnique({
      where: { id: 31 },
    });

    if (!menu) {
      console.error('❌ 未找到 id=31 的菜单记录');
      return;
    }

    console.log('📋 当前状态:');
    console.log(`   ID: ${menu.id}`);
    console.log(`   名称: ${menu.name}`);
    console.log(`   路径: ${menu.path}`);
    console.log(`   Component: ${menu.component || '(空)'}`);
    console.log(`   Redirect: ${menu.redirect || '(空)'}\n`);

    // 更新 component 为 null
    const updated = await prisma.menu.update({
      where: { id: 31 },
      data: {
        component: null,
      },
    });

    console.log('✅ 更新成功！');
    console.log('\n📋 更新后状态:');
    console.log(`   ID: ${updated.id}`);
    console.log(`   名称: ${updated.name}`);
    console.log(`   路径: ${updated.path}`);
    console.log(`   Component: ${updated.component || '(null)'}`);
    console.log(`   Redirect: ${updated.redirect || '(空)'}`);

  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMenuComponent();
