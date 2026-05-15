import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';

/**
 * 权限种子数据
 * 初始化系统基础权限，并关联到管理员角色
 */
export class PermissionSeeder implements Seeder {
  private prisma = new PrismaClient();

  /**
   * 插入权限数据并关联角色
   * 流程：先创建权限 → 再为管理员角色分配所有权限
   */
  async seed() {
    console.log('🌱 开始播种权限数据...');

    // 定义基础权限列表（type: 0=菜单, 1=按钮, 2=API）
    const permissions = [
      { name: '创建用户', code: 'user:create', type: 2, resource: 'user', action: 'create' },
      { name: '查看用户', code: 'user:read', type: 2, resource: 'user', action: 'read' },
      { name: '更新用户', code: 'user:update', type: 2, resource: 'user', action: 'update' },
      { name: '删除用户', code: 'user:delete', type: 2, resource: 'user', action: 'delete' },
      { name: '管理角色', code: 'role:manage', type: 2, resource: 'role', action: 'manage' },
      { name: '系统配置', code: 'system:config', type: 2, resource: 'system', action: 'config' },
    ];

    // 收集所有权限代码
    const permissionCodes = permissions.map(p => p.code);

    // 批量插入或更新权限
    for (const perm of permissions) {
      await this.prisma.permission.upsert({
        where: { code: perm.code },
        update: perm,
        create: perm,
      });
      console.log(`  ✅ 权限 [${perm.code}] 已就绪`);
    }

    // 为管理员角色分配所有权限
    const adminRole = await this.prisma.role.findUnique({
      where: { code: 'admin' },
    });

    if (adminRole) {
      // 将权限代码数组存储到角色的 permissions 字段
      await this.prisma.role.update({
        where: { id: adminRole.id },
        data: {
          permissions: JSON.stringify(permissionCodes),
        },
      });
      console.log(`  🔑 管理员角色已分配 ${permissionCodes.length} 个权限`);
    }

    console.log('✨ 权限数据播种完成\n');
  }

  /**
   * 清空权限表
   */
  async drop() {
    console.log('🗑️  开始清理权限数据...');

    await this.prisma.permission.deleteMany({});

    // 同时清理角色的权限关联
    await this.prisma.role.updateMany({
      data: { permissions: null },
    });

    console.log('🧹 权限数据已清空\n');
  }
}
