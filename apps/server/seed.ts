/**
 * 种子数据初始化脚本（主入口）
 *
 * 使用方法:
 *   # 1. 执行所有模块
 *   npx tsx seed.ts
 *
 *   # 2. 仅执行指定模块
 *   npx tsx seed.ts --module=roles,users
 *   npx tsx seed.ts --module=roles --module=users
 *
 *   # 3. 先清空再填充
 *   npx tsx seed.ts --drop
 *
 *   # 4. 使用 npm scripts (推荐)
 *   npm run seed              # 全部执行
 *   npm run seed:roles        # 仅角色
 *   npm run seed:users        # 仅用户
 *   npm run seed:drop         # 清空全部
 *
 * 模块列表:
 *   - roles:        角色数据（admin/user/guest）
 *   - permissions:  权限数据（CRUD/管理权限）
 *   - users:        用户账号（admin/testuser）
 *   - menus:        菜单结构（仪表盘/系统管理）
 *   - dictionary:   字典数据（状态/类型）
 *   - system-config: 系统配置（分页/JWT/上传）
 */

import { SeedCoordinator } from './src/seeders/index';

// 解析命令行参数
const args = process.argv.slice(2);

function parseArgs(): { modules?: string[]; dropFirst: boolean } {
  const modules: string[] = [];
  let dropFirst = false;

  for (const arg of args) {
    if (arg === '--drop' || arg === '-d') {
      dropFirst = true;
    } else if (arg.startsWith('--module=')) {
      // 支持逗号分隔的模块列表: --module=roles,users
      const moduleList = arg.split('=')[1];
      modules.push(...moduleList.split(',').map((m) => m.trim()));
    } else if (arg.startsWith('-m')) {
      // 简写形式: -m roles -m users
      modules.push(arg.slice(2));
    }
  }

  return { modules: modules.length > 0 ? modules : undefined, dropFirst };
}

async function main() {
  const options = parseArgs();

  // 创建协调器并执行
  const coordinator = new SeedCoordinator();
  await coordinator.run({
    ...options,
    verbose: true,
  });
}

main().catch((error) => {
  console.error('❌ 种子脚本执行失败:', error);
  process.exit(1);
});
