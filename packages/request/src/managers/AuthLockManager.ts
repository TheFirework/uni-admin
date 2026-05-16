type NavigateToLoginFn = () => Promise<void>;

/**
 * 401 认证锁管理器 - 防止并发 401 响应导致重复登录跳转
 * 
 * ## 问题背景
 * 当用户 Token 过期时，可能同时有多个 HTTP 请求返回 401。
 * 如果每个 401 都触发登录跳转，会导致：
 * - 多次跳转到登录页
 * - 用户体验差
 * - 可能产生竞态条件
 * 
 * ## 解决方案
 * 使用原子布尔锁（`isRedirecting`）确保：
 * - 同一时间只有一个 401 处理逻辑在执行
 * - 后续的 401 会被静默忽略
 * - 处理完成后自动解锁（100ms 延迟防止并发）
 * 
 * ## 工作流程
 * ```
 * 收到 401 → 检查 isRedirecting
 *            ├─ true  → 静默返回（已有其他请求在处理）
 *            └─ false → 加锁 → 清除 Token → 跳转登录页 → 解锁
 * ```
 * 
 * @example
 * ```typescript
 * const authLockManager = new AuthLockManager();
 * 
 * // 设置跳转函数（在应用初始化时）
 * authLockManager.setNavigateToLogin(async () => {
 *   await router.push('/login');
 * });
 * 
 * // 在错误处理中间件中调用
 * if (error.response?.status === 401) {
 *   await authLockManager.handle401(); // 并发调用也只会跳转一次
 * }
 * ```
 */
export class AuthLockManager {
  private isRedirecting = false;
  private navigateToLogin?: NavigateToLoginFn;

  setNavigateToLogin(fn: NavigateToLoginFn): void {
    this.navigateToLogin = fn;
  }

  async handle401(): Promise<void> {
    if (this.isRedirecting) return;
    this.isRedirecting = true;

    try {
      if (this.navigateToLogin) {
        await this.navigateToLogin();
      }
    } finally {
      // 短暂延迟防止并发请求重复触发
      setTimeout(() => {
        this.isRedirecting = false;
      }, 100);
    }
  }

  get isLocked(): boolean {
    return this.isRedirecting;
  }

  reset(): void {
    this.isRedirecting = false;
  }
}
