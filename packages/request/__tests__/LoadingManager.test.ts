import { describe, it, expect } from 'vitest';
import { LoadingManager } from '../src/managers/LoadingManager.js';

describe('LoadingManager', () => {
  it('初始状态应为 false', () => {
    const mgr = new LoadingManager();
    expect(mgr.state).toBe(false);
  });

  it('increment 首次应将 state 设为 true', () => {
    const mgr = new LoadingManager();
    mgr.increment();
    expect(mgr.state).toBe(true);
  });

  it('decrement 归零时应将 state 设为 false', () => {
    const mgr = new LoadingManager();
    mgr.increment();
    mgr.decrement();
    expect(mgr.state).toBe(false);
  });

  it('多次 increment 后需要多次 decrement 才归零', () => {
    const mgr = new LoadingManager();
    mgr.increment();
    mgr.increment();
    mgr.increment();
    expect(mgr.state).toBe(true);
    
    mgr.decrement(); // count=2
    expect(mgr.state).toBe(true); // 还没归零
    
    mgr.decrement(); // count=1
    expect(mgr.state).toBe(true); // 还没归零
    
    mgr.decrement(); // count=0
    expect(mgr.state).toBe(false);
  });

  it('force decrement 应直接归零', () => {
    const mgr = new LoadingManager();
    mgr.increment();
    mgr.increment();
    mgr.increment();
    mgr.decrement(true);
    expect(mgr.state).toBe(false);
  });

  it('subscribe 应收到状态变更通知', () => {
    const mgr = new LoadingManager();
    const changes: boolean[] = [];
    
    const unsub = mgr.subscribe((state) => changes.push(state));
    
    mgr.increment();
    mgr.decrement();
    
    unsub();
    // 不应再收到通知
    mgr.increment();
    
    expect(changes).toEqual([true, false]);
  });
});
