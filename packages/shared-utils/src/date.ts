/**
 * 日期处理工具函数
 */

/**
 * 格式化日期为指定格式字符串
 * @param date - 日期对象、时间戳或日期字符串
 * @param format - 格式字符串（默认 'yyyy-MM-dd HH:mm:ss'）
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | number | string, format = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }

  const map: Record<string, () => string> = {
    yyyy: () => String(d.getFullYear()),
    MM: () => String(d.getMonth() + 1).padStart(2, '0'),
    dd: () => String(d.getDate()).padStart(2, '0'),
    HH: () => String(d.getHours()).padStart(2, '0'),
    mm: () => String(d.getMinutes()).padStart(2, '0'),
    ss: () => String(d.getSeconds()).padStart(2, '0'),
  };

  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (key) => map[key]());
}

/**
 * 获取相对时间描述（如"3分钟前"、"2小时前"）
 * @param date - 日期对象、时间戳或日期字符串
 * @returns 相对时间字符串
 */
export function getRelativeTime(date: Date | number | string): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = now - target;

  if (diff < 0) {
    return '刚刚';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return formatDate(date, 'yyyy-MM-dd');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/** 日期范围类型 */
export type DateRangeType = 'today' | 'week' | 'month' | 'year';

/**
 * 获取指定类型的日期范围
 * @param type - 日期范围类型
 * @returns 包含开始和结束日期的对象
 */
export function getDateRange(type: DateRangeType): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * 判断日期是否已过期
 * @param expiryDate - 到期日期
 * @returns 是否过期
 */
export function isExpired(expiryDate: Date | number | string): boolean {
  return new Date(expiryDate).getTime() < Date.now();
}
