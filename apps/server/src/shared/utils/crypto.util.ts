/**
 * 加密工具类模块
 * 提供 AES-256-CBC 对称加密和 HMAC-SHA256 签名验证能力
 *
 * 安全说明:
 *   - AES-256-CBC: 适合加密敏感数据（如个人信息），需要 IV 向量保证安全性
 *   - HMAC-SHA256: 适合数据完整性校验，防止篡改
 *   - 密钥管理: 生产环境必须通过环境变量注入密钥
 *
 * 使用方式:
 *   import { CryptoUtil } from '../shared/utils/crypto.util';
 *   const encrypted = CryptoUtil.encrypt('sensitive data');
 *   const decrypted = CryptoUtil.decrypt(encrypted);
 */

import * as crypto from 'crypto';
import { getConfig } from '../../config/env.config.js';

// ====== 常量定义 ======

/** AES 算法标识 - 256位密钥 + CBC 分组模式 */
const ALGORITHM = 'aes-256-cbc';

/** HMAC 算法标识 */
const HMAC_ALGORITHM = 'sha256';

/** 初始化向量长度（字节）- AES 块大小固定为 16 字节 */
const IV_LENGTH = 16;

/** 密钥长度要求（字节）- AES-256 需要 32 字节密钥 */
const KEY_LENGTH = 32;

/** 默认编码格式 */
const ENCODING = 'utf8';

/** 密文输出编码（Base64 可安全传输） */
const OUTPUT_ENCODING = 'base64';

// ====== 异常类定义 ======

/**
 * 解密失败异常
 * 当密文损坏、密钥不匹配或格式错误时抛出
 */
export class CryptoDecryptionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`解密失败: ${message}`);
    this.name = 'CryptoDecryptionError';
  }
}

/**
 * 签名验证失败异常
 * 当数据被篡改或签名不匹配时抛出
 */
export class InvalidSignatureError extends Error {
  constructor(message: string) {
    super(`签名验证失败: ${message}`);
    this.name = 'InvalidSignatureError';
  }
}

// ====== 核心工具类 ======

/**
 * 加密工具类
 * 提供静态方法进行加解密和签名操作
 *
 * 设计原则:
 *   - 所有方法都是静态的，无需实例化
 *   - 自动处理 IV 生成和拼接，简化调用方逻辑
 *   - 统一的错误处理，便于上层捕获
 */
export class CryptoUtil {
  // ====== 密钥管理 ======

  /**
   * 获取加密主密钥
   * 优先从环境变量读取，否则使用默认值（仅开发环境）
   *
   * @returns 32字节长度的密钥字符串
   */
  private static getEncryptionKey(): string {
    return getConfig().encryptionKey;
  }

  /**
   * 获取签名密钥
   * 可以与加密密钥相同或使用独立密钥
   *
   * @returns 签名使用的密钥字符串
   */
  private static getSigningKey(): string {
    const config = getConfig();
    return config.hmacSecret || config.encryptionKey;
  }

  // ====== AES 加解密方法 ======

  /**
   * AES-256-CBC 加密
   * 自动生成随机 IV 并拼接到密文前部，格式: base64(iv + ciphertext)
   *
   * @param plaintext 待加密的明文字符串
   * @param customKey 可选的自定义密钥（默认使用配置密钥）
   * @returns Base64 编码的密文字符串
   *
   * @example
   *   const encrypted = CryptoUtil.encrypt('hello world');
   *   // 返回类似: "abc123def456...iv+ciphertext..."
   */
  static encrypt(plaintext: string, customKey?: string): string {
    // 参数校验 - 提前返回避免无效操作
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('encrypt() 参数必须是有效的非空字符串');
    }

    // 获取密钥并确保长度正确
    const key = (customKey || CryptoUtil.getEncryptionKey()).slice(0, KEY_LENGTH);

    // 生成随机初始化向量 - 每次加密都不同，保证相同明文产生不同密钥
    const iv = crypto.randomBytes(IV_LENGTH);

