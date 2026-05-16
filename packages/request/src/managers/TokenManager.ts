interface WhiteListRule {
  type: 'exact' | 'prefix';
  pattern: string;
}

const DEFAULT_WHITE_LIST = [
  '/auth/login',
  '/auth/register',
  '/auth/captcha',
  '/public/',
];

/**
 * Token 管理器 - 统一管理认证 Token 的读取、存储和清除
 *
 * ## 核心功能
 * 1. **Token 存储**：支持 localStorage 存储或自定义获取函数
 * 2. **白名单机制**：指定不需要 Token 的 API 接口（如登录、注册、公开接口）
 * 3. **自动注入**：在请求中间件中自动将 Token 添加到 Authorization 头
 *
 * ## 白名单匹配规则
 * - **精确匹配**：`/auth/login` 只匹配完全相同的 URL
 * - **前缀匹配**：`/public/**` 匹配所有以 `/public/` 开头的 URL
 *
 * ## 默认白名单
 * - `/auth/login` - 登录接口
 * - `/auth/register` - 注册接口
 * - `/auth/captcha` - 验证码接口
 * - `/public/**` - 所有公开接口
 *
 * @example
 * ```typescript
 * // 使用默认配置（localStorage + 默认白名单）
 * const tokenManager = new TokenManager();
 *
 * // 设置 Token（登录成功后调用）
 * tokenManager.setToken('eyJhbGciOiJIUzI1NiIs...');
 *
 * // 获取 Token（在请求中间件中使用）
 * const token = tokenManager.getToken();
 * // 返回: 'eyJhbGciOiJIUzI1NiIs...'
 *
 * // 检查是否需要 Token
 * if (tokenManager.isInWhiteList('/public/info')) {
 *   console.log('此接口不需要 Token');
 * }
 *
 * // 清除 Token（登出时调用）
 * tokenManager.clearToken();
 * ```
 *
 * @example
 * ```typescript
 * // 自定义 Token 获取函数（如从 Pinia store 读取）
 * const tokenManager = new TokenManager({
 *   getToken: () => useAuthStore().token,
 * });
 *
 * // 自定义白名单
 * const tokenManager = new TokenManager([
 *   '/auth/login',
 *   '/auth/register',
 *   '/health-check',
 *   '/public/**',
 * ]);
 * ```
 */
export class TokenManager {
  private storageKey = 'access_token';
  private whiteList: WhiteListRule[] = [];

  /** 缓存的 token 值（用于 setToken 时无需读写 localStorage） */
  private cachedToken: string | null = null;

  /** 自定义 getToken 函数（优先于 localStorage 读取） */
  private customGetToken?: () => string | null | Promise<string | null>;

  constructor(options?: string[] | { getToken?: () => string | null | Promise<string | null> }) {
    // 🔧 [2026-05-16] 版本标记：确认此文件已更新
    console.log('[TokenManager] ✅ 已加载最新版本 (v2.0 - 防御性增强)');

    if (Array.isArray(options)) {
      this.setWhiteList(options);
    } else if (options && typeof options === 'object' && 'getToken' in options) {
      this.customGetToken = options.getToken;
      this.setWhiteList(DEFAULT_WHITE_LIST);
    } else {
      this.setWhiteList(DEFAULT_WHITE_LIST);
    }
  }

  async getToken(): Promise<string | null> {
    // 优先使用自定义获取函数
    if (this.customGetToken) {
      return this.customGetToken();
    }
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    this.cachedToken = token;
    try {
      localStorage.setItem(this.storageKey, token);
    } catch {
      // localStorage 不可用时静默失败
    }
  }

  clearToken(): void {
    this.cachedToken = null;
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // 静默失败
    }
  }

  /** 设置缓存的 token（别名，供 HttpClient.setToken 使用） */
  setCachedToken(token: string): void {
    this.setToken(token);
  }

  /** 清除 token 缓存（别名，供 HttpClient.clearToken 使用） */
  clearCache(): void {
    this.clearToken();
  }

  isInWhiteList(url: string): boolean {
    return this.whiteList.some(rule => {
      switch (rule.type) {
        case 'exact':
          return url === rule.pattern || url === rule.pattern + '/';
        case 'prefix':
          return url.startsWith(rule.pattern);
        default:
          return false;
      }
    });
  }

  setWhiteList(patterns: string[] | string | undefined | null): this {
    // 防御性编程：确保 patterns 是数组
    if (!Array.isArray(patterns)) {
      console.warn('[TokenManager] setWhiteList 期望接收数组参数，但收到:', typeof patterns);
      this.whiteList = [];
      return this;
    }

    this.whiteList = patterns.map(p => ({
      type: p.endsWith('/**') || p.endsWith('/') ? ('prefix' as const) : ('exact' as const),
      pattern: p.replace(/\/\*\*$/, '').replace(/\/$/, ''),
    }));
    return this;
  }
}
