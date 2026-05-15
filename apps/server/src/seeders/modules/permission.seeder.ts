/**
 * 权限种子数据模块
 *
 * 职责：初始化系统基础权限（用户管理/角色管理/系统配置）
 *
 * 权限类型说明：
 *   - type=0: 菜单权限（控制菜单可见性）
 *   - type=1: 按钮权限（控制操作按钮显示）
 *   - type=2: API 权限（控制接口访问）
 */

import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

/** 权限种子数据定义 */
const PERMISSIONS = [
  // 用户管理相关（菜单 + CRUD 按钮）
  { name: '用户管理', code: 'user:create', type: 0, resource: '/users', action: 'create' },
  { name: '查看用户', code: 'user:read', type: 0, resource: '/users', action: 'read' },
  { name: '编辑用户', code: 'user:update', type: 1, resource: '/users', action: 'update' },
  { name: '删除用户', code: 'user:delete', type: 1, resource: '/users', action: 'delete' },

  // 角色管理（按钮级别）
  { name: '角色管理', code: 'role:manage', type: 1, resource: '/roles', action: '*' },

  // 系统配置（API 级别）
  { name: '系统配置', code: 'system:config', type: 2, resource: '/system/config', action: '*' },
] as const;

export class PermissionSeeder implements ISeeder {
  readonly name = 'permissions';

  /**
   * 填充权限数据
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('🔐 创建权限...');

    const results = await Promise.all(
      PERMISSIONS.map((perm) =>
        prisma.permission.upsert({
          where: { code: perm.code },
          update: {},
          create: { ...perm },
        })
      )
    );

    console.log(`   ✅ 已创建 ${results.length} 个权限\n`);

    return {
      count: results.length,
      entityName: 'Permission',
      details: results.map((p) => `${p.name} (${p.code})`),
    };
  }

  /**
   * 清空权限表
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理权限...');
    try {
      await prisma.permission.deleteMany({});
      console.log('🧹 权限已清空\n');
    } catch (error) {
      console.log('⚠️  权限表不存在或清理失败，跳过');
    }
  }
}
