import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';

/**
 * 权限种子数据模块（已弃用）
 *
 * 说明：
 *   原 Permission 模型已从数据库中移除
 *   权限信息现在存储在 Menu.permission 字段（JSON格式）
 *   例如: ["admin", "system:user:list"]
 *
 * 此文件保留为空实现，避免破坏 seeder 调用链
 */
export class PermissionSeeder implements Seeder {
  private prisma = new PrismaClient();

  /**
   * 空实现 - Permission 模型已移除
   * 权限数据现在通过 MenuSeeder 初始化到 Menu 表
   */
  async seed() {
    console.log('⏭️  跳过权限初始化（Permission 模型已移除，权限已集成到 Menu 表）\n');
  }

  /**
   * 空实现 - 无需清理
   */
  async drop() {
    console.log('⏭️  跳过权限清理（表不存在）\n');
  }
}
