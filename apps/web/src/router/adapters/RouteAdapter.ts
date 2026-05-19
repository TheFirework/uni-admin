import type { RouteRecordRaw } from 'vue-router';
import { routerConfig } from '@/config/router.config';
import { getModuleRoutes } from '@/router/routes/modules/_index';
import type { UniAdminRouteRecord } from '@/router/routes/types';
import { getMenus } from '@/api/modules/system.api';
import { generateRoutesFromMenus } from '@/router/staticMenus';
import { normalizeAuthority } from '@/router/routes/types';

const DYNAMIC_FIELDS = new Set(['access', 'authority', 'permission', 'roles', 'title', 'icon', 'hidden']);
const STATIC_FIELDS = new Set(['keepAlive', 'affix', 'order']);

class FrontendAdapter {
  static async fetch(): Promise<RouteRecordRaw[]> {
    console.log('[RouteAdapter] 使用前端静态路由');
    return getModuleRoutes() as unknown as RouteRecordRaw[];
  }
}

class BackendAdapter {
  static async fetch(): Promise<RouteRecordRaw[]> {
    console.log('[RouteAdapter] 使用后端 API 路由');
    const menus = await getMenus();
    return generateRoutesFromMenus(menus);
  }
}

class MixedAdapter {
  private static buildKey(route: RouteRecordRaw | UniAdminRouteRecord): string {
    return (route.name as string) || route.path;
  }

  private static deepMergeRoute(
    base: UniAdminRouteRecord,
    override: RouteRecordRaw,
  ): RouteRecordRaw {
    const mergedChildren = this.mergeChildren(base.children || [], override.children || []);
    const mergedMeta = this.deepMergeMeta(
      base.meta as Record<string, unknown>,
      (override.meta as Record<string, unknown>) || {},
    );

    return {
      ...override,
      meta: mergedMeta as RouteRecordRaw['meta'],
      children: mergedChildren.length > 0 ? mergedChildren : undefined,
    };
  }

  private static mergeChildren(
    baseChildren: UniAdminRouteRecord[],
    overrideChildren: RouteRecordRaw['children'],
  ): RouteRecordRaw[] {
    if (!overrideChildren || overrideChildren.length === 0) {
      return baseChildren as unknown as RouteRecordRaw[];
    }

    const overrideMap = new Map<string, RouteRecordRaw>();
    for (const child of overrideChildren) {
      overrideMap.set(this.buildKey(child), child);
    }

    const result: RouteRecordRaw[] = [];
    for (const baseChild of baseChildren) {
      const key = this.buildKey(baseChild);
      const matched = overrideMap.get(key);
      if (matched) {
        result.push(this.deepMergeRoute(baseChild, matched));
        overrideMap.delete(key);
      } else {
        result.push(baseChild as unknown as RouteRecordRaw);
      }
    }

    for (const [, remaining] of overrideMap) {
      result.push(remaining);
    }

    return result;
  }

  private static deepMergeMeta(
    baseMeta: Record<string, unknown>,
    overrideMeta: Record<string, unknown>,
  ): Record<string, unknown> {
    const allKeys = new Set([...Object.keys(baseMeta), ...Object.keys(overrideMeta)]);
    const merged: Record<string, unknown> = {};

    for (const key of allKeys) {
      if (STATIC_FIELDS.has(key)) {
        merged[key] = baseMeta[key] ?? overrideMeta[key];
      } else {
        merged[key] = overrideMeta[key] ?? baseMeta[key];
      }
    }

    const access = normalizeAuthority(merged);
    if (access !== undefined) {
      merged.access = access;
      delete merged.authority;
      delete merged.roles;
    }

    return merged;
  }

  static async fetch(): Promise<RouteRecordRaw[]> {
    console.log('[RouteAdapter] 使用混合模式路由');
    const baseRoutes = await FrontendAdapter.fetch();

    const menus = await getMenus();
    const overrideRoutes = generateRoutesFromMenus(menus);

    return this.mergeWithStrategy(baseRoutes, overrideRoutes);
  }

  /**
   * 混合模式核心合并算法
   * 策略：以静态路由为基础，动态路由按 name/path 覆盖
   * - 相同 key 的路由执行深度合并（children 递归）
   * - 仅存在于动态的新路由追加到末尾
   * - meta 字段按优先级矩阵决定（权限类动态优先，行为类静态优先）
   */
  private static mergeWithStrategy(
    baseRoutes: RouteRecordRaw[],
    overrideRoutes: RouteRecordRaw[],
  ): RouteRecordRaw[] {
    const overrideMap = new Map<string, RouteRecordRaw>();
    for (const route of overrideRoutes) {
      overrideMap.set(this.buildKey(route), route);
    }

    const result: RouteRecordRaw[] = [];
    const mergedKeys = new Set<string>();

    for (const base of baseRoutes) {
      const key = this.buildKey(base);
      const matched = overrideMap.get(key);
      if (matched) {
        result.push(this.deepMergeRoute(base as unknown as UniAdminRouteRecord, matched));
        mergedKeys.add(key);
      } else {
        result.push(base);
      }
    }

    for (const [key, override] of overrideMap) {
      if (!mergedKeys.has(key)) {
        result.push(override);
      }
    }

    return result;
  }
}

export class RouteAdapter {
  /**
   * 统一路由获取入口
   * 根据 VITE_ROUTER_MODE 环境变量分发到不同适配器：
   * - frontend: 从本地 .ts 文件加载（开发/离线用）
   * - backend: 从后端 API 加载（生产环境，支持动态权限）
   * - mixed: 先加载静态基础路由，再用动态路由覆盖（灰度/测试用）
   *
   * 注意：不会自动降级，API 失败会直接抛出错误
   * 请确保 VITE_ROUTER_MODE 配置与实际环境匹配
   */
  static async fetchRoutes(): Promise<RouteRecordRaw[]> {
    switch (routerConfig.mode) {
      case 'frontend':
        return FrontendAdapter.fetch();
      case 'backend':
        return BackendAdapter.fetch();
      case 'mixed':
        return MixedAdapter.fetch();
      default:
        throw new Error(`[RouteAdapter] 未知的路由模式 "${routerConfig.mode}"，请检查 VITE_ROUTER_MODE 环境变量`);
    }
  }
}
