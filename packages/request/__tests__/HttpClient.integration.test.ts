import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient, createDefaultPipeline } from '../src/index.js';
import { LoadingManager, CancelManager, TokenManager, AuthLockManager } from '../src/index.js';
import type { ErrorNotifier } from '../src/types/notifier.js';

describe('HttpClient 集成测试（核心功能）', () => {
  let httpClient: HttpClient;
  let loadingManager: LoadingManager;
  let cancelManager: CancelManager;
  let tokenManager: TokenManager;
  let authLockManager: AuthLockManager;
  const mockErrorNotifier: ErrorNotifier = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    loadingManager = new LoadingManager();
    cancelManager = new CancelManager();
    tokenManager = new TokenManager();
    authLockManager = new AuthLockManager();

    httpClient = new HttpClient({
      globalDefaults: {
        timeout: 5000,
        loading: true,
        showError: true,
        successCodes: [200, 0],
      },
      instanceConfig: {
        baseURL: '/api/test',
      },
    });

    const pipeline = createDefaultPipeline({
      loadingManager,
      cancelManager,
      tokenManager,
      authLockManager,
      errorNotifier: mockErrorNotifier,
      globalDefaults: {
        timeout: 5000,
        loading: true,
        showError: true,
        successCodes: [200, 0],
      },
      instanceConfig: {
        baseURL: '/api/test',
      },
    });

    httpClient.pipeline = pipeline;
  });

  it('应该正确管理 Loading 状态（increment/decrement）', () => {
    expect(loadingManager.isActive()).toBe(false);

    loadingManager.increment();
    expect(loadingManager.isActive()).toBe(true);

    loadingManager.decrement();
    expect(loadingManager.isActive()).toBe(false);
  });

  it('应该支持多次 increment 后需要多次 decrement 才能归零', () => {
    loadingManager.increment();
    loadingManager.increment();
    loadingManager.increment();
    
    expect(loadingManager.isActive()).toBe(true);
    
    loadingManager.decrement();
    expect(loadingManager.isActive()).toBe(true); // 还没归零
    
    loadingManager.decrement();
    expect(loadingManager.isActive()).toBe(true); // 还没归零
    
    loadingManager.decrement();
    expect(loadingManager.isActive()).toBe(false); // 归零
  });

  it('应该支持 force 模式直接归零', () => {
    loadingManager.increment();
    loadingManager.increment();
    
    loadingManager.decrement(true);
    expect(loadingManager.isActive()).toBe(false);
  });

  it('CancelManager 应该支持注册和取消请求', () => {
    const config = {
      method: 'GET',
      url: '/api/test',
      params: { id: 1 },
    };

    const controller1 = cancelManager.register(config as any);
    expect(cancelManager.size).toBe(1);
    expect(controller1).toBeNull(); // 首次注册，无冲突

    const controller2 = cancelManager.register(config as any);
    expect(cancelManager.size).toBe(1); // 重复请求，替换旧的
    expect(controller2).not.toBeNull(); // 返回旧的控制器的引用
  });

  it('TokenManager 应该支持白名单匹配', () => {
    expect(tokenManager.isInWhiteList('/auth/login')).toBe(true);
    expect(tokenManager.isInWhiteList('/auth/register')).toBe(true);
    expect(tokenManager.isInWhiteList('/public/test')).toBe(true);
    expect(tokenManager.isInWhiteList('/api/users')).toBe(false);
  });

  it('AuthLockManager 应该防止并发 401 处理', async () => {
    authLockManager.setNavigateToLogin(vi.fn());

    const promise1 = authLockManager.handle401();
    const promise2 = authLockManager.handle401();

    await Promise.all([promise1, promise2]);

    // 等待 setTimeout(100) 执行完毕
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(authLockManager.isLocked).toBe(false);
  });

  it('应该支持动态修改配置（链式调用）', () => {
    const result = httpClient
      .setBaseURL('/api/v2')
      .setToken('test-token-123')
      .setTimeout(10000);

    expect(result).toBe(httpClient);
    expect(httpClient.loading).toBeDefined();
  });

  it('Pipeline 应该包含所有默认中间件', () => {
    const middlewareNames = httpClient.pipeline.getMiddlewareNames();
    
    expect(middlewareNames).toContain('config:merge');
    expect(middlewareNames).toContain('log:request');
    expect(middlewareNames).toContain('loading');
    expect(middlewareNames).toContain('cancel');
    expect(middlewareNames).toContain('token');
    expect(middlewareNames).toContain('unpack');
    expect(middlewareNames).toContain('error');
    expect(middlewareNames).toContain('log:response');
    
    expect(middlewareNames.length).toBe(8);
  });
});
