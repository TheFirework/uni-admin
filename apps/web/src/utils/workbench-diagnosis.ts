/**
 * 快速诊断工具 - 检查 /workbench/dashboard 路由状态
 */

export async function diagnoseWorkbenchRoute() {
  console.log('\n🔬 ========== Workbench 路由诊断 ==========\n');

  // 1. 检查组件解析器
  const { resolveComponent } = await import('@/router/componentResolver');

  const testPaths = [
    'views/workbench/dashboard/index',
    'workbench/dashboard/index',
    'workbench/dashboard',
  ];

  console.log('📦 [1/4] 组件解析测试:\n');
  for (const path of testPaths) {
    const resolved = resolveComponent(path);
    console.log(`${resolved ? '✅' : '❌'} "${path}" → ${resolved ? '成功' : '失败'}`);
  }

  // 2. 检查路由注册情况
  const router = (await import('@/router')).default;
  const allRoutes = router.getRoutes();

  console.log('\n📊 [2/4] 路由注册情况:\n');
  console.log(`总路由数: ${allRoutes.length}`);

  const workbenchRoute = allRoutes.find(r => r.name === 'Workbench');
  const dashboardRoute = allRoutes.find(r => r.name === 'Dashboard');

  if (workbenchRoute) {
    console.log(`\n✅ Workbench 路由:`);
    console.log(`   path: "${workbenchRoute.path}"`);
    console.log(`   有组件: ${!!workbenchRoute.component}`);
    console.log(`   redirect: ${workbenchRoute.redirect || '无'}`);
    console.log(`   children: ${(workbenchRoute.children || []).length}个`);

    if (workbenchRoute.children?.length > 0) {
      console.log(`   子路由列表:`);
      workbenchRoute.children.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} ("${c.path}") - 组件: ${c.component ? '✅' : '❌'}`);
      });
    }
  } else {
    console.error('\n❌ Workbench 路由未注册！');
  }

  if (dashboardRoute) {
    console.log(`\n✅ Dashboard 路由:`);
    console.log(`   path: "${dashboardRoute.path}"`);
    console.log(`   有组件: ${!!dashboardRoute.component}`);
    console.log(`   父级: ${dashboardRoute.parent?.name || '(无)'}`);
  } else {
    console.error('\n❌ Dashboard 路由未注册！');
  }

  // 3. 测试路径解析
  console.log('\n🔍 [3/4] 路径解析测试:\n');

  const testUrls = ['/workbench', '/workbench/dashboard'];

  for (const url of testUrls) {
    const resolved = router.resolve(url);
    const finalMatch = resolved.matched[resolved.matched.length - 1];
    const is404 = finalMatch?.name === 'NotFound';

    console.log(`${is404 ? '❌' : '✅'} resolve("${url}")`);
    console.log(`   匹配链:`, resolved.matched.map(m => `${m.name}(${m.path})`).join(' → '));
    console.log(`   最终: ${finalMatch?.name}${is404 ? ' (404!)' : ''}`);
  }

  // 4. 检查 BasicLayout children 顺序
  console.log('\n📋 [4/4] BasicLayout children 顺序:\n');

  const basicLayout = allRoutes.find(r => r.name === 'BasicLayout');
  if (basicLayout?.children) {
    basicLayout.children.forEach((child, i) => {
      const isNotFound = child.name === 'NotFound';
      console.log(`${i + 1}. ${isNotFound ? '🚫' : '✅'} ${child.name || '(无名)'} ("${child.path}")${isNotFound ? ' ← 404在这里!' : ''}`);
    });

    const notFoundIndex = basicLayout.children.findIndex(c => c.name === 'NotFound');
    const dashboardIndex = basicLayout.children.findIndex(c => c.name === 'Dashboard');

    if (notFoundIndex !== -1 && dashboardIndex !== -1 && notFoundIndex < dashboardIndex) {
      console.error('\n⚠️ 问题发现: NotFound 在 Dashboard 之前！这会导致 Dashboard 被 404 拦截');
    }
  }

  console.log('\n💡 如果看到 "组件解析失败" 或 "路由未注册"，请提供完整日志\n');
}

// 注入全局
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).diagnoseWorkbenchRoute = diagnoseWorkbenchRoute;
}
