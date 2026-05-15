/**
 * 验证函数
 */

/**
 * 验证邮箱地址格式
 * @param email - 邮箱地址
 * @returns 是否是有效的邮箱地址
 */
export function isEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * 验证中国大陆手机号格式
 * @param phone - 手机号码
 * @returns 是否是有效的手机号
 */
export function isPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证身份证号码格式（18位）
 * @param idCard - 身份证号码
 * @returns 是否是有效的身份证号码
 */
export function isIdCard(idCard: string): boolean {
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  return idCardRegex.test(idCard);
}

/**
 * 验证 URL 格式
 * @param url - URL 地址
 * @returns 是否是有效的 URL
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
