export interface DictItem {
  id: string;
  label: string;
  value: string;
  type: string;
  sort: number;
  status: number;
}

/**
 * 菜单项数据传输对象（DTO）
 * 后端返回的菜单数据结构，用于动态路由生成
 */
export interface MenuDTO {
  id: string;                      // 菜单唯一标识
  name: string;                    // 路由名称（唯一标识）
  path: string;                    // 路由路径（相对于父级）
  component: string;               // 组件路径: 'system/user/index' 或特殊值 'Layout'
  redirect?: string;               // 父路由重定向
  meta: {
    title: string;                 // 菜单标题
    icon?: string;                 // Iconify 图标名: 'mdi:account-group'
    hidden?: boolean;              // 不在侧边栏显示
    affix?: boolean;               // 固定标签(不可关闭)
    noCache?: boolean;             // 不缓存(keep-alive exclude)
    externalLink?: string;         // 外部链接(新窗口打开)
    roles?: string[];              // 允许访问的角色列表
    [key: string]: unknown;        // 扩展字段
  };
  sort: number;                    // 排序权重
  children?: MenuDTO[];            // 子菜单 (无限层级)
}

let api: typeof import('@/lib/request/instances/default.js').defaultInstance;

async function getApi() {
  if (!api) {
    const mod = await import('@/lib/request/instances/default.js');
    api = mod.defaultInstance;
  }
  return api;
}

/** 获取字典列表 */
export async function getDictList(type: string): Promise<DictItem[]> {
  const instance = await getApi();
  return instance.get(`/system/dict/${type}`);
}

/** 
 * 获取当前用户的菜单树
 * 返回完整的菜单树结构（根据用户角色过滤），用于动态路由生成
 */
export async function getMenus(): Promise<MenuDTO[]> {
  const instance = await getApi();
  return instance.get('/system/menus');
}
