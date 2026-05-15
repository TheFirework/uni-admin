/**
 * 种子数据执行协调器
 *
 * 职责：
 *   1. 注册所有种子模块
 *   2. 按依赖顺序执行（角色 → 权限 → 用户 → 菜单 → 字典 → 配置）
 *   3. 支持选择性执行指定模块
 *   4. 提供统一的日志输出和错误处理
 *
 * 使用方式：
 *   import { SeedCoordinator } from './seeders';
 *   await new SeedCoordinator().run({ modules: ['roles', 'users'] });
 */

import { PrismaClient } from '@prisma/client';
import type { SeedOptions, ISeeder } from './interfaces/seeder.interface';

// 导入所有种子模块
import { RoleSeeder } from './modules/role.seeder';
import { PermissionSeeder } from './modules/permission.seeder';
import { UserSeeder } from './modules/user.seeder';
import { MenuSeeder } from './modules/menu.seeder';
import { DictionarySeeder } from './modules/dictionary.seeder';
import { SystemConfigSeeder } from './modules/system-config.seeder';

export class SeedCoordinator {
  private prisma: PrismaClient;
  private seeders: Map<string, ISeeder>;

  /** 模块执行顺序（考虑依赖关系） */
  private readonly EXECUTION_ORDER = [
    'roles',        // 1. 角色（用户依赖角色）
    'permissions',  // 2. 权限（独立，但逻辑上先于用户）
    'users',        // 3. 用户（依赖角色ID）
    'menus',        // 4. 菜单（独立）
    'dictionary',   // 5. 字典（独立）
    'system-config',// 6. 系统配置（独立）
  ];

  constructor() {
    this.prisma = new PrismaClient();
    this.seeders = this.registerSeeders();
  }

  /**
   * 注册所有种子模块
   */
  private registerSeeders(): Map<string, ISeeder> {
    const seederMap = new Map<string, ISeeder>([
      [new RoleSeeder().name, new RoleSeeder()],
      [new PermissionSeeder().name, new PermissionSeeder()],
      [new UserSeeder().name, new UserSeeder()],
      [new MenuSeeder().name, new MenuSeeder()],
      [new DictionarySeeder().name, new DictionarySeeder()],
      [new SystemConfigSeeder().name, new SystemConfigSeeder()],
    ]);

    return seederMap;
  }

  /**
   * 执行种子数据填充
   *
   * @param options - 执行选项（可选择性执行模块）
   */
  async run(options?: SeedOptions): Promise<void> {
    const startTime = Date.now();
    console.log('🌱 开始填充种子数据...\n');

    try {
      // 如果需要先清空数据
      if (options?.dropFirst) {
        await this.dropAll();
      }

      // 确定要执行的模块列表
      const modulesToRun = this.resolveModules(options?.modules);

      // 按顺序执行每个模块
      const results: Array<{ name: string; count: number }> = [];

      for (const moduleName of modulesToRun) {
        const seeder = this.seeders.get(moduleName);
        if (!seeder) {
          console.log(`⚠️  未找到模块: ${moduleName}，跳过`);
          continue;
        }

        try {
          const result = await seeder.seed(this.prisma);
          results.push({ name: moduleName, count: result.count });

          if (options?.verbose && result.details?.length) {
            console.log('   📋 详情:');
            result.details.forEach((detail) => console.log(`      - ${detail}`));
          }
        } catch (error) {
          console.error(`❌ 模块 [${moduleName}] 执行失败:`, error);
          throw error;  // 中断后续执行
        }
      }

      // 输出汇总信息
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalCount = results.reduce((sum, r) => sum + r.count, 0);

      console.log('\n🎉 种子数据填充完成！');
      console.log(`⏱️  总耗时: ${duration}s`);
      console.log(`📊 统计: 共执行 ${results.length} 个模块，创建/更新 ${totalCount} 条记录\n`);

      // 输出账号信息（如果执行了 users 模块）
      if (results.some((r) => r.name === 'users')) {
        this.printAccountInfo();
      }
    } catch (error) {
      console.error('\n❌ 种子数据填充失败:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * 清空所有种子数据
   */
  async dropAll(): Promise<void> {
    console.log('\n🗑️  开始清空所有种子数据...\n');

    // 反向删除（先删子表再删父表）
    const dropOrder = [...this.EXECUTION_ORDER].reverse();

    for (const moduleName of dropOrder) {
      const seeder = this.seeders.get(moduleName);
      if (seeder?.drop) {
        try {
          await seeder.drop(this.prisma);
        } catch (error) {
          console.warn(`⚠️  清空模块 [${moduleName}] 失败:`, error);
        }
      }
    }
  }

  /**
   * 解析要执行的模块列表
   *
   * @param moduleNames - 指定的模块名列表（空=全部）
   * @returns 按执行顺序排列的模块名数组
   */
  private resolveModules(moduleNames?: string[]): string[] {
    if (!moduleNames || moduleNames.length === 0) {
      return this.EXECUTION_ORDER;
    }

    // 过滤出有效模块，并保持执行顺序
    return this.EXECUTION_ORDER.filter((name) =>
      moduleNames.includes(name)
    );
  }

  /**
   * 打印默认账号信息
   */
  private printAccountInfo(): void {
    console.log('📝 默认账号信息:');
    console.log('┌─────────────┬──────────────────┬────────────────┐');
    console.log('│ 用户名       │ 邮箱               │ 密码           │');
    console.log('├─────────────┼──────────────────┼────────────────┤');
    console.log('│ admin        │ admin@example.com  │ Admin@123456   │');
    console.log('│ testuser     │ testuser@example.com│ Test@123456    │');
    console.log('└─────────────┴──────────────────┴────────────────┘\n');
  }
}

/** 导出所有种子器类（供外部单独使用） */
export {
  RoleSeeder,
  PermissionSeeder,
  UserSeeder,
  MenuSeeder,
  DictionarySeeder,
  SystemConfigSeeder,
};
