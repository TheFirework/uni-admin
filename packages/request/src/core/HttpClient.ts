import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { Pipeline } from './Pipeline.js';
import { createRequestContext } from './context.js';
import { ConfigMerger } from './ConfigMerger.js';
import type { 
  RequestOptions, 
  InternalRequestConfig,
  InstanceConfig,
  GlobalDefaults,
} from '../types/options.js';
import type { RequestContext, Middleware } from '../types/middleware.js';
import { LoadingManager } from '../managers/LoadingManager.js';
import { CancelManager } from '../managers/CancelManager.js';
import { TokenManager } from '../managers/TokenManager.js';
import { AuthLockManager } from '../managers/AuthLockManager.js';

/**
 * HttpClient 配置选项
 */
export interface HttpClientOptions {
  /** 基础 URL */
  baseURL?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 实例级配置 */
  instanceConfig?: InstanceConfig;
  /** 全局默认配置 */
  globalDefaults?: GlobalDefaults;
  /** 自定义 Pipeline 实例（可选，用于共享或测试） */
  pipeline?: Pipeline;
}

/**
 * HTTP 客户端 - 洋葱模型架构的包装层
 * 
 * ## 核心职责
 * 1. **配置管理**：通过 ConfigMerger 合并三层配置（全局 → 实例 → 请求级）
 * 2. **请求编排**：创建 RequestContext 并驱动 Pipeline 执行
 * 3. **便捷 API**：提供 get/post/put/del 等泛型快捷方法
 * 4. **生命周期管理**：集成 Loading、Cancel、Token、AuthLock 等状态管理器
 * 
 * ## 架构位置
 * ```
 * 业务代码 → HttpClient.get() → ConfigMerger.merge() → Pipeline.execute()
 *                                         ↓
 *                              中间件链 (Before) → axios.request() → 中间件链 (After)
 *                                         ↓
 *                                    返回解包后的数据 T
 * ```
 * 
 * ## 使用示例
 * 
 * ### 基础用法
 * ```typescript
 * // 创建客户端实例
 * const client = new HttpClient({
 *   baseURL: '/api/v1',
 *   timeout: 15000,
 * });
 * 
 * // GET 请求 - 自动解包响应数据
 * const users = await client.get<User[]>('/users');
 * // users 类型: User[] (不是 AxiosResponse)
 * 
 * // POST 请求 - 发送数据
 * const newUser = await client.post<User>('/users', { name: '张三', email: 'zhang@test.com' });
 * 
 * // PUT 请求 - 更新数据
 * const updated = await client.put<User>('/users/1', { name: '李四' });
 * 
 * // DELETE 请求
 * await client.del('/users/1');
 * ```
 * 
 * ### 高级配置
 * ```typescript
 * const client = new HttpClient({
 *   globalDefaults: {
 *     timeout: 10000,
 *     loading: true,      // 默认启用 Loading
 *     showError: true,    // 默认显示错误提示
 *     successCodes: [200, 0], // 兼容多种业务码
 *   },
 *   instanceConfig: {
 *     baseURL: '/api/v2',
 *     headers: { 'X-Custom': 'value' },
 *   },
 * });
 * 
 * // 请求级覆盖配置
 * const data = await client.get('/slow-api', {
 *   timeout: 30000,       // 单次请求超时 30s
 *   showError: false,    // 本次请求不显示错误
 *   loading: false,       // 本次请求不显示 Loading
 * });
 * ```
 * 
 * ### 链式调用动态修改配置
 * ```typescript
 * client
 *   .setBaseURL('/api/v3')
 *   .setToken('new-jwt-token')
 *   .setTimeout(20000);
 * ```
 * 
 * ### 获取 Loading 状态（用于 Vue 绑定）
 * ```typescript
 * const loading = ref(client.loading);
 * // 或通过 useRequest composable 获取响应式 loading
 * const { get, loading } = useRequest({ instance: client });
 * ```
 * 
 * @example
 * ```typescript
 * // 在 Vue 组件中使用
 * import { useRequest } from '@/lib/request';
 * 
 * export default {
 *   setup() {
 *     const { get, post, loading } = useRequest();
 *     
 *     async function fetchUsers() {
 *       const users = await get<User[]>('/api/users');
 *       console.log('Loading:', loading.value); // false
 *     }
 *     
 *     return { fetchUsers, loading };
 *   }
 * }
 * ```
 */
