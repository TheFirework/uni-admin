/**
 * Loading 状态管理器 - 实例级请求计数器 + 发布订阅模式
 * 
 * ## 核心功能
 * 1. **请求计数**：追踪当前实例的活跃请求数量
 * 2. **状态管理**：当 count > 0 时 loading=true，count=0 时 loading=false
 * 3. **发布订阅**：状态变化时通知所有订阅者（用于 Vue Ref 绑定）
 * 4. **异常安全**：支持 force 模式直接归零，防止计数泄漏
 * 
 * ## 设计原则
 * - **实例级隔离**：每个 HttpClient 实例有独立的 LoadingManager
 * - **计数器模式**：支持并发请求（多个请求同时进行时 loading 保持 true）
 * - **try/finally 保证**：中间件中使用 try/finally 确保 decrement 被调用
 * 
 * ## 使用场景
 * ```typescript
 * const loadingManager = new LoadingManager({
 *   show: () => { console.log('Loading 显示'); },
 *   hide: () => { console.log('Loading 隐藏'); },
 * });
 * 
 * // 订阅状态变化（用于 Vue 响应式绑定）
 * const unsubscribe = loadingManager.subscribe((state) => {
 *   console.log('Loading 状态:', state);
 * });
 * 
 * // 模拟并发请求
 * loadingManager.increment(); // count=1, loading=true ✅
 * loadingManager.increment(); // count=2, loading=true (不重复触发)
 * loadingManager.decrement();  // count=1, loading=true (还有请求在进行)
 * loadingManager.decrement();  // count=0, loading=false ❌
 * 
 * // force 模式：异常时直接归零
 * loadingManager.increment();
 * loadingManager.decrement(true); // count=0, loading=false
 * ```
 */
export class LoadingManager {
  private _count = 0;
  private _state = false;
  private listeners = new Set<(state: boolean) => void>();

  /** 显示/隐藏 loading 的回调 */
  private showHandler: () => void;
  private hideHandler: () => void;

  constructor(options?: { show?: () => void; hide?: () => void }) {
    this.showHandler = options?.show ?? (() => {});
    this.hideHandler = options?.hide ?? (() => {});
  }

  get state(): boolean {
    return this._state;
  }

  increment(): void {
    this._count++;
    if (this._count === 1) {
      this.setState(true);
      this.showHandler();
    }
  }

  decrement(force = false): void {
    this._count = force ? 0 : Math.max(0, this._count - 1);
    if (this._count === 0) {
      this.setState(false);
      this.hideHandler();
    }
  }

  /** 判断当前是否有活跃的 loading 状态 */
  isActive(): boolean {
    return this._state;
  }

  private setState(newState: boolean): void {
    if (this._state !== newState) {
      this._state = newState;
      this.listeners.forEach(fn => fn(newState));
    }
  }

  subscribe(listener: (state: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  unsubscribe(listener: (state: boolean) => void): void {
    this.listeners.delete(listener);
  }
}
