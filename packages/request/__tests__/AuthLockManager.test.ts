import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthLockManager } from '../src/managers/AuthLockManager.js';

describe('AuthLockManager', () => {
  let manager: AuthLockManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new AuthLockManager();
  });

  it('初始状态 isLocked 应为 false', () => {
    expect(manager.isLocked).toBe(false);
  });

  it('handle401 并发调用只执行一次跳转', async () => {
    const navigateFn = vi.fn().mockResolvedValue(undefined);
    manager.setNavigateToLogin(navigateFn);

    // 并发调用 handle401（内部有 100ms setTimeout）
    await Promise.all([
      manager.handle401(),
      manager.handle401(),
      manager.handle401(),
    ]);

    // 推进定时器让 setTimeout 回调执行
    vi.advanceTimersByTime(150);

    expect(navigateFn).toHaveBeenCalledTimes(1);
  });

  it('handle401 完成后 reset 可重新触发', async () => {
    const navigateFn = vi.fn().mockResolvedValue(undefined);
    manager.setNavigateToLogin(navigateFn);

    await manager.handle401();
    // 推进定时器完成内部延迟
    vi.advanceTimersByTime(150);
    expect(navigateFn).toHaveBeenCalledTimes(1);

    manager.reset();

    await manager.handle401();
    vi.advanceTimersByTime(150);
    expect(navigateFn).toHaveBeenCalledTimes(2);
  });
});
