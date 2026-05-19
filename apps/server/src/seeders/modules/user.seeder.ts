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

import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

/** 默认用户密码配置 */
const DEFAULT_PASSWORDS = {
  admin: 'Admin@123456',
  user: 'Test@123456',
} as const;

/** Bcrypt 加密强度 */
const BCRYPT_SALT_ROUNDS = 10;

/** 用户种子数据模板 */
const USERS_TEMPLATE = [
  {
    username: 'admin',
    email: 'admin@example.com',
    nickname: '超级管理员',
    roleCode: 'admin' as const,
  },
  {
    username: 'testuser',
    email: 'testuser@example.com',
    nickname: '测试用户',
    roleCode: 'user' as const,
  },
];

export class UserSeeder implements ISeeder {
  readonly name = 'users';

  /**
   * 填充用户数据
   * 说明：
   *   - User 表无 roleIds 字段（已从 Schema 移除）
   *   - 角色通过 username 判断（admin → admin角色，其他 → user角色）
   *   - 后续集成 RBAC 时可添加 UserRole 关联表
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('👤 创建默认用户...');

    // 加密密码
    const passwords = {
      admin: await bcrypt.hash(DEFAULT_PASSWORDS.admin, BCRYPT_SALT_ROUNDS),
      user: await bcrypt.hash(DEFAULT_PASSWORDS.user, BCRYPT_SALT_ROUNDS),
    };

    // 创建用户（不包含 roleIds 字段）
    const results = await Promise.all(
      USERS_TEMPLATE.map(async (userTemplate) => {
        const password = userTemplate.roleCode === 'admin' ? passwords.admin : passwords.user;

        return prisma.user.upsert({
          where: { username: userTemplate.username },
          update: {},
          create: {
            username: userTemplate.username,
            email: userTemplate.email,
            nickname: userTemplate.nickname,
            password,
            avatar: null,
            status: 1,
          },
        });
      })
    );

    // 输出账号信息
    console.log(`   ✅ 管理员: ${results[0].username} / ${DEFAULT_PASSWORDS.admin}`);
    console.log(`   ✅ 测试用户: ${results[1].username} / ${DEFAULT_PASSWORDS.user}\n`);

    return {
      count: results.length,
      entityName: 'User',
      details: results.map((u) => `${u.username} (${u.email})`),
    };
  }

  /**
   * 清空用户表
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理用户...');
    try {
      await prisma.user.deleteMany({});
      console.log('🧹 用户已清空\n');
    } catch (error) {
      console.log('⚠️  用户表不存在或清理失败，跳过');
    }
  }
}
