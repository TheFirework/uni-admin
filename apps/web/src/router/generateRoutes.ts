/**
 * 动态路由生成器
 *
 * 将后端返回的菜单数据转换为 Vue Router 的路由配置，并通过 addRoute() 动态注册
 *
 * Vite 动态导入说明：
 *   - import.meta.glob() 必须使用静态字符串模式（编译时确定）
 *   - 返回的对象 key 是固定格式：/src/views/xxx/index.vue
 *   - 通过构建映射表将后端 component 字符串映射到实际模块
 */

import type { RouteRecordRaw } from 'vue-router';
import type { MenuDTO } from '@/api/modules/system.api';
import { resolveComponent } from './componentResolver';

// ====== 类型定义 ======

export interface ExtendedRouteMeta {
  title: string;
  icon?: string;
  hidden?: boolean;
  affix?: boolean;
  noCache?: boolean;
  externalLink?: string;
  roles?: string[];
  requiresAuth?: boolean;
  [key: string]: unknown;
}

// ====== 组件映射配置 ======

const SPECIAL_COMPONENT_MAP: Record<string, () => Promise<any>> = {
  Layout: () => import('@/layouts/BasicLayout.vue'),
};

/**
 * Vite glob 导入所有视图组件
 * 模式说明：
 *   - @/views/**/index.vue 匹配 views 目录下所有 index.vue 文件
  * - eager: false 表示懒加载（按需加载）
 * - 返回格式: { '/src/views/dashboard/index.vue': () => import(...) }
 */
const viewModules = import.meta.glob('@/views/**/index.vue', { eager: false });

/**
 * 构建组件路径映射表
 * 将后端返回的 component 字符串（如 'system/user'）映射到 glob 的完整 key
 *
 * 映射规则：
 *   后端 component 值 → glob key
 *   'dashboard'        → /src/views/dashboard/index.vue
 *   'system/user'      → /src/views/system/user/index.vue
 *   'system/role'      → /src/views/system/role/index.vue
 */
function buildComponentMap(): Map<string, () => Promise<any>> {
  const map = new Map<string, () => Promise<any>>();

  for (const [fullPath, importer] of Object.entries(viewModules)) {
    // fullPath 格式: /src/views/system/user/index.vue
    // 提取相对路径: system/user (去掉前缀 /src/views/ 和后缀 /index.vue)
    const relativePath = fullPath
      .replace(/^\/src\/views\//, '')
      .replace(/\/index\.vue$/, '');

    // 注册多种格式的 key 以提高兼容性
    map.set(relativePath, importer as () => Promise<any>);

    // 同时注册不带 views 前缀的格式（兼容后端可能返回的不同格式）
    const withoutViewsPrefix = relativePath.replace(/^views\//, '');
    if (withoutViewsPrefix !== relativePath) {
      map.set(withoutViewsPrefix, importer as () => Promise<any>);
    }
  }

  return map;
}

// 预构建组件映射表（模块加载时只执行一次）
const componentMap = buildComponentMap();

// ====== 核心函数 ======

/**
 * 解析 component 字符串到真实的组件对象
 *
 * 支持的输入格式：
 *   1. 特殊值: 'Layout'
 *   2. 完整路径: 'views/dashboard/index'
 *   3. 相对路径: 'system/user', 'system/role/index'
 *   4. 绝对路径: '/system/user'
 *
 * @param componentStr 后端返回的 component 字段值
 * @returns 组件对象或 null（映射失败时）
 */
function resolveComponent(componentStr: string): (() => Promise<any>) | null {
  if (!componentStr) {
    console.warn('[Router] Component path is empty');
    return null;
  }

  // 1. 检查特殊组件值
  if (SPECIAL_COMPONENT_MAP[componentStr]) {
    return SPECIAL_COMPONENT_MAP[componentStr];
  }

  // 2. 规范化路径（去除首尾斜杠、views 前缀）
  let normalizedPath = componentStr
    .replace(/^\/+/, '')           // 去除开头的 /
    .replace(/\/+$/, '')           // 去除结尾的 /
    .replace(/^views\//, '');       // 去除 views/ 前缀

  // 3. 从预构建的映射表中查找
  const importer = componentMap.get(normalizedPath);
  if (importer) {
    return importer;
  }

  // 4. 尝试添加 /index 后缀再次查找
  const withIndexSuffix = `${normalizedPath}/index`;
  const indexerImporter = componentMap.get(withIndexSuffix);
  if (indexerImporter) {
    return indexerImporter;
  }

  // 5. 映射失败，输出调试信息并返回 null
  console.warn(
    `[Router] Component mapping failed: "${componentStr}" (normalized: "${normalizedPath}")`,
    '\nAvailable paths:',
    Array.from(componentMap.keys()).slice(0, 10).join(', '),
    componentMap.size > 10 ? `... and ${componentMap.size - 10} more` : ''
  );

  return null;
}

/**
 * 递归将 MenuDTO 树形结构转换为 RouteRecordRaw 数组
 */
export function generateRoutes(
  menus: MenuDTO[],
  parentPath: string = ''
): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];
  const nameSet = new Set<string>();

  for (const menu of menus) {
    if (menu.meta?.hidden) {
      console.info(`[Router] 跳过隐藏菜单项: ${menu.path} (${menu.meta.title})`);
    }

    if (menu.meta?.externalLink) {
      console.info(`[Router] 跳过外链菜单项: ${menu.path} (${menu.meta.externalLink})`);
      continue;
    }

    const fullPath = parentPath
      ? `${parentPath}/${menu.path}`.replace(/\/+/g, '/')
      : menu.path;

    const component = resolveComponent(menu.component);

    const resolvedComponent = component || (() => import('@/views/error/404.vue'));

    const route: RouteRecordRaw = {
      path: menu.path,
      name: menu.name,
      component: resolvedComponent,
      redirect: menu.redirect,
      meta: {
        ...menu.meta,
        requiresAuth: true,
      } as ExtendedRouteMeta,
    };

    if (nameSet.has(menu.name)) {
      console.warn(`[Router] 重复的路由名称 detected: ${menu.name} (${fullPath})`);
    }
    nameSet.add(menu.name);

    if (menu.children && menu.children.length > 0) {
      route.children = generateRoutes(menu.children, fullPath);
    }

    routes.push(route);
  }

  return routes;
}

/**
 * 注册动态路由到 Vue Router 实例
 */
export async function registerDynamicRoutes(
  router: any,
  routes: RouteRecordRaw[]
): Promise<void> {
  try {
    for (const route of routes) {
      router.addRoute('/', route);
    }

    console.log(`[Router] 成功注册 ${routes.length} 条动态路由`);
  } catch (error) {
    console.error('[Router] 动态路由注册失败:', error);
    throw error;
  }
}

/**
 * 完整的动态路由生成和注册流程
 */
export async function setupDynamicRoutes(
  router: any,
  menuData: MenuDTO[]
): Promise<void> {
  console.log('[Router] 开始生成动态路由...', `共 ${menuData.length} 个顶级菜单`);

  const routes = generateRoutes(menuData);

  await registerDynamicRoutes(router, routes);

  console.log('[Router] 动态路由设置完成');
}
