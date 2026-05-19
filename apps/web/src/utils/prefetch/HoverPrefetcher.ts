class HoverPrefetcher {
  private timers = new Map<Element, ReturnType<typeof setTimeout>>();
  private listeners = new Map<Element, { enter: () => void; leave: () => void }>();
  readonly delay: number;

  constructor(delay = 150) {
    this.delay = delay;
  }

  /**
   * 为 DOM 元素绑定悬停预加载事件
   * 150ms 延迟设计理由：
   * - 过短（<100ms）：鼠标快速滑过时误触发，浪费带宽
   * - 过长（>300ms）：用户点击后才触发预加载，失去意义
   * - 150ms 是黄金平衡点：过滤误触 + 用户无感延迟
   */
  bind(element: Element, routePath: string, loader: () => Promise<unknown>): void {
    this.unbind(element);

    const startTimer = (): void => {
      this.cancelTimer(element);

      const timer = setTimeout(() => {
        console.log(`[HoverPrefetch] 预加载: ${routePath}`);
        loader().catch((err) => console.warn(`[HoverPrefetch] 预加载失败: ${routePath}`, err));
      }, this.delay);

      this.timers.set(element, timer);
    };

    const cancelTimer = (): void => {
      this.cancelTimer(element);
    };

    const enterHandler = (): void => startTimer();
    const leaveHandler = (): void => cancelTimer();

    element.addEventListener('mouseenter', enterHandler);
    element.addEventListener('mouseleave', leaveHandler);
    this.listeners.set(element, { enter: enterHandler, leave: leaveHandler });
  }

  unbind(element: Element): void {
    this.cancelTimer(element);

    const handlers = this.listeners.get(element);
    if (handlers) {
      element.removeEventListener('mouseenter', handlers.enter);
      element.removeEventListener('mouseleave', handlers.leave);
      this.listeners.delete(element);
    }
  }

  destroy(): void {
    for (const [element] of this.timers) {
      this.cancelTimer(element);
    }
    for (const [element] of this.listeners) {
      this.unbind(element);
    }
  }

  private cancelTimer(element: Element): void {
    const timer = this.timers.get(element);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(element);
    }
  }
}

export const hoverPrefetcher = new HoverPrefetcher();
