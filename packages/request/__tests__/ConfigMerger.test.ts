import { describe, it, expect } from 'vitest';
import { ConfigMerger } from '../src/core/ConfigMerger.js';

describe('ConfigMerger', () => {
  const merger = new ConfigMerger();

  it('应该用高优先级覆盖低优先级的值', () => {
    const result = merger.merge(
      { timeout: 10000, loading: true },
      { timeout: 15000 },
      { timeout: 30000 },
    );
    expect(result.timeout).toBe(30000);
  });

  it('未指定字段应使用上层默认值', () => {
    const result = merger.merge(
      { timeout: 10000, showError: true },
      {},
      {},
    );
    expect(result.timeout).toBe(10000);
    expect(result.showError).toBe(true);
  });

  it('undefined 值不应覆盖下层', () => {
    const result = merger.merge(
      { timeout: 10000 },
      { timeout: undefined },
      {},
    );
    expect(result.timeout).toBe(10000);
  });

  it('嵌套对象应深合并', () => {
    const result = merger.merge(
      { headers: { 'Content-Type': 'application/json' }, params: { a: 1 } },
      { headers: { 'X-Custom': 'value' }, params: { b: 2 } },
      {},
    );
    expect((result.headers as Record<string, unknown>)['Content-Type']).toBe('application/json');
    expect((result.headers as Record<string, unknown>)['X-Custom']).toBe('value');
    expect(result.params).toEqual({ a: 1, b: 2 });
  });

  it('headers 应合并而非覆盖', () => {
    const result = merger.merge(
      { headers: { 'Content-Type': 'text/plain' } },
      { headers: { Authorization: 'Bearer xxx' } },
      {},
    );
    expect(result.headers).toEqual({
      'Content-Type': 'text/plain',
      'Authorization': 'Bearer xxx',
    });
  });
});
