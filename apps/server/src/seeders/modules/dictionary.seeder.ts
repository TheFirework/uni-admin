import type { PrismaClient } from '@prisma/client';
import type { ISeeder, SeedResult } from '../interfaces/seeder.interface';

const DICT_TYPES = [
  { dictCode: 'user_status', dictName: '用户状态', remark: '用户账户启用/禁用状态' },
  { dictCode: 'menu_type', dictName: '菜单类型', remark: '系统菜单节点类型分类' },
  { dictCode: 'gender', dictName: '性别', remark: '用户性别选项' },
  { dictCode: 'common_yes_no', dictName: '通用是否', remark: '通用的是否选项，适用于各类开关场景' },
  { dictCode: 'notice_type', dictName: '通知类型', remark: '系统通知公告的类型分类' },
  { dictCode: 'oper_type', dictName: '操作类型', remark: '系统操作日志的操作类型枚举' },
  { dictCode: 'data_scope', dictName: '数据权限范围', remark: '数据权限控制的范围级别' },
  { dictCode: 'log_type', dictName: '日志类型', remark: '系统日志的分类类型' },
] as const;

const DICT_DATA_MAP: Record<string, { dictLabel: string; dictValue: string; tagType?: string; sort: number }[]> = {
  user_status: [
    { dictLabel: '启用', dictValue: '1', tagType: 'success', sort: 1 },
    { dictLabel: '禁用', dictValue: '0', tagType: 'danger', sort: 2 },
  ],
  menu_type: [
    { dictLabel: '目录', dictValue: '0', tagType: '', sort: 1 },
    { dictLabel: '菜单', dictValue: '1', tagType: '', sort: 2 },
    { dictLabel: '按钮', dictValue: '2', tagType: '', sort: 3 },
  ],
  gender: [
    { dictLabel: '男', dictValue: '1', tagType: 'primary', sort: 1 },
    { dictLabel: '女', dictValue: '2', tagType: 'warning', sort: 2 },
    { dictLabel: '未知', dictValue: '0', tagType: 'info', sort: 3 },
  ],
  common_yes_no: [
    { dictLabel: '是', dictValue: '1', tagType: 'success', sort: 1 },
    { dictLabel: '否', dictValue: '0', tagType: 'danger', sort: 2 },
  ],
  notice_type: [
    { dictLabel: '通知', dictValue: '1', tagType: 'warning', sort: 1 },
    { dictLabel: '公告', dictValue: '2', tagType: 'primary', sort: 2 },
  ],
  oper_type: [
    { dictLabel: '其他', dictValue: '0', tagType: 'info', sort: 1 },
    { dictLabel: '新增', dictValue: '1', tagType: 'success', sort: 2 },
    { dictLabel: '修改', dictValue: '2', tagType: 'warning', sort: 3 },
    { dictLabel: '删除', dictValue: '3', tagType: 'danger', sort: 4 },
    { dictLabel: '授权', dictValue: '4', tagType: 'primary', sort: 5 },
    { dictLabel: '导出', dictValue: '5', tagType: '', sort: 6 },
    { dictLabel: '导入', dictValue: '6', tagType: '', sort: 7 },
    { dictLabel: '清空', dictValue: '7', tagType: 'danger', sort: 8 },
  ],
  data_scope: [
    { dictLabel: '全部数据权限', dictValue: '1', tagType: 'danger', sort: 1 },
    { dictLabel: '本部门及以下数据权限', dictValue: '2', tagType: 'warning', sort: 2 },
    { dictLabel: '本部门数据权限', dictValue: '3', tagType: 'primary', sort: 3 },
    { dictLabel: '本人数据权限', dictValue: '4', tagType: 'success', sort: 4 },
    { dictLabel: '自定义数据权限', dictValue: '5', tagType: 'info', sort: 5 },
  ],
  log_type: [
    { dictLabel: '操作日志', dictValue: '1', tagType: 'primary', sort: 1 },
    { dictLabel: '登录日志', dictValue: '2', tagType: 'success', sort: 2 },
    { dictLabel: '异常日志', dictValue: '3', tagType: 'danger', sort: 3 },
  ],
};

export class DictionarySeeder implements ISeeder {
  readonly name = 'dictionary';

  async seed(prisma: PrismaClient): Promise<SeedResult> {
    console.log('📖 创建字典数据...');

    let dataCount = 0;

    for (const typeInfo of DICT_TYPES) {
      await prisma.sysDictType.upsert({
        where: { dictCode: typeInfo.dictCode },
        update: {},
        create: {
          dictCode: typeInfo.dictCode,
          dictName: typeInfo.dictName,
          remark: typeInfo.remark,
          status: 1,
          isSystem: 1,
        },
      });

      const items = DICT_DATA_MAP[typeInfo.dictCode] || [];
      for (const item of items) {
        await prisma.sysDictData.upsert({
          where: { id: -1 },
          create: {
            dictCode: typeInfo.dictCode,
            dictLabel: item.dictLabel,
            dictValue: item.dictValue,
            tagType: item.tagType || null,
            sort: item.sort,
            status: 1,
          },
          update: {},
        }).catch(() => null);
        dataCount++;
      }
    }

    console.log(`   ✅ 已创建 ${DICT_TYPES.length} 个字典类型，${dataCount} 条字典数据\n`);

    return {
      count: dataCount + DICT_TYPES.length,
      entityName: 'Dictionary',
      details: [`类型: ${DICT_TYPES.length} 个，数据: ${dataCount} 条`],
    };
  }

  async drop(prisma: PrismaClient): Promise<void> {
    console.log('🗑️  开始清理字典...');
    try {
      await prisma.sysDictData.deleteMany({});
      await prisma.sysDictType.deleteMany({});
      console.log('🧹 字典已清空\n');
    } catch (error) {
      console.log('⚠️  字典表不存在或清理失败，跳过');
    }
  }
}
