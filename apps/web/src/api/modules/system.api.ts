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

import type { HttpClient } from '@uni-admin/request';

let api: HttpClient;

async function getApi(): Promise<HttpClient> {
  if (!api) {
    const mod = await import('@/lib/request/instances/default.js');
    api = mod.default; // 使用默认导出
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
 *
 * API 响应格式说明：
 *   后端返回标准包装格式 { success, code, message, data }
 *   其中 data 字段可能再次包含 { code, message, data } 结构
 *   实际菜单数组位于 response.data.data（两层嵌套）
 *
 * 本函数自动解包，直接返回 MenuDTO[]
 */
export async function getMenus(): Promise<MenuDTO[]> {
  const instance = await getApi();
  const response = await instance.get('/system/menus');

  // 处理多层 data 包装：response.data.data → MenuDTO[]
  // 兼容两种返回格式：
  //   格式1: { success, code, data: MenuDTO[] } (单层)
  //   格式2: { success, code, data: { code, data: MenuDTO[] } } (双层)
  if (Array.isArray(response)) {
    return response as unknown as MenuDTO[];
  }

  if (response?.data) {
    const innerData = response.data;
    if (Array.isArray(innerData)) {
      return innerData as unknown as MenuDTO[];
    }

    if (innerData?.data && Array.isArray(innerData.data)) {
      return innerData.data as unknown as MenuDTO[];
    }
  }

  console.warn('[getMenus] API 返回格式异常，尝试提取菜单数据:', response);
  return [];
}
