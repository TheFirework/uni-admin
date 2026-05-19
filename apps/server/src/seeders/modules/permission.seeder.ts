/**
 * 权限种子数据模块（已弃用）
 *
 * 说明：
 *   原 Permission 模型已从数据库中移除
 *   权限信息现在存储在 Menu.permission 字段（JSON格式）
 *   例如: ["admin", "system:user:list"]
 *
 * 此文件保留为空实现，避免破坏 seeder 调用链
 * 后续可考虑彻底删除此模块
 */

import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

export class PermissionSeeder implements ISeeder {
  readonly name = 'permissions';

  /**
   * 空实现 - Permission 模型已移除
   * 权限数据现在通过 MenuSeeder 初始化到 Menu 表
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('⏭️  跳过权限初始化（Permission 模型已移除，权限已集成到 Menu 表）\n');

    return {
      count: 0,
      entityName: 'Permission',
      details: ['权限模型已废弃，使用 Menu.permission 字段代替'],
    };
  }

  /**
   * 空实现 - 无需清理
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('⏭️  跳过权限清理（表不存在）\n');
  }
}
