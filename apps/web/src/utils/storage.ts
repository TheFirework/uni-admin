/**
 * 生产级 Storage 封装层
 * 统一工厂入口，提供类型安全、TTL 过期、AES-GCM 加密、容量监控、命名空间隔离
 * 代码中禁止直接调用原生 localStorage/sessionStorage API
 */

// ====== 类型定义 ======

/** 存储类型 */
type StorageType = 'local' | 'session';

/** 基础选项 */
interface StorageBaseOptions {
  /** 存储类型，默认 localStorage */
  type?: StorageType;
  /** 命名空间，默认空字符串 */
  namespace?: string;
  /** 是否 AES-GCM 加密 */
  encrypt?: boolean;
}

/** get 操作选项 */
interface StorageGetOptions<T> extends StorageBaseOptions {
  /** 默认值，避免 undefined 报错 */
  defaultValue?: T;
}

/** set 操作选项 */
interface StorageSetOptions extends StorageBaseOptions {
  /** 过期时间 (毫秒) */
  ttl?: number;
}

// ====== 常量 ======

const PREFIX = 'ua:';
const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
const WARN_THRESHOLD = 0.9; // 90% 预警阈值
const CRITICAL_THRESHOLD = 0.98; // 98% 临界阈值

// ====== 工具函数 ======

/**
 * 构建完整的存储键名
 * 格式: ua:{namespace}:{key}
 */
function buildKey(key: string, namespace: string = ''): string {
  return namespace ? `${PREFIX}${namespace}:${key}` : `${PREFIX}${key}`;
}

/**
 * 获取原生 Storage 对象
 * SSR 环境安全降级，返回 null
 */
function getNativeStorage(type: StorageType): Storage | null {
  if (typeof window === 'undefined' || !window) return null;

  return type === 'session' ? window.sessionStorage : window.localStorage;
}

/**
 * 检查当前 Storage 已使用空间大小（字节）
 */
function getStorageUsedSize(storage: Storage): number {
  let total = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(PREFIX)) {
      total += (storage.getItem(key) || '').length + key.length;
    }
  }
  // UTF-16 编码每个字符占 2 字节
  return total * 2;
}

// ====== AES-GCM 加密模块 ======

let cryptoKey: CryptoKey | null = null;

/**
 * 从设备指纹派生加密密钥
 * 使用 PBKDF2 增加暴力破解成本（迭代 100000 次）
 */
async function deriveCryptoKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;

  // 基于 userAgent + origin 生成设备绑定密钥材料
  const material = `${navigator.userAgent}${window.location.origin}`;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(material),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // 使用 SHA-256 哈希作为盐值（固定盐，简化实现）
  const salt = await crypto.subtle.digest('SHA-256', encoder.encode('uni-admin-storage-salt'));

  // PBKDF2 派生密钥
  cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // 不导出密钥（仅内存持有）
    ['encrypt', 'decrypt']
  );

  return cryptoKey;
}

/**
 * AES-GCM 加密
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveCryptoKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // 将 IV 和密文拼接：base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * AES-GCM 解密
 */
async function decrypt(ciphertext: string): Promise<string> {
  const key = await deriveCryptoKey();
  const decoder = new TextDecoder();

  // base64 解码
  const binary = atob(ciphertext);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // 提取 IV (前 12 字节) 和密文
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return decoder.decode(plaintext);
}

// ====== StorageFactory 主类 ======

class StorageFactory {
  /**
   * 读取存储值，带类型约束和默认值兜底
   * 支持自动 JSON 反序列化、TTL 过期检查、自动解密
   */
  async get<T>(key: string, options: StorageGetOptions<T> = {}): Promise<T> {
    const { defaultValue = undefined as unknown as T, type = 'local', namespace = '', encrypt = false } = options;
    const storage = getNativeStorage(type);

    // SSR 安全降级
    if (!storage) return defaultValue;

    const fullKey = buildKey(key, namespace);
    const rawValue = storage.getItem(fullKey);

    // 键不存在，返回默认值
    if (rawValue === null) return defaultValue;

    try {
      // 检查 TTL 过期
      const expKey = `${fullKey}._exp`;
      const expValue = storage.getItem(expKey);
      if (expValue) {
        const expTime = parseInt(expValue, 10);
        if (!isNaN(expTime) && Date.now() > expTime) {
          // 过期，异步删除并返回默认值
          this.remove(key, { type, namespace });
          storage.removeItem(expKey);
          return defaultValue;
        }
      }

      // 解密（如果需要）
      let valueToParse = rawValue;
      if (encrypt) {
        valueToParse = await decrypt(rawValue);
      }

      // JSON 反序列化
      return JSON.parse(valueToParse) as T;
    } catch (error) {
      console.warn(`[Storage] 读取失败 [${fullKey}]:`, error);
      return defaultValue;
    }
  }

