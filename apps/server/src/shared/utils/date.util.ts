/**
 * Dayjs 日期处理工具模块
 * 基于 dayjs 的轻量级日期库封装
 * 提供统一的日期格式化、相对时间计算、时区转换等能力
 *
 * 特性:
 *   - 统一的项目日期格式标准
 *   - 支持中英文相对时间显示
 *   - 时区感知的日期转换
 *   - 类型安全的 API 设计
 *
 * 使用方式:
 *   import { DateUtil } from '../shared/utils/date.util';
 *   DateUtil.format(new Date());              // '2024-01-15 10:30:00'
 *   DateUtil.relativeTime(someDate);          // '3小时前'
 */

import dayjs from 'dayjs';
// 使用 require 导入插件以避免 TypeScript 模块解析问题
const relativeTime = require('dayjs/plugin/relativeTime');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const duration = require('dayjs/plugin/duration');

// 扩展 Dayjs 类型定义以支持插件方法
declare module 'dayjs' {
  interface Dayjs {
    tz(): dayjs.Dayjs;
    tz(timezone: string): dayjs.Dayjs;
    fromNow(withoutSuffix?: boolean): string;
    from(compare: dayjs.Dayjs | string | number | Date, withoutSuffix?: boolean): string;
    utc(): dayjs.Dayjs;
    isSameOrAfter(date: dayjs.Dayjs | string | number, unit?: string): boolean;
    isSameOrBefore(date: dayjs.Dayjs | string | number, unit?: string): boolean;
  }

  // 扩展 dayjs 静态方法
  function utc(date?: dayjs.ConfigType): dayjs.Dayjs;
}

// 注册 dayjs 插件 - 扩展核心功能
dayjs.extend(relativeTime);       // 相对时间支持
dayjs.extend(utc);               // UTC 时间支持
dayjs.extend(timezone);          // 时区转换支持
dayjs.extend(isSameOrBefore);    // 比较运算扩展
dayjs.extend(isSameOrAfter);     // 比较运算扩展
dayjs.extend(duration);          // 时间间隔计算

// ====== 预设格式常量 ======

/** 常用日期格式预设集合 */
export const DATE_FORMATS = {
  /** 完整日期时间: 2024-01-15 10:30:00 */
  DATETIME: 'YYYY-MM-DD HH:mm:ss',

  /** 仅日期: 2024-01-15 */
  DATE: 'YYYY-MM-DD',

  /** 仅时间: 10:30:00 */
  TIME: 'HH:mm:ss',

  /** ISO 格式: 2024-01-15T10:30:00.000Z */
  ISO: '', // dayjs 默认 ISO 格式

  /** 带毫秒的时间: 10:30:00.123 */
  TIME_WITH_MS: 'HH:mm:ss.SSS',

  /** 中文友好格式: 2024年01月15日 10时30分 */
  CHINESE: 'YYYY年MM月DD日 HH时mm分',

  /** 文件名安全格式: 20240115_103000 */
  FILENAME: 'YYYYMMDD_HHmmss',

  /** HTTP 头格式: Mon, 15 Jan 2024 10:30:00 GMT */
  HTTP: 'ddd, DD MMM YYYY HH:mm:ss [GMT]',

  /** 简短月份: Jan 15 */
  SHORT_MONTH: 'MMM DD',
} as const;

/** 时区预设常量 */
export const TIMEZONES = {
  /** 北京时间 (UTC+8) */
  ASIA_SHANGHAI: 'Asia/Shanghai',
  /** UTC 标准时间 */
  UTC: 'UTC',
  /** 东京时间 (UTC+9) */
  ASIA_TOKYO: 'Asia/Tokyo',
  /** 纽约时间 (UTC-5/-4) */
  AMERICA_NEW_YORK: 'America/New_York',
  /** 伦敦时间 (UTC+0/+1) */
  EUROPE_LONDON: 'Europe/London',
} as const;

// ====== 工具类实现 ======

