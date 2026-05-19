import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * 用户种子数据模块
 *
 * 职责：初始化默认管理员和测试用户账号
 *
 * 安全说明：
 *   - 密码使用 bcrypt 加密存储（salt rounds = 10）
 *   - 默认密码仅用于开发环境，生产环境必须修改
 *   - 角色信息通过用户名判断（admin/user），无需 roleIds 字段
 */
export class UserSeeder implements Seeder {
  private prisma = new PrismaClient();

  /**
   * 插入用户数据
   * 说明：
   *   - User 表无 roleIds 字段（已从 Schema 移除）
   *   - 角色通过 username 判断（admin → admin角色，其他 → user角色）
   *   - 后续集成 RBAC 时可添加 UserRole 关联表
   */
  async seed() {
    console.log('🌱 开始播种用户数据...');

    // 生成加密密码（bcrypt，salt rounds = 10）
    const adminPassword = await bcrypt.hash('Admin@123456', 10);
    const testUserPassword = await bcrypt.hash('Test@123456', 10);

    // 定义初始用户列表（不包含 roleIds 字段）
    const users = [
      {
        username: 'admin',
        email: 'admin@uni-admin.com',
        nickname: '系统管理员',
        password: adminPassword,
        status: 1,  // 启用状态
      },
      {
        username: 'testuser',
        email: 'testuser@uni-admin.com',
        nickname: '测试用户',
        password: testUserPassword,
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
