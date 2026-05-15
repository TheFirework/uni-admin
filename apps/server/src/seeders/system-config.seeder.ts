import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';

/**
 * 系统配置种子数据
 * 初始化系统基础配置（站点名称、分页、上传、JWT 等）
 *
 * ⚠️ 注意：运行前需确保 Prisma Schema 中已定义 SystemConfig 模型
 * 可参考以下模型定义：
 * model SystemConfig {
 *   id        Int      @id @default(autoincrement())
 *   key       String   @unique @map("key")     // 配置键
 *   value     String   @map("value")            // 配置值
 *   type      String   @map("type")             // 值类型: string/number/boolean/json
 *   group     String?  @map("group")            // 配置分组
 *   name      String   @map("name")             // 显示名称
 *   remark    String?  @map("remark")           // 备注
 *   isPublic  Boolean  @default(false) @map("is_public")  // 是否公开（前端可访问）
 *   status    Int      @default(1) @map("status")
 *   createdAt DateTime @default(now()) @map("created_at")
 *   updatedAt DateTime @updatedAt @map("updated_at")
 *
 *   @@map("system_configs")
 * }
 */
export class SystemConfigSeeder implements Seeder {
  private prisma = new PrismaClient();

  /**
   * 插入系统配置数据
   */
  async seed() {
    console.log('🌱 开始播种系统配置...');

    // 定义基础系统配置
    const configs = [
      // 站点基本配置
      {
        key: 'site_name',
        value: 'Uni-Admin 管理后台',
        type: 'string',
        group: 'basic',
        name: '站点名称',
        remark: '系统显示的站点标题',
        isPublic: true,
        status: 1,
      },
      // 分页配置
      {
        key: 'page_size',
        value: '20',
        type: 'number',
        group: 'pagination',
        name: '默认分页大小',
        remark: '列表默认每页显示条数',
        isPublic: false,
        status: 1,
      },
      {
        key: 'page_sizes',
        value: '[10, 20, 50, 100]',
        type: 'json',
        group: 'pagination',
        name: '可选分页大小',
        remark: '用户可选择的分页选项',
        isPublic: false,
        status: 1,
      },
      // 上传配置
      {
        key: 'upload_max_size',
        value: '10',
        type: 'number',
        group: 'upload',
        name: '上传文件大小限制 (MB)',
        remark: '单个文件最大上传大小',
        isPublic: false,
        status: 1,
      },
      {
        key: 'upload_allowed_types',
        value: '["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx"]',
        type: 'json',
        group: 'upload',
        name: '允许上传的文件类型',
        remark: '支持的文件扩展名列表',
        isPublic: false,
        status: 1,
      },
      // JWT 配置提示（实际值从环境变量读取）
      {
        key: 'jwt_expires_in',
        value: '7d',
        type: 'string',
        group: 'jwt',
        name: 'JWT 过期时间',
        remark: '访问令牌有效期（如：7d = 7天）',
        isPublic: false,
        status: 1,
      },
      {
        key: 'jwt_refresh_expires_in',
        value: '30d',
        type: 'string',
        group: 'jwt',
        name: '刷新令牌过期时间',
        remark: '刷新令牌有效期（如：30d = 30天）',
        isPublic: false,
        status: 1,
      },
    ];

    // 批量插入或更新配置（使用 configKey 作为唯一标识）
    for (const config of configs) {
      await this.prisma.systemConfig.upsert({
        where: { configKey: config.key },
        update: {
          configValue: config.value,
          groupName: config.group,
          remark: config.remark,
          status: config.status,
        },
        create: {
          configKey: config.key,
          configValue: config.value,
          groupName: config.group,
          remark: config.remark,
          status: config.status,
        },
      });
      console.log(`  ✅ 配置 [${config.key}] 已就绪`);
    }

    console.log(`✨ 系统配置播种完成 (共 ${configs.length} 条)\n`);
  }

  /**
   * 清空系统配置表
   */
  async drop() {
    console.log('🗑️  开始清理系统配置...');

    try {
      await this.prisma.systemConfig.deleteMany({});
      console.log('🧹 系统配置已清空\n');
    } catch (error) {
      console.log('⚠️  系统配置表不存在，跳过清理');
    }
  }
}