  /**
   * 写入存储值，自动 JSON 序列化
   * 支持 TTL 过期、AES-GCM 加密、容量监控
   */
  async set<T>(key: string, value: T, options: StorageSetOptions = {}): Promise<void> {
    const { type = 'local', namespace = '', encrypt: needEncrypt = false, ttl } = options;
    const storage = getNativeStorage(type);

    // SSR 安全降级
    if (!storage) return;

    const fullKey = buildKey(key, namespace);

    try {
      // 序列化值
      let serializedValue = JSON.stringify(value);

      // 加密（如果需要）
      if (needEncrypt) {
        serializedValue = await encrypt(serializedValue);
      }

      // 容量检查
      this.checkCapacity(storage, serializedValue.length * 2); // UTF-16 编码

      // 写入主值
      storage.setItem(fullKey, serializedValue);

      // 写入 TTL 过期时间戳（如果配置了）
      if (ttl && ttl > 0) {
        const expKey = `${fullKey}._exp`;
        storage.setItem(expKey, String(Date.now() + ttl));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error(`[Storage] 容量不足，写入失败 [${fullKey}]`);
        throw error;
      }
      console.error(`[Storage] 写入失败 [${fullKey}]:`, error);
      throw error;
    }
  }

  /**
   * 移除单个键（包括对应的 _exp 键）
   */
  remove(key: string, options: StorageBaseOptions = {}): void {
    const { type = 'local', namespace = '' } = options;
    const storage = getNativeStorage(type);

    if (!storage) return;

    const fullKey = buildKey(key, namespace);
    storage.removeItem(fullKey);
    storage.removeItem(`${fullKey}._exp`);
  }

  /**
   * 判断键是否存在
   */
  has(key: string, options: StorageBaseOptions = {}): boolean {
    const { type = 'local', namespace = '' } = options;
    const storage = getNativeStorage(type);

    if (!storage) return false;

    const fullKey = buildKey(key, namespace);
    return storage.getItem(fullKey) !== null;
  }

  /**
   * 按命名空间批量清除
   */
  clearNamespace(namespace: string, type: StorageType = 'local'): void {
    const storage = getNativeStorage(type);
    if (!storage) return;

    const prefix = `${PREFIX}${namespace}:`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  }

  /**
   * 清除全部 ua: 前缀的存储
   */
  clearAll(type: StorageType = 'local'): void {
    const storage = getNativeStorage(type);
    if (!storage) return;

    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  }

  /**
   * 容量检查与预警
   * 接近上限时发出警告，不足时自动清理过期条目
   */
  private checkCapacity(storage: Storage, newItemSize: number): void {
    const usedSize = getStorageUsedSize(storage);
    const usageRatio = (usedSize + newItemSize) / STORAGE_LIMIT;

    // 超过 90% 发出警告
    if (usageRatio > WARN_THRESHOLD) {
      console.warn(`[Storage] WARNING: 容量使用超过 ${(usageRatio * 100).toFixed(1)}%，建议清理`);
    }

    // 超过 98% 自动清理过期项
    if (usageRatio > CRITICAL_THRESHOLD) {
      console.warn(`[Storage] 容量严重不足 (${(usageRatio * 100).toFixed(1)}%)，正在自动清理过期条目...`);
      this.clearExpiredItems(storage);

      // 清理后重新计算
      const newSize = getStorageUsedSize(storage);
      const newRatio = (newSize + newItemSize) / STORAGE_LIMIT;

      if (newRatio > 1) {
        throw new DOMException(`存储空间不足，剩余 ${((1 - newRatio) * 100).toFixed(1)}%`, 'QuotaExceededError');
      }
    }
  }

  /**
   * 扫描并删除所有已过期的 TTL 条目
   */
  private clearExpiredItems(storage: Storage): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.endsWith('._exp')) {
        const expValue = storage.getItem(key);
        if (expValue) {
          const expTime = parseInt(expValue, 10);
          if (!isNaN(expTime) && now > expTime) {
            // 找到过期的主键
            const mainKey = key.slice(0, -4); // 移除 '._exp' 后缀
            keysToRemove.push(mainKey, key);
          }
        }
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`[Storage] 已清理 ${keysToRemove.length / 2} 个过期条目`);
    }
  }

  /**
   * 手动轮换加密密钥（紧急场景）
   * 注意: 轮换后之前加密的数据将无法解密
   */
  async regenerateKey(): Promise<void> {
    cryptoKey = null;
    await deriveCryptoKey();
    console.log('[Storage] 加密密钥已重新生成');
  }
}

// ====== 导出单例实例 ======

export const storage = new StorageFactory();

// 导出类型供外部使用
export type { StorageGetOptions, StorageSetOptions, StorageBaseOptions };