export class HttpClient {
  /** axios 实例（用于底层 HTTP 通信） */
  readonly axiosInstance: AxiosInstance;
  
  /** 洋葱模型管道 */
  readonly pipeline: Pipeline;
  
  /** Loading 状态管理器 */
  readonly loadingManager: LoadingManager;
  
  /** 请求取消管理器 */
  readonly cancelManager: CancelManager;
  
  /** Token 管理器 */
  readonly tokenManager: TokenManager;
  
  /** 认证锁管理器（防止并发刷新 Token） */
  readonly authLockManager: AuthLockManager;
  
  /** 实例级配置 */
  private instanceConfig: InstanceConfig;
  
  /** 全局默认配置 */
  private globalDefaults: GlobalDefaults;
  
  /** 配置合并器 */
  private configMerger: ConfigMerger;

  constructor(options: HttpClientOptions = {}) {
    this.instanceConfig = options.instanceConfig ?? {};
    this.globalDefaults = options.globalDefaults ?? {};
    
    // 创建裸 axios 实例（零拦截器，所有逻辑通过中间件实现）
    this.axiosInstance = axios.create();
    
    // 创建或使用自定义 Pipeline
    this.pipeline = options.pipeline ?? new Pipeline(this.axiosInstance);
    
    // 初始化配置合并器
    this.configMerger = new ConfigMerger();

    // 初始化各管理器（使用 noop 默认值，实际使用时可通过 setter 注入）
    this.loadingManager = new LoadingManager({
      show: () => {},
      hide: () => {},
    });
    this.cancelManager = new CancelManager();
    this.tokenManager = new TokenManager({
      getToken: async () => null,
    });
    this.authLockManager = new AuthLockManager();
  }

  /**
   * 发起 GET 请求
   */
  async get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  /**
   * 发起 POST 请求
   */
  async post<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'POST', url, data });
  }

  /**
   * 发起 PUT 请求
   */
  async put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'PUT', url, data });
  }

  /**
   * 发起 DELETE 请求
   */
  async del<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }

  /**
   * ★ 核心：发起请求
   * 
   * 完整流程：
   * 1. 通过 ConfigMerger 合并三层配置
   * 2. 创建 RequestContext
   * 3. 驱动 Pipeline 执行中间件链
   * 4. 返回响应数据或抛出错误
   * 5. finally 中清理取消控制器
   * 
   * @param config - 请求选项
   * @returns 响应数据（自动解包）
   */
  async request<T = unknown>(config: RequestOptions): Promise<T> {
    // 第一步：合并三层配置（全局 → 实例 → 单次请求）
    const mergedConfig = this.configMerger.merge(
      this.globalDefaults,
      this.instanceConfig,
      config,
    ) as InternalRequestConfig;

    // 第二步：创建请求上下文
    const ctx = createRequestContext<T>(mergedConfig);

    try {
      // 第三步：驱动 Pipeline 执行
      await this.pipeline.execute(ctx);

      // 如果有错误，抛出
      if (ctx.error) throw ctx.error;
      
      // 返回响应数据
      return ctx.response?.data as T;
    } finally {
      // 第四步：清理取消控制器
      this.cancelManager.removeController(ctx.meta.requestKey);
    }
  }

  /**
   * 获取当前 Loading 状态
   */
  get loading(): boolean {
    return this.loadingManager.isActive();
  }

  /**
   * 设置基础 URL（链式调用）
   */
  setBaseURL(url: string): this {
    this.instanceConfig.baseURL = url;
    return this;
  }

  /**
   * 设置认证 Token（链式调用）
   */
  setToken(token: string): this {
    this.tokenManager.setCachedToken(token);
    return this;
  }

  /**
   * 清除认证 Token（链式调用）
   */
  clearToken(): this {
    this.tokenManager.clearCache();
    return this;
  }

  /**
   * 设置超时时间（链式调用）
   */
  setTimeout(ms: number): this {
    this.instanceConfig.timeout = ms;
    return this;
  }

  /**
   * 注册中间件（链式调用）
   * 
   * @param middlewareName - 中间件名称
   * @param handler - 中间件处理函数
   */
  use(middlewareName: string, handler: Middleware): this {
    this.pipeline.use(middlewareName, handler);
    return this;
  }

  /**
   * 移除中间件（链式调用）
   */
  eject(middlewareName: string): this {
    this.pipeline.eject(middlewareName);
    return this;
  }
}
