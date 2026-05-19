/**
 * 检查 componentResolver 的实际映射表
 */

import { componentMap } from '@/router/componentResolver';
import { resolveComponent } from '@/router/componentResolver';

export function checkComponentMap() {
  console.log('\n📦 ========== 组件映射表检查 ==========\n');
  console.log(`总共有 ${componentMap.size} 个组件映射\n`);

  // 查找所有包含 workbench 的条目
  const workbenchEntries = Array.from(componentMap.entries()).filter(
    ([key]) => key.includes('workbench')
  );

  if (workbenchEntries.length > 0) {
    console.log('✅ 找到 workbench 相关的组件:\n');
    for (const [path] of workbenchEntries) {
      console.log(`   - "${path}"`);
    }
  } else {
    console.error('❌ 未找到任何 workbench 相关的组件！\n');

    // 显示所有可用的组件路径（前20个）
    console.log('可用的组件路径示例:\n');
    Array.from(componentMap.keys()).slice(0, 20).forEach((path) => {
      console.log(`   - "${path}"`);
    });

    if (componentMap.size > 20) {
      console.log(`\n... 还有 ${componentMap.size - 20} 个`);
    }
  }

  // 测试解析
  console.log('\n🔍 测试组件解析:\n');

  const testPaths = [
    'views/workbench/dashboard/index',
    'workbench/dashboard/index',
    'workbench/dashboard',
    'workbench/dashboard/index.vue',
  ];

  for (const path of testPaths) {
    const result = resolveComponent(path);
    console.log(`${result ? '✅' : '❌'} "${path}" → ${result ? '成功' : '失败'}`);
  }

  // 额外：显示所有包含 "dashboard" 的路径
  console.log('\n📋 所有包含 "dashboard" 的映射:\n');
  const dashboardEntries = Array.from(componentMap.entries()).filter(
    ([key]) => key.toLowerCase().includes('dashboard')
  );

  if (dashboardEntries.length > 0) {
    for (const [path] of dashboardEntries) {
      console.log(`   - "${path}"`);
    }
  } else {
    console.error('   ❌ 无任何 dashboard 相关映射！');
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).checkComponentMap = checkComponentMap;
}