/**
 * 日期处理工具类
 * 提供项目统一的日期时间操作接口
 */
export class DateUtil {
  // ====== 格式化方法 ======

  /**
   * 格式化日期为指定格式字符串
   *
   * @param date 日期对象（Date/string/dayjs/时间戳）
   * @param format 目标格式（默认 DATETIME）
   * @param tz 目标时区（可选，默认本地时区）
   * @returns 格式化后的日期字符串
   *
   * @example
   *   DateUtil.format(new Date());                    // '2024-01-15 10:30:00'
   *   DateUtil.format(new Date(), 'YYYY/MM/DD');      // '2024/01/15'
   *   DateUtil.format(date, undefined, 'Asia/Shanghai'); // 北京时间
   */
  static format(
    date: Date | string | number | dayjs.Dayjs,
    format: string = DATE_FORMATS.DATETIME,
    tz?: string,
  ): string {
    let d = dayjs(date);

    // 如果指定了时区，先转换为该时区再格式化
    if (tz) {
      d = d.tz(tz);
    }

    return d.format(format);
  }

  /**
   * 获取当前时间的格式化字符串
   *
   * @param format 目标格式（默认 DATETIME）
   * @returns 当前时间的格式化字符串
   */
  static now(format: string = DATE_FORMATS.DATETIME): string {
    return dayjs().format(format);
  }

  // ====== 相对时间方法 ======

  /**
   * 计算相对于当前时间的描述文本
   * 支持自动切换中英文
   *
   * @param date 目标日期
   * @param withoutSuffix 是否去掉后缀（如"前"、"后"）
   * @returns 相对时间描述，如 "3小时前"、"刚刚"
   *
   * @example
   *   DateUtil.relativeTime(dayjs().subtract(3, 'hour')); // '3小时前'
   *   DateUtil.relativeTime(dayjs().subtract(30, 'second')); // '刚刚'
   */
  static relativeTime(
    date: Date | string | number | dayjs.Dayjs,
    withoutSuffix: boolean = false,
  ): string {
    return dayjs(date).fromNow(withoutSuffix);
  }

  /**
   * 计算两个日期之间的相对时间差
   *
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param withoutSuffix 是否去掉后缀
   * @returns 相对时间描述
   *
   * @example
   *   DateUtil.diffRelative(start, end); // '2天后'
   */
  static diffRelative(
    startDate: Date | string | number,
    endDate: Date | string | number,
    withoutSuffix: boolean = false,
  ): string {
    return dayjs(endDate).from(startDate, withoutSuffix);
  }

  // ====== 时区转换方法 ======

  /**
   * 将日期转换为目标时区的表示
   *
   * @param date 源日期
   * @param targetTz 目标时区标识
   * @param format 输出格式（默认 DATETIME）
   * @returns 目标时区的日期字符串
   *
   * @example
   *   // 将 UTC 时间转为北京时间
   *   DateUtil.toTimezone(utcDate, 'Asia/Shanghai'); // '2024-01-15 18:30:00'
   */
  static toTimezone(
    date: Date | string | number,
    targetTz: string = TIMEZONES.ASIA_SHANGHAI,
    format: string = DATE_FORMATS.DATETIME,
  ): string {
    return dayjs(date).tz(targetTz).format(format);
  }

  /**
   * 获取当前 UTC 时间戳
   *
   * @returns UTC 时间字符串
   */
  static utcNow(): string {
    return dayjs.utc().format();
  }

  /**
   * 将本地时间转换为 UTC
   *
   * @param date 本地日期
   * @param format 输出格式
   * @returns UTC 日期字符串
   */
  static toUtc(
    date: Date | string | number,
    format: string = DATE_FORMATS.DATETIME,
  ): string {
    return dayjs(date).utc().format(format);
  }

  // ====== 日期比较与判断方法 ======

