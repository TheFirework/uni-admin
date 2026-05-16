import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '../src/managers/TokenManager.js';

describe('TokenManager', () => {
  let manager: TokenManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TokenManager(['/auth/login', '/public/**']);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('setToken 和 getToken 应正常工作', () => {
    manager.setToken('my-token-123');
    // getToken 是异步方法，需要 await
    expect(manager.getToken()).resolves.toBe('my-token-123');
  });

  it('clearToken 应清除 token', () => {
    manager.setToken('my-token');
    manager.clearToken();
    expect(manager.getToken()).resolves.toBeNull();
  });

  it('精确匹配白名单 URL', () => {
    expect(manager.isInWhiteList('/auth/login')).toBe(true);
    expect(manager.isInWhiteList('/auth/register')).toBe(false);
  });

  it('前缀匹配白名单 URL', () => {
    expect(manager.isInWhiteList('/public/users')).toBe(true);
    expect(manager.isInWhiteList('/public/settings')).toBe(true);
    expect(manager.isInWhiteList('/private/data')).toBe(false);
  });

  it('非白名单 URL 应返回 false', () => {
    expect(manager.isInWhiteList('/api/users')).toBe(false);
  });
});
