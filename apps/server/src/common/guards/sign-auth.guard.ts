/**
 * SignAuthGuard - 请求签名验证守卫
 *
 * 职责:
 *   1. 从 HTTP Header 提取签名参数 (X-Sign, X-Timestamp, X-Nonce)
 *   2. 验证时间戳有效性（防重放攻击，±5 分钟窗口）
 *   3. 检查 nonce 是否重复（预留 Redis SETEX 5分钟 TTL）
 *   4. 使用 HMAC-SHA256 重算签名并与客户端提交的签名对比
 *   5. 验证失败返回 403 + 对应业务错误码
 *
 * 签名算法:
 *   sign = HMAC-SHA256(appSecret, `${method}\n${url}\n${timestamp}\n${nonce}\n${body}`)
 *   其中 body 为请求体 MD5 哈希（无 body 时为空字符串）
 *
 * 错误码说明:
 *   - INVALID_SIGNATURE: 签名计算不匹配
 *   - REPLAY_ATTACK:     nonce 重复使用（重放攻击）
 *   - SIGNATURE_EXPIRED: 时间戳超出允许范围
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../../config/env.config.js';

/** 签名相关 Header 名称常量 */
const SIGN_HEADER = 'x-sign' as const;
const TIMESTAMP_HEADER = 'x-timestamp' as const;
const NONCE_HEADER = 'x-nonce' as const;

/** 签名验证错误码枚举 */
export enum SignErrorCode {
  /** 签名不匹配 */
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  /** Nonce 重复（重放攻击） */
  REPLAY_ATTACK = 'REPLAY_ATTACK',
  /** 时间戳过期 */
  SIGNATURE_EXPIRED = 'SIGNATURE_EXPIRED',
  /** 缺少必要 Header */
  MISSING_SIGN_HEADER = 'MISSING_SIGN_HEADER',
}

/** 时间戳容差：±5 分钟（毫秒） */
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/** Nonce 缓存 TTL：5 分钟（秒） */
const NONCE_CACHE_TTL_SEC = 5 * 60;

/**
 * Nonce 存储接口
 * 当前使用内存 Map 实现，生产环境应替换为 Redis
 */
interface NonceStore {
  /** 检查 nonce 是否已存在 */
  has(nonce: string): boolean;
  /** 存储 nonce 并设置过期时间 */
  set(nonce: string): void;
}

/**
 * 内存实现的 Nonce 存储（开发/测试用）
 * 生产环境应替换为 Redis SETEX
 */
class MemoryNonceStore implements NonceStore {
  private readonly cache = new Map<string, NodeJS.Timeout>();

  has(nonce: string): boolean {
    return this.cache.has(nonce);
  }

  set(nonce: string): void {
    // 清除旧定时器（如果存在）
    const existingTimer = this.cache.get(nonce);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的自动清理定时器
    const timer = setTimeout(() => this.cache.delete(nonce), NONCE_CACHE_TTL_SEC * 1000);
    this.cache.set(nonce, timer);
  }
}

@Injectable()
export class SignAuthGuard implements CanActivate {
  /** Nonce 存储实例（可替换为 Redis 实现） */
  private readonly nonceStore: NonceStore;

  constructor(private readonly reflector: Reflector) {
    this.nonceStore = new MemoryNonceStore();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 检查当前路由是否标记了 @RequireSign()
    const requireSign = this.reflector.getAllAndOverride<boolean>('requireSign', [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未标记 @RequireSign → 直接放行
    if (!requireSign) return true;

    // 提取并校验签名参数
    const signHeaders = this.extractSignHeaders(request);
    if (!signHeaders) {
      throw new ForbiddenException({
        code: SignErrorCode.MISSING_SIGN_HEADER,
        message: '缺少必要的签名请求头 (X-Sign, X-Timestamp, X-Nonce)',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    const { sign, timestamp, nonce } = signHeaders;

    // 步骤 1: 校验时间戳有效性（±5 分钟窗口）
    if (!this.isTimestampValid(timestamp)) {
      throw new ForbiddenException({
        code: SignErrorCode.SIGNATURE_EXPIRED,
        message: '请求时间戳已过期或不在有效范围内',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // 步骤 2: 检查 nonce 是否重复（防重放攻击）
    if (this.nonceStore.has(nonce)) {
      throw new ForbiddenException({
        code: SignErrorCode.REPLAY_ATTACK,
        message: '请求 nonce 已被使用，可能为重放攻击',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // 步骤 3: 重算 HMAC-SHA256 签名并对比
    const expectedSign = this.computeSignature(request, timestamp, nonce);

    // 使用 timingSafeEqual 防止时序攻击
    if (!timingSafeEqual(Buffer.from(sign), Buffer.from(expectedSign))) {
      throw new ForbiddenException({
        code: SignErrorCode.INVALID_SIGNATURE,
        message: '请求签名验证失败',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // 全部通过 → 标记 nonce 已使用
    this.nonceStore.set(nonce);

    return true;
  }

  /**
   * 从 Request Headers 中提取签名相关参数
   * 返回 null 表示缺少必要字段
   */
  private extractSignHeaders(
    request: Request
  ): { sign: string; timestamp: string; nonce: string } | null {
    const sign = request.headers[SIGN_HEADER];
    const timestamp = request.headers[TIMESTAMP_HEADER];
    const nonce = request.headers[NONCE_HEADER];

    // 任一缺失则返回 null
    if (!sign || !timestamp || !nonce) return null;

    return {
      sign: String(sign),
      timestamp: String(timestamp),
      nonce: String(nonce),
    };
  }

  /**
   * 验证时间戳是否在有效范围内（当前时间 ±5 分钟）
   */
  private isTimestampValid(timestampStr: string): boolean {
    const timestamp = Number(timestampStr);

    // 必须是有效的数字时间戳（秒级或毫秒级均可）
    if (Number.isNaN(timestamp)) return false;

    // 自动适配秒级/毫秒级时间戳（10位=秒级，13位=毫秒级）
    const normalizedTimestamp =
      timestamp > 9999999999 ? timestamp : timestamp * 1000;

    const now = Date.now();
    const diff = Math.abs(now - normalizedTimestamp);

    return diff <= TIMESTAMP_TOLERANCE_MS;
  }

  /**
   * 计算 HMAC-SHA256 签名
   *
   * 待签名字符串拼接规则:
   *   ${method}\n${url}\n${timestamp}\n${nonce}\n${bodyHash}
   *
   * 注意: url 取原始路径（不含 query string 的部分由调用方决定）
   */
  private computeSignature(
    request: Request,
    timestamp: string,
    nonce: string
  ): string {
    const env = getEnv();
    const method = request.method.toUpperCase();
    const url = request.originalUrl || request.url;

    // 计算请求体哈希（无 body 或 GET 请求时为空字符串）
    let bodyHash = '';
    if (
      request.body &&
      Object.keys(request.body).length > 0 &&
      method !== 'GET'
    ) {
      // 使用 SHA256 对请求体做哈希
      bodyHash = createHmac('sha256', '')
        .update(JSON.stringify(request.body))
        .digest('hex');
    }

    // 拼接待签名字符串
    const signString = [method, url, timestamp, nonce, bodyHash].join('\n');

    // HMAC-SHA256 签名（输出十六进制小写）
    return createHmac('sha256', env.jwtSecret)
      .update(signString)
      .digest('hex');
  }
}