  /**
   * 判断目标日期是否在指定范围内
   *
   * @param date 目标日期
   * @param start 范围开始（含）
   * @param end 范围结束（含）
   * @returns 是否在范围内
   */
  static isBetween(
    date: Date | string | number,
    start: Date | string | number,
    end: Date | string | number,
  ): boolean {
    const d = dayjs(date);
    return (
      d.isSameOrAfter(dayjs(start)) &&
      d.isSameOrBefore(dayjs(end))
    );
  }

  /**
   * 判断日期是否已过期
   *
   * @param date 目标日期
   * @returns 是否早于当前时间
   */
  static isExpired(date: Date | string | number): boolean {
    return dayjs(date).isBefore(dayjs());
  }

  /**
   * 判断日期是否是今天
   *
   * @param date 目标日期
   * @returns 是否为今天
   */
  static isToday(date: Date | string | number): boolean {
    return dayjs(date).isSame(dayjs(), 'day');
  }

  /**
   * 判断日期是否是工作日（周一至周五）
   *
   * @param date 目标日期
   * @returns 是否为工作日
   */
  static isWeekday(date: Date | string | number): boolean {
    const day = dayjs(date).day();
    // dayjs: 0=周日, 1=周一, ..., 6=周六
    return day >= 1 && day <= 5;
  }

  // ====== 日期计算方法 ======

  /**
   * 日期加减运算
   *
   * @param date 基准日期
   * @param value 数值（正数=加，负数=减）
   * @param unit 单位（year/month/day/hour/minute/second）
   * @returns 计算后的 dayjs 对象（可链式调用）
   *
   * @example
   *   const nextWeek = DateUtil.add(new Date(), 7, 'day');
   *   const lastMonth = DateUtil.add(new Date(), -1, 'month');
   */
  static add(
    date: Date | string | number,
    value: number,
    unit: dayjs.ManipulateType,
  ): dayjs.Dayjs {
    return dayjs(date).add(value, unit);
  }

  /**
   * 计算两个日期之间的差值
   *
   * @param start 开始日期
   * @param end 结束日期
   * @param unit 返回单位（默认毫秒）
   * @returns 差值数值
   *
   * @example
   *   const hoursDiff = DateUtil.diff(start, end, 'hour');
   */
  static diff(
    start: Date | string | number,
    end: Date | string | number,
    unit: dayjs.OpUnitType = 'millisecond',
  ): number {
    return dayjs(end).diff(dayjs(start), unit);
  }

  /**
   * 获取某月的起始和结束日期
   *
   * @param date 参考日期
   * @returns { start, end } 月初和月末的 dayjs 对象
   */
  static getMonthRange(date: Date | string | number = new Date()): {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  } {
    const d = dayjs(date);
    return {
      start: d.startOf('month'),
      end: d.endOf('month'),
    };
  }

  /**
   * 获取当天的起始和结束时间
   *
   * @param date 参考日期
   * @returns { start, end } 当天 00:00:00 和 23:59:59
   */
  static getDayRange(date: Date | string | number = new Date()): {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  } {
    const d = dayjs(date);
    return {
      start: d.startOf('day'),
      end: d.endOf('day'),
    };
  }

  // ====== 类型转换辅助方法 ======

  /**
   * 将各种日期格式统一转换为 Date 对象
   *
   * @param date 任意日期格式
   * @returns 标准 Date 对象
   */
  static toDate(date: Date | string | number | dayjs.Dayjs): Date {
    return dayjs(date).toDate();
  }

  /**
   * 将日期转换为 Unix 时间戳（秒）
   *
   * @param date 任意日期格式
   * @returns Unix 时间戳
   */
  static toUnix(date: Date | string | number | dayjs.Dayjs): number {
    return dayjs(date).unix();
  }

  /**
   * 将 Unix 时间戳转换为格式化日期
   *
   * @param timestamp Unix 时间戳（秒）
   * @param format 目标格式
   * @returns 格式化后的日期字符串
   */
  static fromUnix(timestamp: number, format: string = DATE_FORMATS.DATETIME): string {
    return dayjs.unix(timestamp).format(format);
  }
}
