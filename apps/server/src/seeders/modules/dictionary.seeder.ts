/**
 * 字典种子数据模块
 *
 * 职责：初始化系统常用字典数据（用户状态/性别/数据类型等）
 *
 * 字典用途：
 *   - 前端下拉选项的数据源
 *   - 数据状态的标准定义
 *   - 避免硬编码，便于统一管理
 */

import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

/** 字典分类及数据 */
const DICTIONARIES = [
  // 用户状态
  ...[
    { label: '启用', value: '1' },
    { label: '禁用', value: '0' },
  ].map((item) => ({ type: 'user_status', ...item, sort: 1, status: 1 })),

  // 菜单类型
  ...[
    { label: '目录', value: '0' },
    { label: '菜单', value: '1' },
    { label: '按钮', value: '2' },
  ].map((item) => ({ type: 'menu_type', ...item, sort: 1, status: 1 })),

  // 性别
  ...[
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
    { label: '未知', value: 'unknown' },
  ].map((item) => ({ type: 'gender', ...item, sort: 1, status: 1 })),
] as const;

export class DictionarySeeder implements ISeeder {
  readonly name = 'dictionary';

  /**
   * 填充字典数据
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('📖 创建字典数据...');

    const results = await Promise.all(
      DICTIONARIES.map((dict) =>
        prisma.dictionary.upsert({
          where: {
            // 使用 type + label + value 组合作为唯一标识
            id: Math.abs(
              this.hashCode(`${dict.type}:${dict.label}:${dict.value}`)
            ) % 100000,  // 简化处理：生成伪唯一 ID
          },
          update: {},
          create: {
            type: dict.type,
            label: dict.label,
            value: dict.value,
            sort: dict.sort,
            status: dict.status,
          },
        }).catch(() => null)  // 冲突时忽略
      )
    );

    const successCount = results.filter(Boolean).length;
    console.log(`   ✅ 已创建 ${successCount} 条字典数据\n`);

    return {
      count: successCount,
      entityName: 'Dictionary',
      details: [`共 ${DICTIONARIES.length} 个分类`],
    };
  }

  /**
   * 清空字典表
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理字典...');
    try {
      await prisma.dictionary.deleteMany({});
      console.log('🧹 字典已清空\n');
    } catch (error) {
      console.log('⚠️  字典表不存在或清理失败，跳过');
    }
  }

  /** 简单的字符串哈希函数（用于生成稳定的 ID） */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;  // Convert to 32bit integer
    }
    return hash;
  }
}
