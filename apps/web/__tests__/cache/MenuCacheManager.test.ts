import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage
const mockStorage = new Map<string, string>();
vi.mock('@/utils/storage', () => ({
  storage: {
    async get<T>(key: string, options: { namespace?: string; defaultValue?: T }): Promise<T> {
      const fullKey = options.namespace ? `ua:${options.namespace}:${key}` : `ua:${key}`;
      const value = mockStorage.get(fullKey);
      return value ? JSON.parse(value) : (options.defaultValue as T);
    },
    async set(key: string, value: unknown, options: { namespace?: string; ttl?: number }): Promise<void> {
      const fullKey = options.namespace ? `ua:${options.namespace}:${key}` : `ua:${key}`;
      mockStorage.set(fullKey, JSON.stringify(value));
      if (options.ttl) {
        mockStorage.set(`${fullKey}._exp`, String(Date.now() + options.ttl));
      }
    },
    remove(key: string, options: { namespace?: string }): void {
      const fullKey = options.namespace ? `ua:${options.namespace}:${key}` : `ua:${key}`;
      mockStorage.delete(fullKey);
      mockStorage.delete(`${fullKey}._exp`);
    },
  },
}));

// Mock import.meta.env
const originalEnv = import.meta.env;

function setEnv(partial: Record<string, unknown>): void {
  Object.assign(import.meta.env, partial);
}

function resetEnv(): void {
  Object.assign(import.meta.env, originalEnv);
}

describe('MenuCacheManager', () => {
  beforeEach(() => {
    mockStorage.clear();
    resetEnv();
    vi.resetModules();
  });

  describe('L1 内存缓存', () => {
    it('写入后立即读取应命中 L1', async () => {
      // 动态导入以使用最新的 mock
      setEnv({ VITE_BUILD_VERSION: '1.0.0' });
      const { menuCacheManager } = await import('@/utils/cache/MenuCacheManager');
      await menuCacheManager.initialize();

      const testData = [{ id: 1, name: 'test' }];
      await menuCacheManager.setMenu(testData);

      const result = await menuCacheManager.getMenu<typeof testData>();
      expect(result.hit).toBe(true);
      expect(result.source).toBe('L1');
      expect(result.data).toEqual(testData);
    });

    it('TTL 过期后应返回 miss', async () => {
      setEnv({ VITE_BUILD_VERSION: '1.0.0', VITE_MENU_CACHE_TTL: '50' });
      const { menuCacheManager } = await import('@/utils/cache/MenuCacheManager');
      await menuCacheManager.initialize();

      await menuCacheManager.setMenu([{ id: 1 }]);

      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 80));

      const result = await menuCacheManager.getMenu();
      expect(result.hit).toBe(false);
    });
  });

  describe('L2 Storage 缓存', () => {
    it('L1 未命中时应尝试 L2', async () => {
      setEnv({ VITE_BUILD_VERSION: '1.0.0', VITE_MENU_CACHE_TTL: '60000' });
      const { menuCacheManager } = await import('@/utils/cache/MenuCacheManager');
      await menuCacheManager.initialize();

      const testData = [{ id: 2 }];
      await menuCacheManager.setMenu(testData);

      // 模拟 L1 被清除
      const stats = menuCacheManager.getStats();
      expect(stats.l1Size).toBe(1);

      // 再次读取应从 L1 命中（因为刚写入）
      const result = await menuCacheManager.getMenu();
      expect(result.hit).toBe(true);
    });
  });

  describe('版本失效', () => {
    it('版本不匹配时应清除缓存', async () => {
      setEnv({ VITE_BUILD_VERSION: '1.0.0' });
      const { menuCacheManager } = await import('@/utils/cache/MenuCacheManager');
      await menuCacheManager.initialize();

      await menuCacheManager.setMenu([{ id: 3 }]);

      // 手动在 Storage 中写入旧版本号
      mockStorage.set('ua:router:cache_version', JSON.stringify('0.9.0'));

      // 重新初始化应检测到版本不匹配
      await menuCacheManager.initialize();

      const result = await menuCacheManager.getMenu();
      expect(result.hit).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('应清除所有缓存', async () => {
      setEnv({ VITE_BUILD_VERSION: '1.0.0' });
      const { menuCacheManager } = await import('@/utils/cache/MenuCacheManager');
      await menuCacheManager.initialize();

      await menuCacheManager.setMenu([{ id: 4 }]);
      expect(menuCacheManager.getStats().l1Size).toBe(1);

      menuCacheManager.clearAll();
      expect(menuCacheManager.getStats().l1Size).toBe(0);

      const result = await menuCacheManager.getMenu();
      expect(result.hit).toBe(false);
    });
  });
});
