/**
 * 系统配置种子数据模块
 *
 * 职责：初始化系统运行时配置（分页/JWT/上传等）
 *
 * 配置说明：
 *   - 这些配置通常在管理后台可编辑
 *   - 种子数据提供默认值和初始配置
 *   - configKey 作为唯一标识符
 */

import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

/** 系统配置数据定义 */
const SYSTEM_CONFIGS = [
  // 分页配置
  {
    configKey: 'page_size_default',
    configValue: '20',
    groupName: 'pagination',
    remark: '默认每页显示条数',
  },
  {
    configKey: 'page_sizes',
    configValue: '[10, 20, 50, 100]',
    groupName: 'pagination',
    remark: '可选分页大小列表',
  },

  // 上传配置
  {
    configKey: 'upload_max_size',
    configValue: '10',
    groupName: 'upload',
    remark: '上传文件大小限制 (MB)',
  },
  {
    configKey: 'upload_allowed_types',
    configValue: '["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx"]',
    groupName: 'upload',
    remark: '允许的文件扩展名',
  },

  // JWT 配置提示（实际值从环境变量读取）
  {
    configKey: 'jwt_expires_in',
    configValue: '7d',
    groupName: 'jwt',
    remark: '访问令牌有效期（如：7d = 7天）',
  },
  {
    configKey: 'jwt_refresh_expires_in',
    configValue: '30d',
    groupName: 'jwt',
    remark: '刷新令牌有效期',
  },

  // 系统信息
  {
    configKey: 'system_name',
    configValue: 'Uni-Admin 管理后台',
    groupName: 'system',
    remark: '系统名称',
  },
  {
    configKey: 'system_version',
    configValue: '1.0.0',
    groupName: 'system',
    remark: '当前系统版本号',
  },
] as const;

export class SystemConfigSeeder implements ISeeder {
  readonly name = 'system-config';

  /**
   * 填充系统配置数据
   * 使用 upsert 基于 configKey 保证幂等性
   */
  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('⚙️ 创建系统配置...');

    const results = await Promise.all(
      SYSTEM_CONFIGS.map((config) =>
        prisma.systemConfig.upsert({
          where: { configKey: config.configKey },
          update: {
            configValue: config.configValue,
            groupName: config.groupName,
            remark: config.remark,
            status: 1,
          },
          create: {
            configKey: config.configKey,
            configValue: config.configValue,
            groupName: config.groupName,
            remark: config.remark,
            status: 1,
          },
        })
      )
    );

    console.log(`   ✅ 已创建 ${results.length} 条系统配置\n`);

    return {
      count: results.length,
      entityName: 'SystemConfig',
      details: results.map((c) => `${c.configKey} | ${c.groupName}`),
    };
  }

  /**
   * 清空系统配置表
   */
  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理系统配置...');
    try {
      await prisma.systemConfig.deleteMany({});
      console.log('🧹 系统配置已清空\n');
    } catch (error) {
      console.log('⚠️  系统配置表不存在或清理失败，跳过');
    }
  }
}
