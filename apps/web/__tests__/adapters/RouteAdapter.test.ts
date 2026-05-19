import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/router/routes/modules/_index.ts', () => ({
  getModuleRoutes: () => [
    { path: '/dashboard', name: 'Dashboard', meta: { title: '仪表盘' } },
    { path: '/system', name: 'System', meta: { title: '系统管理' }, children: [] },
  ],
}));

vi.mock('@/router/staticMenus', () => ({
  getMenus: vi.fn().mockResolvedValue([
    {
      id: '1',
      name: 'ApiDashboard',
      path: '/dashboard',
      component: 'dashboard/index',
      meta: { title: 'API仪表盘', icon: 'mdi:dashboard' },
      sort: 0,
    },
  ]),
  generateRoutesFromMenus: vi.fn((menus) =>
    menus.map((m) => ({ ...m, component: () => Promise.resolve({}) })),
  ),
}));

const originalEnv = import.meta.env;

function setEnv(partial: Record<string, unknown>): void {
  Object.assign(import.meta.env, partial);
}

function resetEnv(): void {
  Object.assign(import.meta.env, originalEnv);
}

describe('RouteAdapter', () => {
  beforeEach(() => {
    resetEnv();
    vi.resetModules();
  });

  describe('frontend 模式', () => {
    it('应从静态文件加载路由', async () => {
      setEnv({ VITE_ROUTER_MODE: 'frontend' });
      const { RouteAdapter } = await import('@/router/adapters/RouteAdapter');

      const routes = await RouteAdapter.fetchRoutes();
      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].path).toBe('/dashboard');
    });
  });

  describe('backend 模式', () => {
    it('应调用 getMenus API', async () => {
      setEnv({ VITE_ROUTER_MODE: 'backend' });
      const { RouteAdapter } = await import('@/router/adapters/RouteAdapter');

      const routes = await RouteAdapter.fetchRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('mixed 模式', () => {
    it('应合并静态和动态路由', async () => {
      setEnv({ VITE_ROUTER_MODE: 'mixed' });
      const { RouteAdapter } = await import('@/router/adapters/RouteAdapter');

      const routes = await RouteAdapter.fetchRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });
  });
});
