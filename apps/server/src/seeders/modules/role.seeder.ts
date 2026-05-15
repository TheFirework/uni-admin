/**
 * 角色种子数据模块
 *
 * 职责：初始化系统基础角色（admin/user/guest）
 *
 * 数据说明：
 *   - admin:  超级管理员，拥有所有权限
 *   - user:  普通用户，默认角色
 *   - guest: 访客用户，只读权限
 */

import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

/** 角色种子数据定义 */
const ROLES = [
  {
    code: 'admin',
    name: '超级管理员',
    description: '拥有系统所有权限',
    status: 1,
  },
  {
    code: 'user',
    name: '普通用户',
    description: '默认用户角色',
    status: 1,
  },
  {
    code: 'guest',
    name: '访客',
    description: '只读权限的访客用户',
    status: 1,
  },
] as const;

export class RoleSeeder implements ISeeder {
  readonly name = 'roles';

  /**
   * 填充角色数据
   * 使用 upsert 确保幂等性，重复执行不会创建重复记录
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('📋 创建角色...');

    const results = await Promise.all(
      ROLES.map((role) =>
        prisma.role.upsert({
          where: { code: role.code },
          update: {},
          create: { ...role },
        })
      )
    );

    console.log(`   ✅ 已创建 ${results.length} 个角色\n`);

    return {
      count: results.length,
      entityName: 'Role',
      details: results.map((r) => `${r.name} (${r.code})`),
    };
  }

  /**
   * 清空角色表
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理角色...');
    try {
      await prisma.role.deleteMany({});
      console.log('🧹 角色已清空\n');
    } catch (error) {
      console.log('⚠️  角色表不存在或清理失败，跳过');
    }
  }
}
