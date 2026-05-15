/**
 * Lodash 工具函数封装模块
 * 对常用 Lodash 函数进行类型安全的二次封装
 * 提供更严格的 TypeScript 类型约束和项目级默认值
 *
 * 为什么封装而非直接使用 lodash?
 *   1. 统一函数签名，隐藏实现细节
 *   2. 添加项目级的默认参数和行为
 *   3. 更好的 TypeScript 类型推断支持
 *   4. 方便未来替换为原生实现或其他库
 *
 * 使用方式:
 *   import { LodashUtil } from '../shared/utils/lodash.util';
 *   const safeData = LodashUtil.cloneDeep(obj);
 *   const filtered = LodashUtil.pick(user, ['name', 'email']);
 */

// 使用 require 导入以避免 ES Module 解析问题
const lodash = require('lodash');

// 从 lodash 对象中解构需要的函数
const _debounce = lodash.debounce;
const _throttle = lodash.throttle;
const _cloneDeep = lodash.cloneDeep;
const _pick = lodash.pick;
const _omit = lodash.omit;
const _isEqual = lodash.isEqual;
const _isEmpty = lodash.isEmpty;
const _isObject = lodash.isObject;
const _isArray = lodash.isArray;
const _uniqBy = lodash.uniqBy;
const _sortBy = lodash.sortBy;
const _groupBy = lodash.groupBy;
const _merge = lodash.merge;
const _get = lodash.get;
const _set = lodash.set;
const _has = lodash.has;

// ====== 类型定义 ======

/** Debounce/Throttle 的通用选项接口 */
interface ThrottleOptions {
  /** 是否在首次触发时立即执行 */
  leading?: boolean;
  /** 是否在最后一次触发后延迟执行 */
  trailing?: boolean;
}

/** 默认防抖/节流选项 */
const DEFAULT_THROTTLE_OPTIONS: Required<ThrottleOptions> = {
  leading: false,
  trailing: true,
};

// ====== 工具类实现 ======

/**
 * Lodash 工具函数封装类
 * 所有方法都是静态的，提供类型安全的便捷访问
 */
export class LodashUtil {
  // ====== 性能优化函数 ======

