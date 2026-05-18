/**
 * 动态路由生成器
 * 将后端返回的菜单数据转换为 Vue Router 的路由配置，并通过 addRoute() 动态注册
 */

import type { RouteRecordRaw } from 'vue-router';
import type { MenuDTO } from '@/api/modules/system.api';
import { setRoutesLoadedStatus, getRoutesLoadedStatus } from './guards';

// ====== 类型定义 ======

/**
 * 扩展的路由元信息类型
 * 在 Vue Router 基础上增加业务相关的 meta 字段
 */
export interface ExtendedRouteMeta {
  title: string;                 // 菜单标题
  icon?: string;                 // Iconify 图标名
  hidden?: boolean;              // 不在侧边栏显示
  affix?: boolean;               // 固定标签(不可关闭)
  noCache?: boolean;             // 不缓存(keep-alive exclude)
  externalLink?: string;         // 外部链接(新窗口打开)
  roles?: string[];              // 允许访问的角色列表
  requiresAuth?: boolean;        // 是否需要认证
  [key: string]: unknown;        // 扩展字段
}

// ====== 组件映射配置 ======

/** 特殊组件值的硬编码映射表 */
const SPECIAL_COMPONENT_MAP: Record<string, () => Promise<any>> = {
  'Layout': () => import('@/layouts/BasicLayout.vue'),
};

/** 动态导入的视图组件模块映射表（使用 Vite 的 glob） */
const viewModules = import.meta.glob('@/views/**/index.vue');

// ====== 核心函数 ======

/**
 * 解析 component 字符串到真实的组件对象
 * @param componentStr 后端返回的 component 字段值
 * @returns 组件对象或 null（映射失败时）
 */
function resolveComponent(componentStr: string): any {
  // 1. 检查是否为特殊组件值
  if (SPECIAL_COMPONENT_MAP[componentStr]) {
    return SPECIAL_COMPONENT_MAP[componentStr]();
  }

  // 2. 尝试从 views 目录动态导入
  // 将 'system/user/index' 转换为 '/src/views/system/user/index.vue'
  const key = `/src/views/${componentStr}.vue`;

  if (viewModules[key]) {
    return viewModules[key]();
  }

  // 3. 映射失败，输出警告并返回 null
  console.warn(`[Router] Component mapping failed: ${componentStr}`);
  return null;
}

/**
 * 递归将 MenuDTO 树形结构转换为 RouteRecordRaw 数组
 * @param menus 菜单数据数组
 * @param parentPath 父级路径（用于拼接完整路径）
 * @returns 路由配置数组
 */
export function generateRoutes(
  menus: MenuDTO[],
  parentPath: string = ''
): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  // 用于检测 name 重复的 Set
  const nameSet = new Set<string>();

  for (const menu of menus) {
    // 跳过隐藏的菜单项（不渲染到侧边栏，但仍注册路由）
    if (menu.meta?.hidden) {
      console.info(`[Router] 跳过隐藏菜单项: ${menu.path} (${menu.meta.title})`);
      // 注意：这里不 continue，因为即使隐藏也要注册路由
    }

    // 过滤外链类型的菜单项（不在路由中注册）
    if (menu.meta?.externalLink) {
      console.info(`[Router] 跳过外链菜单项: ${menu.path} (${menu.meta.externalLink})`);
      continue;
    }

    // 构建完整的路径
    const fullPath = parentPath
      ? `${parentPath}/${menu.path}`.replace(/\/+/g, '/')
      : menu.path;

    // 解析 component
    const component = resolveComponent(menu.component);

    // 如果组件映射失败，降级到 404 页面
    const resolvedComponent = component || (() => import('@/views/error/404.vue'));

    // 构建 route 配置
    const route: RouteRecordRaw = {
      path: menu.path,
      name: menu.name,
      component: resolvedComponent,
      redirect: menu.redirect,
      meta: {
        ...menu.meta,
        requiresAuth: true, // 动态路由默认都需要认证
      } as ExtendedRouteMeta,
    };

    // Name 去重校验
    if (nameSet.has(menu.name)) {
      console.warn(`[Router] 重复的路由名称 detected: ${menu.name} (${fullPath})`);
    }
    nameSet.add(menu.name);

    // 递归处理子菜单
    if (menu.children && menu.children.length > 0) {
      route.children = generateRoutes(menu.children, fullPath);
    }

    routes.push(route);
  }

  return routes;
}

/**
 * 注册动态路由到 Vue Router 实例
 * @param router Vue Router 实例
 * @param routes 要注册的路由配置数组
 */
export async function registerDynamicRoutes(
  router: any,
  routes: RouteRecordRaw[]
): Promise<void> {
  try {
    // 遍历转换结果逐个调用 router.addRoute()
    for (const route of routes) {
      // 将动态路由添加为 BasicLayout 的子路由
      // 注意：这里的 '/' 是 BasicLayout 的 path
      router.addRoute('/', route);
    }

    // 设置动态路由加载状态标志位
    setRoutesLoadedStatus(true);

    console.log(`[Router] 成功注册 ${routes.length} 条动态路由`);
  } catch (error) {
    console.error('[Router] 动态路由注册失败:', error);
    setRoutesLoadedStatus(false);
    throw error;
  }
}

/**
 * 完整的动态路由生成和注册流程
 * @param router Vue Router 实例
 * @param menuData 后端返回的菜单数据
 */
export async function setupDynamicRoutes(
  router: any,
  menuData: MenuDTO[]
): Promise<void> {
  console.log('[Router] 开始生成动态路由...', `共 ${menuData.length} 个顶级菜单`);

  // 1. 将菜单数据转换为路由配置
  const routes = generateRoutes(menuData);

  // 2. 注册路由
  await registerDynamicRoutes(router, routes);

  console.log('[Router] 动态路由设置完成');
}
