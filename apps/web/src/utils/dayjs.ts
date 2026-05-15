import dayjs from 'dayjs';
// 引入中文语言包
import 'dayjs/locale/zh-cn';
// 引入相对时间插件
import relativeTime from 'dayjs/plugin/relativeTime';
// 引入时区插件（可选）
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

/**
 * Dayjs 工具库配置
 * 统一配置中文语言、相对时间显示和时区支持
 */

// 扩展 dayjs 插件功能
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认语言为中文
dayjs.locale('zh-cn');

/**
 * 常用日期格式常量
 * 统一项目中日期格式，避免硬编码
 */
export const DATE_FORMAT = {
  /** 日期格式：2024-01-15 */
  DATE: 'YYYY-MM-DD',
  /** 时间格式：14:30:00 */
  TIME: 'HH:mm:ss',
  /** 完整日期时间：2024-01-15 14:30:00 */
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  /** 带T的 ISO 格式（用于 API）：2024-01-15T14:30:00 */
  DATETIME_ISO: 'YYYY-MM-DDTHH:mm:ss',
  /** 精简格式：20240115143000 */
  COMPACT: 'YYYYMMDDHHmmss',
  /** 月日格式：01月15日 */
  MONTH_DAY: 'MM月DD日',
  /** 年月格式：2024年01月 */
  YEAR_MONTH: 'YYYY年MM月',
  /** 时间戳友好格式：刚刚 / 3分钟前 / 2小时前 */
  RELATIVE: undefined,  // 使用 relativeTime 插件自动处理
} as const;

/**
 * 格式化日期时间
 * @param date - 日期对象、字符串或时间戳
 * @param format - 格式模板，默认使用完整日期时间格式
 * @returns 格式化后的日期字符串
 *
 * @example
 * formatDate(new Date()) // => '2024-01-15 14:30:00'
 * formatDate('2024-01-15', DATE_FORMAT.DATE) // => '2024-01-15'
 */
export function formatDate(date: dayjs.Config, format = DATE_FORMAT.DATETIME): string {
  return dayjs(date).format(format);
}

/**
 * 获取相对时间描述
 * @param date - 日期对象、字符串或时间戳
 * @returns 相对时间字符串（如："3分钟前"、"2小时后"）
 *
 * @example
 * formatRelativeTime(dayjs().subtract(5, 'minute')) // => '5分钟前'
 * formatRelativeTime(dayjs().add(2, 'hour')) // => '2小时后'
 */
export function formatRelativeTime(date: dayjs.Config): string {
  return dayjs().to(dayjs(date));
}

/**
 * 判断是否是今天
 * @param date - 待判断的日期
 * @returns 是否为今天
 */
export function isToday(date: dayjs.Config): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

/**
 * 判断是否是过去的时间
 * @param date - 待判断的日期
 * @returns 是否为过去的时间
 */
export function isPast(date: dayjs.Config): boolean {
  return dayjs(date).isBefore(dayjs());
}

/**
 * 导出配置好的 dayjs 实例
 * 可直接使用，也可通过上面的工具函数进行操作
 */
export default dayjs;