  /**
   * 防抖函数 - 在频繁触发时只执行最后一次
   *
   * 典型应用场景:
   *   - 搜索框输入（用户停止输入后才发起请求）
   *   - 窗口 resize 事件处理
   *   - 表单实时保存
   *
   * @param fn 需要防抖的目标函数
   * @param wait 等待时间（毫秒），默认300ms
   * @param options 配置选项
   * @returns 包装后的防抖函数
   *
   * @example
   *   // 搜索框场景: 用户停止输入 500ms 后才搜索
   *   const debouncedSearch = LodashUtil.debounce(searchFn, 500);
   *   input.addEventListener('input', debouncedSearch);
   *
   *   // 清除待执行的调用（组件卸载时很重要）
   *   debouncedSearch.cancel();
   */
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    wait: number = 300,
    options?: ThrottleOptions,
  ): T & { cancel: () => void; flush: () => void } {
    return _debounce(fn, wait, {
      ...DEFAULT_THROTTLE_OPTIONS,
      ...options,
    }) as T & { cancel: () => void; flush: () => void };
  }

  /**
   * 节流函数 - 在一定时间内最多执行一次
   *
   * 典型应用场景:
   *   - 滚动事件监听（无限加载）
   *   - 按钮点击防止重复提交
   *   - 鼠标移动追踪
   *
   * @param fn 需要节流的目标函数
   * @param interval 执行间隔（毫秒），默认200ms
   * @param options 配置选项
   * @returns 包装后的节流函数
   *
   * @example
   *   // 滚动加载场景: 每 200ms 最多检查一次
   *   const throttledScroll = LodashUtil.throttle(checkScroll, 200);
   *   window.addEventListener('scroll', throttledScroll);
   */
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    interval: number = 200,
    options?: ThrottleOptions,
  ): T & { cancel: () => void } {
    return _throttle(fn, interval, {
      ...DEFAULT_THROTTLE_OPTIONS,
      ...options,
    }) as T & { cancel: () => void };
  }

  // ====== 对象深拷贝函数 ======

  /**
   * 深拷贝对象
   * 创建对象的完全独立副本，修改副本不影响原对象
   *
   * 注意事项:
   *   - 支持 Date、RegExp、Array、普通对象等常见类型
   *   - 不支持 Function、DOM 节点等的完整复制
   *   - 循环引用会被正确处理
   *
   * @param value 需要深拷贝的值
   * @returns 深拷贝后的新对象
   *
   * @example
   *   const original = { user: { name: '张三', roles: ['admin'] } };
   *   const copy = LodashUtil.cloneDeep(original);
   *   copy.user.name = '李四'; // 不影响 original
   */
  static cloneDeep<T>(value: T): T {
    return _cloneDeep(value);
  }

  // ====== 对象属性选择/排除函数 ======

  /**
   * 选择对象的指定属性
   * 创建一个只包含选定属性的新对象
   *
   * @param obj 源对象
   * @param keys 需要保留的属性名数组
   * @returns 只包含指定属性的新对象
   *
   * @example
   *   const user = { id: 1, name: '张三', password: '123456', email: 'z@test.com' };
   *   const safeUser = LodashUtil.pick(user, ['name', 'email']);
   *   // safeUser = { name: '张三', email: 'z@test.com' }
   */
  static pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[],
  ): Pick<T, K> {
    return _pick(obj, keys) as Pick<T, K>;
  }

  /**
   * 排除对象的指定属性
   * 创建一个不包含排除属性的新对象
   *
   * 典型应用:
   *   - 移除敏感字段（password、token 等）
   *   - 移除内部字段后返回给前端
   *
   * @param obj 源对象
   * @param keys 需要移除的属性名数组
   * @returns 移除指定属性后的新对象
   *
   * @example
   *   const userData = { name: '张三', password: '123', salt: 'abc', role: 'admin' };
   *   const publicData = LodashUtil.omit(userData, ['password', 'salt']);
   *   // publicData = { name: '张三', role: 'admin' }
   */
  static omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[],
  ): Omit<T, K> {
    return _omit(obj, keys) as Omit<T, K>;
  }

  // ====== 比较判断函数 ======

  /**
   * 深比较两个值是否相等
   * 递归比较对象的所有层级属性
   *
   * @param value 第一个值
   * @param other 第二个值
   * @returns 是否深度相等
   *
   * @example
   *   LodashUtil.isEqual({ a: [1, 2] }, { a: [1, 2] }); // true
   *   LodashUtil.isEqual({ a: [1] }, { a: [1, 2] });    // false
   */
  static isEqual(value: unknown, other: unknown): boolean {
    return _isEqual(value, other);
  }

  /**
   * 检查值是否为空
   * 空的定义包括: null、undefined、空字符串、空数组、空对象等
   *
   * @param value 待检查的值
   * @returns 是否为空
   *
   * @example
   *   LodashUtil.isEmpty(null);           // true
   *   LodashUtil.isEmpty([]);             // true
   *   LodashUtil.isEmpty({});             // true
   *   LodashUtil.isEmpty('');             // true
   *   LodashUtil.isEmpty({ name: '' });   // false (有属性)
   */
  static isEmpty(value: unknown): boolean {
    return _isEmpty(value);
  }

  // ====== 类型检查函数 ======

  /**
   * 检查值是否为纯对象（由 Object 构造或字面量创建）
   *
   * @param value 待检查的值
   * @returns 是否为对象类型
   */
  static isObject(value: unknown): value is Record<string, any> {
    return _isObject(value);
  }

  /**
   * 检查值是否为数组
   *
   * @param value 待检查的值
   * @returns 是否为数组类型
   */
  static isArray<T = any>(value: unknown): value is T[] {
    return _isArray(value);
  }

  // ====== 数组处理函数 ======

  /**
   * 根据 iteratee 去重
   * 通过对象的某个属性或回调结果进行去重
   *
   * @param array 源数组
   * @param iteratee 去重的依据（属性名或函数）
   * @returns 去重后的新数组
   *
   * @example
   *   const users = [
   *     { id: 1, name: '张三' },
   *     { id: 2, name: '李四' },
   *     { id: 1, name: '张三(重复)' },
   *   ];
   *   const unique = LodashUtil.uniqBy(users, 'id');
   *   // 结果: [{ id: 1, name: '张三' }, { id: 2, name: '李四' }]
   */
  static uniqBy<T>(array: T[], iteratee: ((item: T) => any) | keyof T): T[] {
    return _uniqBy(array, iteratee);
  }

  /**
   * 根据 iteratee 排序
   * 返回排序后的新数组（不修改原数组）
   *
   * @param array 源数组
   * @param iteratees 排序依据（可多级排序）
   * @param orders 排序方向 ('asc' | 'desc')
   * @returns 排序后的新数组
   *
   * @example
   *   const sorted = LodashUtil.sortBy(users, ['age'], ['desc']);
   */
  static sortBy<T>(
    array: T[],
    iteratees: ((item: T) => any) | Array<(item: T) => any> | (keyof T)[],
    orders?: Array<'asc' | 'desc'>,
  ): T[] {
    return orders
      ? _sortBy(array, iteratees, orders)
      : _sortBy(array, iteratees);
  }

  /**
   * 根据 iteratee 分组
   * 返回键值对映射，键为分组依据，值为成员数组
   *
   * @param array 源数组
   * @param iteratee 分组依据（属性名或函数）
   * @returns 分组后的 Record 对象
   *
   * @example
   *   const grouped = LodashUtil.groupBy(users, 'department');
   *   // { tech: [...], sales: [...], hr: [...] }
   */
  static groupBy<T>(
    array: T[],
    iteratee: ((item: T) => any) | keyof T,
  ): Record<string, T[]> {
    return _groupBy(array, iteratee);
  }

  // ====== 对象合并函数 ======

  /**
   * 深度合并多个对象
   * 后面的对象属性会覆盖前面的同名属性
   *
   * @param objects 需要合并的对象列表
   * @returns 合并后的新对象
   *
   * @example
   *   const defaults = { theme: 'light', lang: 'zh', pagination: { pageSize: 10 } };
   *   const overrides = { theme: 'dark', pagination: { pageSize: 20 } };
   *   const merged = LodashUtil.merge(defaults, overrides);
   *   // { theme: 'dark', lang: 'zh', pagination: { pageSize: 20 } }
   */
  static merge<T extends object[]>(...objects: T): T[0] {
    return _merge({}, ...objects);
  }

  // ====== 路径访问函数 ======

  /**
   * 安全地获取嵌套对象的属性值
   * 避免链式访问时的 TypeError（Cannot read property of undefined/null）
   *
   * @param object 目标对象
   * @param path 属性路径（支持点号和数组语法）
   * @param defaultValue 路径不存在时的默认值
   * @returns 属性值或默认值
   *
   * @example
   *   const data = { user: { profile: { name: '张三' } } };
   *   LodashUtil.get(data, 'user.profile.name');         // '张三'
   *   LodashUtil.get(data, 'user.profile.age', 0);       // 0 (路径不存在)
   *   LodashUtil.get(data, 'users[0].name', '匿名');     // '匿名'
   */
  static get<T = any>(
    object: object | null | undefined,
    path: string | string[],
    defaultValue?: T,
  ): T {
    return _get(object, path, defaultValue);
  }

  /**
   * 设置嵌套对象的属性值
   * 自动创建中间不存在的路径
   *
   * @param object 目标对象
   * @param path 属性路径
   * @param value 要设置的值
   * @returns 设置后的对象（原对象也被修改）
   *
   * @example
   *   const obj = {};
   *   LodashUtil.set(obj, 'user.profile.name', '张三');
   *   // obj = { user: { profile: { name: '张三' } } }
   */
  static set<T extends object>(
    object: T,
    path: string | string[],
    value: any,
  ): T {
    return _set(object, path, value);
  }

  /**
   * 检查对象是否存在指定路径
   *
   * @param object 目标对象
   * @param path 属性路径
   * @returns 路径是否存在
   *
   * @example
   *   LodashUtil.has({ a: { b: 2 } }, 'a.b');  // true
   *   LodashUtil.has({ a: { b: 2 } }, 'a.c');  // false
   */
  static has(object: object, path: string | string[]): boolean {
    return _has(object, path);
  }
}
