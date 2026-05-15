/**
 * 数据格式化工具函数
 */

/**
 * 格式化文件大小为人类可读的字符串
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的字符串（如 "1.5 KB", "2.3 MB"）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 数字格式化为千分位分隔符格式
 * @param num - 要格式化的数字
 * @returns 格式化后的字符串（如 "1,234,567"）
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/** 敏感数据脱敏类型 */
export type MaskType = 'phone' | 'idCard' | 'email' | 'name';

/**
 * 对敏感数据进行脱敏处理
 * @param value - 原始值
 * @param type - 脱敏类型
 * @returns 脱敏后的字符串
 */
export function maskSensitiveData(value: string, type: MaskType): string {
  switch (type) {
    case 'phone':
      // 手机号：138****1234
      return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    case 'idCard':
      // 身份证号：110***********1234
      return value.replace(/(\d{3})\d{11}(\d{4})/, '$1***********$2');
    case 'email':
      // 邮箱：u***@example.com
      const [username, domain] = value.split('@');
      return `${username[0]}***@${domain}`;
    case 'name':
      // 姓名：张**
      if (value.length <= 1) return '*';
      return value[0] + '*'.repeat(Math.min(value.length - 1, 2));
    default:
      return value;
  }
}
