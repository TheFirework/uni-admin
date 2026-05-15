import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * 用户种子数据
 * 初始化默认管理员和测试用户
 */
export class UserSeeder implements Seeder {
  private prisma = new PrismaClient();

  /**
   * 插入用户数据
   * 密码使用 bcrypt 加密存储
   * 自动关联到对应角色
   */
  async seed() {
    console.log('🌱 开始播种用户数据...');

    // 获取角色信息（用于关联用户）
    const adminRole = await this.prisma.role.findUnique({
      where: { code: 'admin' },
    });
    const userRole = await this.prisma.role.findUnique({
      where: { code: 'user' },
    });

    if (!adminRole || !userRole) {
      throw new Error('❌ 角色数据不存在，请先运行 RoleSeeder');
    }

    // 生成加密密码（bcrypt，salt rounds = 10）
    const adminPassword = await bcrypt.hash('Admin@123456', 10);
    const testUserPassword = await bcrypt.hash('Test@123456', 10);

    // 定义初始用户列表
    const users = [
      {
        username: 'admin',
        email: 'admin@uni-admin.com',
        nickname: '系统管理员',
        password: adminPassword,
        roleIds: JSON.stringify([adminRole.id]),  // 关联管理员角色
        status: 1,  // 启用状态
      },
      {
        username: 'testuser',
        email: 'testuser@uni-admin.com',
        nickname: '测试用户',
        password: testUserPassword,
        roleIds: JSON.stringify([userRole.id]),  // 关联普通用户角色
        status: 1,  // 启用状态
      },
    ];

    // 批量插入或更新用户
    for (const user of users) {
      await this.prisma.user.upsert({
        where: { username: user.username },
        update: {
          email: user.email,
          nickname: user.nickname,
          password: user.password,  // 每次重置时更新密码
          roleIds: user.roleIds,
          status: user.status,
        },
        create: user,
      });
      console.log(`  ✅ 用户 [${user.username}] 已就绪`);
    }

    console.log('  💡 默认管理员账号: admin / Admin@123456');
    console.log('  💡 测试用户账号: testuser / Test@123456');
    console.log('✨ 用户数据播种完成\n');
  }

  /**
   * 清空用户表
   */
  async drop() {
    console.log('🗑️  开始清理用户数据...');

    await this.prisma.user.deleteMany({});

    console.log('🧹 用户数据已清空\n');
  }
}
