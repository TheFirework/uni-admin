import { describe, it, expect, vi } from 'vitest';
import { createErrorMiddleware } from '../src/middlewares/error.js';
import { AuthLockManager } from '../src/managers/AuthLockManager.js';
import type { ErrorNotifier } from '../src/types/notifier.js';
import { CancelError, BusinessError } from '../src/types/errors.js';
import type { RequestContext } from '../src/types/middleware.js';

describe('ErrorMiddleware (ErrorProcessor)', () => {
  const mockErrorNotifier: ErrorNotifier = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  const authLockManager = new AuthLockManager();
  const errorMiddleware = createErrorMiddleware(authLockManager, mockErrorNotifier);

  function createMockContext(overrides?: Partial<RequestContext>): RequestContext {
    return {
      config: {
        url: '/api/test',
        method: 'GET',
        _internal: {
          startTime: Date.now(),
          requestKey: 'test-key',
          showError: true,
          loading: true,
          skipToken: false,
          dedupe: true,
          returnRawResponse: false,
          returnBlob: false,
          successCodes: [200, 0],
        },
      },
      meta: {
        startTime: Date.now(),
        requestKey: 'test-key',
        abortController: new AbortController(),
        terminated: false,
      },
      next: vi.fn(),
      ...overrides,
    } as unknown as RequestContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该静默处理取消错误（不调用 errorNotifier）', async () => {
    const ctx = createMockContext({
      error: new CancelError('请求被取消'),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).not.toHaveBeenCalled();
  });

  it('应该在 HTTP 401 时触发认证锁（error 带 status 属性）', async () => {
    const handle401Spy = vi.spyOn(authLockManager, 'handle401');
    
    const ctx = createMockContext({
      error: Object.assign(new Error('未授权'), { 
        status: 401,
        response: { status: 401 }
      }),
    });

    await errorMiddleware(ctx);
    
    expect(handle401Spy).toHaveBeenCalledTimes(1);
    expect(mockErrorNotifier.error).not.toHaveBeenCalled();
  });

  it('应该在 HTTP 403 时显示权限错误提示（error 带 status 属性）', async () => {
    const ctx = createMockContext({
      error: Object.assign(new Error('禁止访问'), { 
        status: 403,
        response: { status: 403 }
      }),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).toHaveBeenCalledWith('没有权限访问该资源');
  });

  it('应该在 HTTP 429 时显示频率限制提示（error 带 status 属性）', async () => {
    const ctx = createMockContext({
      error: Object.assign(new Error('请求过多'), { 
        status: 429,
        response: { status: 429 }
      }),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).toHaveBeenCalledWith('操作过于频繁，请稍后再试');
  });

  it('应该在 HTTP 5xx 时显示服务器错误提示（error 带 status 属性）', async () => {
    const ctx = createMockContext({
      error: Object.assign(new Error('服务器内部错误'), { 
        status: 500,
        response: { status: 500 }
      }),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).toHaveBeenCalledWith('服务器内部错误');
  });

  it('应该在业务错误时显示后端返回的消息', async () => {
    const ctx = createMockContext({
      error: new BusinessError('用户名已存在', 40001, null),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).toHaveBeenCalledWith('用户名已存在');
  });

  it('应该在超时时显示超时提示', async () => {
    const ctx = createMockContext({
      error: new Error('timeout of 10000ms exceeded'),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).toHaveBeenCalledWith('请求超时，请稍后重试');
  });

  it('应该在网络错误（ECONNABORTED）时显示网络连接失败提示', async () => {
    const ctx = createMockContext({
      error: Object.assign(new Error('Network Error'), { code: 'ECONNABORTED' }),
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).toHaveBeenCalledWith('请求超时，请稍后重试');
  });

  it('应该在 showError=false 时不调用 errorNotifier', async () => {
    const ctx = createMockContext({
      error: Object.assign(new Error('服务器错误'), { 
        status: 500,
        response: { status: 500 }
      }),
      config: {
        url: '/api/test',
        method: 'GET',
        _internal: {
          startTime: Date.now(),
          requestKey: 'test-key',
          showError: false,
          loading: true,
          skipToken: false,
          dedupe: true,
          returnRawResponse: false,
          returnBlob: false,
          successCodes: [200, 0],
        },
      },
    });

    await errorMiddleware(ctx);
    expect(mockErrorNotifier.error).not.toHaveBeenCalled();
  });

  it('应该在无错误时正常穿透到下一个中间件', async () => {
    const ctx = createMockContext();
    const nextSpy = vi.fn();
    ctx.next = nextSpy;

    await errorMiddleware(ctx);
    expect(nextSpy).toHaveBeenCalled();
    expect(mockErrorNotifier.error).not.toHaveBeenCalled();
  });
});
