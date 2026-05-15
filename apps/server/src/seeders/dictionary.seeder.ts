import { Seeder } from 'nestjs-seeder';
import { PrismaClient } from '@prisma/client';

/**
 * 字典种子数据
 * 初始化系统基础字典（状态码、性别、数据类型等）
 *
 * ⚠️ 注意：运行前需确保 Prisma Schema 中已定义 Dictionary 模型
 * 可参考以下模型定义：
 * model Dictionary {
 *   id        Int      @id @default(autoincrement())
 *   type      String   @map("type")       // 字典类型
 *   label     String   @map("label")      // 显示名称
 *   value     String   @map("value")      // 字典值
 *   sort      Int      @default(0) @map("sort")
 *   status    Int      @default(1) @map("status")
 *   remark    String?  @map("remark")
 *   createdAt DateTime @default(now()) @map("created_at")
 *   updatedAt DateTime @updatedAt @map("updated_at")
 *
 *   @@map("dictionaries")
 * }
 */
export class DictionarySeeder implements Seeder {
  private prisma = new PrismaClient();

  /**
   * 插入字典数据
   */
  async seed() {
    console.log('🌱 开始播种字典数据...');

    // 定义状态码字典
    const statusDict = [
      { type: 'status', label: '启用', value: 'enabled', sort: 1, remark: '启用状态' },
      { type: 'status', label: '禁用', value: 'disabled', sort: 2, remark: '禁用状态' },
      { type: 'status', label: '已删除', value: 'deleted', sort: 3, remark: '已删除' },
    ];

    // 定义性别字典
    const genderDict = [
      { type: 'gender', label: '男', value: 'male', sort: 1, remark: '男性' },
      { type: 'gender', label: '女', value: 'female', sort: 2, remark: '女性' },
      { type: 'gender', label: '保密', value: 'unknown', sort: 3, remark: '未知/保密' },
    ];

    // 定义数据类型字典
    const dataTypeDict = [
      { type: 'data_type', label: '字符串', value: 'string', sort: 1, remark: 'String 类型' },
      { type: 'data_type', label: '数字', value: 'number', sort: 2, remark: 'Number 类型' },
      { type: 'data_type', label: '布尔值', value: 'boolean', sort: 3, remark: 'Boolean 类型' },
      { type: 'data_type', label: '日期', value: 'date', sort: 4, remark: 'Date 类型' },
      { type: 'data_type', label: '数组', value: 'array', sort: 5, remark: 'Array 类型' },
      { type: 'data_type', label: '对象', value: 'object', sort: 6, remark: 'Object 类型' },
    ];

    // 合并所有字典数据
    const allDicts = [...statusDict, ...genderDict, ...dataTypeDict];

    // 批量插入或更新字典（使用 type + value 作为唯一标识）
    for (const dict of allDicts) {
      // 尝试查找已存在的记录
      const existing = await this.prisma.dictionary.findFirst({
        where: {
          AND: [
            { type: dict.type },
            { value: dict.value },
          ],
        },
      });

      if (existing) {
        // 更新现有记录
        await this.prisma.dictionary.update({
          where: { id: existing.id },
          data: dict,
        });
      } else {
        // 创建新记录
        // @ts-ignore - Dictionary 模型可能尚未定义
        await this.prisma.dictionary.create({
          data: dict,
        });
      }
      console.log(`  ✅ 字典 [${dict.type}/${dict.label}] 已就绪`);
    }

    console.log(`✨ 字典数据播种完成 (共 ${allDicts.length} 条)\n`);
  }

  /**
   * 清空字典表
   */
  async drop() {
    console.log('🗑️  开始清理字典数据...');

    try {
      await this.prisma.dictionary.deleteMany({});
      console.log('🧹 字典数据已清空\n');
    } catch (error) {
      console.log('⚠️  字典表不存在，跳过清理');
    }
  }
}
