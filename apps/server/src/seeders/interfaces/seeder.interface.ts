/**
 * 种子数据模块统一接口
 *
 * 设计原则：
 *   - 每个种子模块实现此接口，确保行为一致
 *   - 支持独立运行或组合执行
 *   - 提供清晰的日志输出和错误处理
 *
 * 使用方式：
 *   class RoleSeeder implements ISeeder {
 *     async seed(prisma: PrismaClient): Promise<SeedResult> { ... }
 *     async drop(prisma: PrismaClient): Promise<void> { ... }
 *   }
 */

import type { PrismaClient } from '@prisma/client';

/** 种子执行结果 */
export interface SeedResult {
  /** 创建/更新的记录数量 */
  count: number;
  /** 记录类型名称（用于日志） */
  entityName: string;
  /** 详细信息（可选） */
  details?: string[];
}

/** 种子模块接口 */
export interface ISeeder {
  /** 模块名称（用于标识和日志） */
  readonly name: string;

  /**
   * 执行种子数据填充
   *
   * @param prisma - Prisma 客户端实例
   * @returns 执行结果（包含创建数量和详情）
   *
   * 实现要点：
   *   - 使用 upsert 确保幂等性（重复执行不报错）
   *   - 返回详细的操作结果用于日志记录
   *   - 捕获并处理单个记录的错误，不影响其他记录
   */
  seed(prisma: PrismaClient): Promise<SeedResult>;

  /**
   * 清空模块对应的表数据
   *
   * @param prisma - Prisma 客户端实例
   *
   * 注意事项：
   *   - 仅删除当前模块管理的表数据
   *   - 不影响其他模块的数据
   *   - 建议按依赖顺序清理（先子表后父表）
   */
  drop?(prisma: PrismaClient): Promise<void>;
}

/** 种子模块注册表类型 */
export type SeederModuleMap = Map<string, ISeeder>;

/** 种子执行选项 */
export interface SeedOptions {
  /** 要执行的模块列表（空数组 = 全部执行） */
  modules?: string[];
  /** 是否在执行前先清空数据 */
  dropFirst?: boolean;
  /** 是否显示详细日志 */
  verbose?: boolean;
}
