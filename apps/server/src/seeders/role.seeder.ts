import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * 角色种子数据
 * 初始化系统基础角色：超级管理员、普通用户、访客
 */
export class RoleSeeder implements Seeder {
  // 使用独立的 PrismaClient 实例（seeder 环境无法依赖注入）
  private prisma = new PrismaClient();

  /**
   * 插入角色数据
   * 使用 upsert 保证幂等性，重复执行不会产生错误
   */
  async seed() {
    console.log('🌱 开始播种角色数据...');

    // 定义初始角色列表
    const roles = [
      {
        name: '超级管理员',
        code: 'admin',
        description: '系统超级管理员，拥有所有权限',
        status: 1,
      },
      {
        name: '普通用户',
        code: 'user',
        description: '普通用户，拥有基本权限',
        status: 1,
      },
      {
        name: '访客',
        code: 'guest',
        description: '访客角色，仅可查看公开内容',
        status: 1,
      },
    ];

    // 批量插入或更新角色（upsert 保证幂等性）
    for (const role of roles) {
      await this.prisma.role.upsert({
        where: { code: role.code },
        update: role,  // 角色已存在则更新
        create: role,  // 角色不存在则创建
      });
      console.log(`  ✅ 角色 [${role.code}] 已就绪`);
    }

    console.log('✨ 角色数据播种完成\n');
  }

  /**
   * 清空角色表
   * 用于重置数据库时清理种子数据
   */
  async drop() {
    console.log('🗑️  开始清理角色数据...');

    await this.prisma.role.deleteMany({});

    console.log('🧹 角色数据已清空\n');
  }
}
