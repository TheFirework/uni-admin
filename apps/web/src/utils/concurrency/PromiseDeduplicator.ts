export class PromiseDeduplicator<TResult> {
  private pendingRequests = new Map<string, Promise<TResult>>();
  private resultCache = new Map<string, { result: TResult; expiresAt: number }>();

  /**
   * 去重执行异步函数
   * 实现原理：
   * 1. 先检查短时结果缓存（cacheTTL 内直接返回上次结果）
   * 2. 再检查进行中的请求（相同 key 共享同一个 Promise）
   * 3. 都没有则创建新请求，完成后自动清理 Map 条目
   * 效果：连续快速调用 N 次只产生 1 次实际网络请求
   */
  async execute(
    key: string,
    fn: () => Promise<TResult>,
    options?: { cacheTTL?: number },
  ): Promise<TResult> {
    // 检查结果缓存（短时复用）
    if (options?.cacheTTL) {
      const cached = this.resultCache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        console.log(`[Deduplicator] 结果缓存命中: ${key}`);
        return cached.result;
      }
    }

    // 检查进行中的请求
    const existing = this.pendingRequests.get(key);
    if (existing) {
      console.log(`[Deduplicator] 复用进行中请求: ${key}`);
      return existing;
    }

    // 创建新请求
    const promise = fn()
      .then((result) => {
        if (options?.cacheTTL) {
          this.resultCache.set(key, { result, expiresAt: Date.now() + options.cacheTTL });
        }
        return result;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  cancel(key: string): boolean {
    return this.pendingRequests.delete(key);
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  clearResultCache(): void {
    this.resultCache.clear();
  }
}
