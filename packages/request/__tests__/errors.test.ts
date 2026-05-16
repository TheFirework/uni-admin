import { describe, it, expect } from 'vitest';
import {
  RequestError,
  CancelError,
  TimeoutError,
  NetworkError,
  HttpError,
  BusinessError,
  ErrorType,
} from '../src/types/errors.js';

describe('错误类层次结构', () => {
  it('CancelError 应有正确的 type 和 name', () => {
    const err = new CancelError('已取消');
    expect(err.type).toBe(ErrorType.CANCEL);
    expect(err.name).toBe('CancelError');
    expect(err.message).toBe('已取消');
    expect(err).toBeInstanceOf(RequestError);
  });

  it('TimeoutError 应有正确的 type', () => {
    const err = new TimeoutError('超时了');
    expect(err.type).toBe(ErrorType.TIMEOUT);
    expect(err.name).toBe('TimeoutError');
  });

  it('NetworkError 应携带原始错误', () => {
    const original = new Error('DNS 失败');
    const err = new NetworkError('网络异常', original);
    expect(err.type).toBe(ErrorType.NETWORK);
    expect(err.originalError).toBe(original);
  });

  it('HttpError 应包含 statusCode', () => {
    const err = new HttpError('Forbidden', 403, 'Forbidden');
    expect(err.type).toBe(ErrorType.HTTP);
    expect(err.statusCode).toBe(403);
    expect(err.statusText).toBe('Forbidden');
  });

  it('BusinessError 应包含业务 code', () => {
    const err = new BusinessError('用户名已存在', 40001, { field: 'username' });
    expect(err.type).toBe(ErrorType.BUSINESS);
    expect(err.code).toBe(40001);
    expect(err.data).toEqual({ field: 'username' });
  });
});
