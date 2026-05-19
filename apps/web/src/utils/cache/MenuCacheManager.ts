import { storage } from '@/utils/storage';
import { routerConfig } from '@/config/router.config';

const CACHE_KEY = 'menu_data';
const VERSION_KEY = 'cache_version';

interface CacheEntry<T> {
  data: T;
  version: string;
  cachedAt: number;
  expiresAt: number;
}

interface CacheResult<T> {
  hit: boolean;
  data?: T;
  source?: 'L1' | 'L2';
  reason?: string;
}

class MenuCacheManager {
  private l1Cache: CacheEntry<unknown> | null = null;
  private appVersion: string;

  constructor() {
    this.appVersion = import.meta.env.VITE_BUILD_VERSION || '0.0.0';
  }

  async initialize(): Promise<void> {
    try {
      const storedVersion = await storage.get<string>(VERSION_KEY, {
        namespace: 'router',
        defaultValue: '',
      });

      if (storedVersion && storedVersion !== this.appVersion) {
        console.log('[MenuCache] 版本不匹配，清除旧缓存:', storedVersion, '→', this.appVersion);
        this.clearAll();
      }

      if (!storedVersion) {
        await storage.set(VERSION_KEY, this.appVersion, { namespace: 'router' });
      }

      console.log('[MenuCache] 初始化完成，版本:', this.appVersion);
    } catch (error) {
      console.warn('[MenuCache] 初始化失败:', error);
    }
  }

  /**
   * 双层缓存读取：L1 内存 → L2 Storage → miss
   * 查找顺序按响应速度从快到慢：
   * 1. L1 内存缓存（<0.1ms，同步）- 会话内高频访问
   * 2. L2 Storage 缓存（1-5ms，异步）- 跨刷新恢复用
   * 3. 都未命中返回 miss，触发网络请求
   */
  async getMenu<T>(): Promise<CacheResult<T>> {
    const l1Result = this.checkL1<T>();
    if (l1Result.hit) return l1Result;

    const l2Result = await this.readFromL2<T>();
    if (l2Result.hit) return l2Result;

    return { hit: false, reason: 'not_found' };
  }

  async setMenu<T>(data: T, source?: string): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      version: this.appVersion,
      cachedAt: now,
      expiresAt: now + routerConfig.cacheTTL,
    };

    this.l1Cache = entry as CacheEntry<unknown>;

    try {
      await storage.set(CACHE_KEY, entry, {
        namespace: 'router',
        ttl: routerConfig.cacheTTL,
      });
      console.log(`[MenuCache] L2 写入成功 (source: ${source || 'network'})`);
    } catch (error) {
      console.warn('[MenuCache] L2 写入失败:', error);
    }
  }

  clearAll(): void {
    this.l1Cache = null;
    try {
      storage.remove(CACHE_KEY, { namespace: 'router' });
    } catch {
      // 忽略清理错误
    }
  }

  getStats(): { l1Size: number; version: string; lastCachedAt: number } {
    return {
      l1Size: this.l1Cache ? 1 : 0,
      version: this.appVersion,
      lastCachedAt: this.l1Cache?.cachedAt || 0,
    };
  }

  private checkL1<T>(): CacheResult<T> {
    if (!this.l1Cache) return { hit: false, reason: 'l1_empty' };
    if (this.l1Cache.version !== this.appVersion) {
      this.l1Cache = null;
      return { hit: false, reason: 'version_mismatch' };
    }
    if (Date.now() > this.l1Cache.expiresAt) {
      this.l1Cache = null;
      return { hit: false, reason: 'expired' };
    }
    return { hit: true, data: this.l1Cache.data as T, source: 'L1' };
  }

  private async readFromL2<T>(): Promise<CacheResult<T>> {
    try {
      const entry = await storage.get<CacheEntry<T>>(CACHE_KEY, {
        namespace: 'router',
      });

      if (!entry) return { hit: false, reason: 'not_found' };

      if (entry.version !== this.appVersion) {
        this.clearAll();
        return { hit: false, reason: 'version_mismatch' };
      }

      if (Date.now() > entry.expiresAt) {
        this.clearAll();
        return { hit: false, reason: 'expired' };
      }

      this.l1Cache = entry as unknown as CacheEntry<unknown>;
      return { hit: true, data: entry.data, source: 'L2' };
    } catch (error) {
      console.warn('[MenuCache] L2 读取失败:', error);
      return { hit: false, reason: 'read_error' };
    }
  }
}

export const menuCacheManager = new MenuCacheManager();
