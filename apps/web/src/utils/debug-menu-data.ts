/**
 * 临时调试：查看后端返回的菜单数据
 */
import { getMenus } from '@/api/modules/system.api';

export async function debugMenuData() {
  try {
    console.log('\n📡 正在获取后端菜单数据...\n');
    const menus = await getMenus();
    
    console.log('📊 返回的菜单数据:\n');
    
    // 查找 Workbench 和 Dashboard
    const workbench = menus.find(m => m.name === 'Workbench');
    
    if (workbench) {
      console.log('✅ 找到 Workbench:');
      console.log('   ', JSON.stringify(workbench, null, 2));
      
      if (workbench.children?.length > 0) {
        console.log('\n   children:');
        workbench.children.forEach((child, i) => {
          console.log(`   ${i + 1}. `, JSON.stringify(child, null, 2));
        });
      }
    } else {
      console.error('❌ 未找到 Workbench 菜单！');
      console.log('\n所有一级菜单:', menus.map(m => m.name));
    }
    
  } catch (e) {
    console.error('❌ 获取失败:', e);
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).debugMenuData = debugMenuData;
}
