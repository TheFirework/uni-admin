/**
 * 字符串处理工具函数
 */

/**
 * 将字符串转换为 camelCase 格式
 * @param str - 输入字符串（如 user_name 或 User-Name）
 * @returns camelCase 格式的字符串
 */
export function camelize(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

/**
 * 将字符串转换为 snake_case 格式
 * @param str - 输入字符串（如 userName 或 UserName）
 * @returns snake_case 格式的字符串
 */
export function snakeize(str: string): string {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '');
}

/**
 * 截断字符串，超出部分用省略号代替
 * @param str - 输入字符串
 * @param maxLength - 最大长度
 * @param suffix - 后缀（默认 '...'）
 * @returns 截断后的字符串
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 生成随机字符串
 * @param length - 字符串长度（默认 16）
 * @param charset - 字符集（默认包含大小写字母和数字）
 * @returns 随机字符串
 */
export function generateRandomString(
  length = 16,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}
