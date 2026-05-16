import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancelManager } from '../src/managers/CancelManager.js';

describe('CancelManager', () => {
  let manager: CancelManager;

  beforeEach(() => {
    manager = new CancelManager();
  });

  it('注册请求后 size 应增加', () => {
    manager.register({ method: 'GET', url: '/test' } as any);
    expect(manager.size).toBe(1);
  });

  it('cleanup 后 size 应减少', () => {
    const key = manager.generateKey({ method: 'GET', url: '/test' } as any);
    manager.register({ method: 'GET', url: '/test' } as any);
    manager.cleanup(key);
    expect(manager.size).toBe(0);
  });

  it('相同参数应生成相同的 key', () => {
    const key1 = manager.generateKey({
      method: 'GET',
      url: '/users',
      params: { page: 1, size: 10 },
    } as any);
    const key2 = manager.generateKey({
      method: 'GET',
      url: '/users',
      params: { size: 10, page: 1 },
    } as any);
    expect(key1).toBe(key2);
  });

  it('不同参数应生成不同的 key', () => {
    const key1 = manager.generateKey({
      method: 'GET',
      url: '/users',
      params: { page: 1 },
    } as any);
    const key2 = manager.generateKey({
      method: 'GET',
      url: '/users',
      params: { page: 2 },
    } as any);
    expect(key1).not.toBe(key2);
  });

  it('cancelByPage 应取消该页面下所有请求', () => {
    manager.register({ method: 'GET', url: '/a', _internal: { pageKey: 'page1' } } as any);
    manager.register({ method: 'GET', url: '/b', _internal: { pageKey: 'page1' } } as any);
    manager.register({ method: 'GET', url: '/c', _internal: { pageKey: 'page2' } } as any);

    expect(manager.size).toBe(3);
    manager.cancelByPage('page1');
    expect(manager.size).toBe(1);
  });

  it('cleanupAll 应清空所有记录', () => {
    manager.register({ method: 'GET', url: '/a' } as any);
    manager.register({ method: 'POST', url: '/b' } as any);
    expect(manager.size).toBe(2);
    manager.cleanupAll();
    expect(manager.size).toBe(0);
  });

  it('防重复：短时间内重复请求返回旧 controller', async () => {
    const config1 = { method: 'GET', url: '/users', params: { page: 1 } } as any;
    
    // 第一次注册 → 无冲突，返回 null
    const result1 = manager.register(config1);
    expect(result1).toBeNull();

    // 短时间内重复注册 → 返回旧 controller
    const result2 = manager.register(config1);
    expect(result2).not.toBeNull();
    expect(result2).toBeInstanceOf(AbortController);
  });
});
