import type { UniAdminRouteRecord } from '../types';

const moduleContext = import.meta.glob('./*.ts', { eager: true });

let cachedModuleRoutes: UniAdminRouteRecord[] | null = null;

function collectModuleRoutes(): UniAdminRouteRecord[] {
  const routes: UniAdminRouteRecord[] = [];

  for (const [, mod] of Object.entries(moduleContext)) {
    const exports = mod as Record<string, unknown>;
    for (const value of Object.values(exports)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'path' in value[0]) {
        routes.push(...(value as UniAdminRouteRecord[]));
      }
    }
  }

  console.log(`[RouteModules] 已收集 ${routes.length} 个业务路由`);
  return routes;
}

export function getModuleRoutes(): UniAdminRouteRecord[] {
  if (!cachedModuleRoutes) {
    cachedModuleRoutes = collectModuleRoutes();
  }
  return cachedModuleRoutes;
}

export function resetModuleCache(): void {
  cachedModuleRoutes = null;
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    resetModuleCache();
    console.log('[RouteModules] HMR 热更新，已重置路由缓存');
  });
}
