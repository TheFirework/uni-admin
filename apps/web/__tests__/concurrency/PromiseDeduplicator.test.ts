import { describe, it, expect, vi } from 'vitest';
import { PromiseDeduplicator } from '@/utils/concurrency/PromiseDeduplicator';

describe('PromiseDeduplicator', () => {
  it('相同 key 并发调用应只执行一次', async () => {
    const deduplicator = new PromiseDeduplicator<string>();
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return `result-${callCount}`;
    });

    const [result1, result2, result3] = await Promise.all([
      deduplicator.execute('test-key', fn),
      deduplicator.execute('test-key', fn),
      deduplicator.execute('test-key', fn),
    ]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it('不同 key 应独立执行', async () => {
    const deduplicator = new PromiseDeduplicator<string>();
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');

    const [r1, r2] = await Promise.all([
      deduplicator.execute('key-1', fn1),
      deduplicator.execute('key-2', fn2),
    ]);

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
  });

  it('完成后应自动清理 Map 条目', async () => {
    const deduplicator = new PromiseDeduplicator<string>();
    const fn = vi.fn().mockResolvedValue('done');

    await deduplicator.execute('temp-key', fn);

    expect(deduplicator.getPendingCount()).toBe(0);
  });

  it('cancel() 应阻止未开始的请求', () => {
    const deduplicator = new PromiseDeduplicator<string>();

    deduplicator.execute('cancel-key', vi.fn().mockResolvedValue('x'));
    const cancelled = deduplicator.cancel('cancel-key');

    expect(cancelled).toBe(true);
    expect(deduplicator.getPendingCount()).toBe(0);
  });

  it('短时缓存 TTL 应生效', async () => {
    const deduplicator = new PromiseDeduplicator<string>();
    let count = 0;
    const fn = vi.fn().mockImplementation(async () => {
      count++;
      return `call-${count}`;
    });

    await deduplicator.execute('cached-key', fn, { cacheTTL: 5000 });
    const cachedResult = await deduplicator.execute('cached-key', fn, { cacheTTL: 5000 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(cachedResult).toBe('call-1');
  });
});