    // 创建加密器实例
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);

    // 执行加密 - 处理可能的多块数据
    let encrypted = cipher.update(plaintext, ENCODING, OUTPUT_ENCODING);
    encrypted += cipher.final(OUTPUT_ENCODING);

    // 将 IV 和密文拼接: IV(前16字节) + 密文
    // 接收方需要先提取 IV 再解密
    return Buffer.concat([iv, Buffer.from(encrypted, OUTPUT_ENCODING)]).toString(
      OUTPUT_ENCODING,
    );
  }

  /**
   * AES-256-CBC 解密
   * 从密文中提取 IV 并执行解密操作
   *
   * @param ciphertext CryptoUtil.encrypt() 生成的密文字符串
   * @param customKey 加密时使用的密钥（需与加密时一致）
   * @returns 解密后的原始明文字符串
   * @throws {CryptoDecryptionError} 当解密失败时抛出
   *
   * @example
   *   try {
   *     const decrypted = CryptoUtil.decrypt(encrypted);
   *     console.log(decrypted); // 'hello world'
   *   } catch (e) {
   *     console.error('解密失败:', e.message);
   *   }
   */
  static decrypt(ciphertext: string, customKey?: string): string {
    // 参数校验
    if (!ciphertext || typeof ciphertext !== 'string') {
      throw new CryptoDecryptionError('密文参数无效');
    }

    try {
      // 获取密钥
      const key = (customKey || CryptoUtil.getEncryptionKey()).slice(0, KEY_LENGTH);

      // 将 Base64 密文转换为 Buffer
      const buffer = Buffer.from(ciphertext, OUTPUT_ENCODING);

      // 提取 IV（前16字节）和实际密文（剩余部分）
      const iv = buffer.subarray(0, IV_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH);

      // 验证密文长度是否合法
      if (encrypted.length === 0) {
        throw new CryptoDecryptionError('密文长度不足');
      }

      // 创建解密器实例
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);

      // 执行解密
      let decrypted = decipher.update(encrypted, undefined, ENCODING);
      decipher.final(); // 触发完整性校验

      return decrypted;
    } catch (error) {
      // 统一包装为自定义异常类型
      if (error instanceof CryptoDecryptionError) throw error;
      throw new CryptoDecryptionError(
        '密文可能已损坏或密钥不匹配',
        error instanceof Error ? error : undefined,
      );
    }
  }

  // ====== HMAC 签名方法 ======

  /**
   * 生成 HMAC-SHA256 签名
   * 用于验证数据的完整性和真实性
   *
   * @param data 需要签名的数据（字符串）
   * @param secret 可选的自定义签名密钥
   * @returns 十六进制格式的签名字符串
   *
   * @example
   *   const signature = CryptoUtil.sign('important data');
   *   // 返回类似: "a1b2c3d4e5f6...64字符长度"
   */
  static sign(data: string, secret?: string): string {
    if (!data || typeof data !== 'string') {
      throw new Error('sign() 参数必须是有效的非空字符串');
    }

    return crypto
      .createHmac(HMAC_ALGORITHM, secret || CryptoUtil.getSigningKey())
      .update(data)
      .digest('hex');
  }

  /**
   * 验证 HMAC-SHA256 签名
   * 使用时间恒定比较防止时序攻击
   *
   * @param data 原始数据
   * @param signature 待验证的签名字符串
   * @param secret 签名时使用的密钥
   * @returns 签名是否有效
   * @throws {InvalidSignatureError} 当签名不匹配时抛出（可选行为）
   *
   * @example
   *   const isValid = CryptoUtil.verify(data, signature);
   *   if (!isValid) throw new InvalidSignatureError('数据已被篡改');
   */
  static verify(data: string, signature: string, secret?: string): boolean {
    // 快速失败 - 无效参数直接返回 false
    if (!data || !signature) return false;

    // 使用 timingSafeEqual 防止时序攻击
    // 攻击者无法通过响应时间差异猜测正确的签名
    const expectedSignature = CryptoUtil.sign(data, secret);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      // 长度不一致或其他格式问题
      return false;
    }
  }

  // ====== 辅助工具方法 ======

  /**
   * 生成随机字符串
   * 用于生成 Token、盐值、Nonce 等场景
   *
   * @param length 期望的字符串长度（默认32）
   * @param encoding 输出编码格式（hex/base64/url-safe）
   * @returns 随机字符串
   *
   * @example
   *   const token = CryptoUtil.randomString(48, 'url-safe');
   *   // 返回类似: "xK9mP2nQrS7tUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz"
   */
  static randomString(length: number = 32, encoding: 'hex' | 'base64' | 'url-safe' = 'hex'): string {
    const bytes = Math.ceil((length * 3) / 4); // 计算需要的随机字节数
    const randomBytes = crypto.randomBytes(bytes);
    let result = randomBytes.toString(encoding === 'url-safe' ? 'base64' : encoding);

    // URL 安全模式: 替换特殊字符
    if (encoding === 'url-safe') {
      result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    return result.slice(0, length);
  }

  /**
   * 哈希密码（用于存储，不可逆）
   * 使用 PBKDF2 + SHA256 + 随机盐值
   *
   * @param password 明文密码
   * @returns 格式: "salt:hash" （冒号分隔）
   *
   * @example
   *   const stored = CryptoUtil.hashPassword('myPassword123');
   *   // 存储到数据库，验证时使用 verifyPassword()
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
      .toString('hex');

    return `${salt}:${hash}`;
  }

  /**
   * 验证密码是否匹配
   *
   * @param password 用户输入的明文密码
   * @param storedHash 数据库中存储的哈希值（格式: "salt:hash"）
   * @returns 密码是否正确
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const computedHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
      .toString('hex');

    // 时间恒定比较
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }
}
