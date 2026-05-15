/**
 * 加密相关工具函数
 * 注意：这些函数在 Node.js 和浏览器环境中都可使用
 */

/**
 * 计算 MD5 哈希值
 * @param str - 输入字符串
 * @returns MD5 哈希值的十六进制字符串
 */
export async function md5(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
    // 浏览器环境或 Node.js >= 19（全局 crypto）
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Node.js < 19 环境，使用 createHash
    const { createHash } = await import('node:crypto');
    return createHash('md5').update(str).digest('hex');
  }
}

/**
 * 计算 SHA256 哈希值
 * @param str - 输入字符串
 * @returns SHA256 哈希值的十六进制字符串
 */
export async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(str).digest('hex');
  }
}

/**
 * Base64 编码
 * @param str - 输入字符串
 * @returns Base64 编码后的字符串
 */
export function base64Encode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)));
  } else {
    return Buffer.from(str).toString('base64');
  }
}

/**
 * Base64 解码
 * @param str - Base64 编码的字符串
 * @returns 解码后的原始字符串
 */
export function base64Decode(str: string): string {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(str)));
  } else {
    return Buffer.from(str, 'base64').toString('utf8');
  }
}
