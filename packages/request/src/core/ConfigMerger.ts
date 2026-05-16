import type { InternalAxiosRequestConfig } from 'axios';
import type { RequestOptions, GlobalDefaults, InstanceConfig, InternalRequestConfig } from '../types/options.js';

type MergeTarget = Record<string, unknown>;

/**
 * 三层配置合并器
 * 
 * ## 合并优先级（从低到高）
 * 1. **GlobalDefaults** - 全局默认配置（跨实例共享）
 * 2. **InstanceConfig** - 实例级配置（对单个 HttpClient 实例生效）
 * 3. **RequestOptions** - 单次请求选项（每次调用时传入，优先级最高）
 * 
 * ## 合并策略
 * - **普通对象**：递归深度合并
 * - **headers**：浅合并（后者覆盖前者同名 header）
 * - **基本类型/数组**：直接覆盖
 * - **undefined 值**：跳过（不覆盖已有值）
 * 
 * @example
 * ```typescript
 * const merger = new ConfigMerger();
 * const config = merger.merge(
 *   { timeout: 5000, headers: { 'X-Global': '1' } },     // 全局默认
 *   { baseURL: '/api', headers: { 'X-Instance': '2' } },  // 实例配置
 *   { url: '/users', headers: { 'Authorization': 'xxx' }} // 请求选项
 * );
 * // 结果: {
 * //   timeout: 5000,
 * //   baseURL: '/api',
 * //   url: '/users',
 * //   headers: { 'X-Global': '1', 'X-Instance': '2', 'Authorization': 'xxx' }
 * // }
 * ```
 */
export class ConfigMerger {
  /**
   * 合并三层配置
   * 
   * @param globalDefaults - 全局默认配置
   * @param instanceConfig - 实例级配置
   * @param requestOptions - 单次请求选项
   * @returns 合并后的最终请求配置
   */
  merge(
    globalDefaults: GlobalDefaults,
    instanceConfig: InstanceConfig,
    requestOptions: RequestOptions,
  ): InternalRequestConfig {
    const target = {} as MergeTarget;
    
    this.deepMerge(target, globalDefaults as MergeTarget);
    this.deepMerge(target, instanceConfig as MergeTarget);
    this.deepMerge(target, requestOptions as MergeTarget);

    return target as unknown as InternalRequestConfig;
  }

  /**
   * 深度合并两个对象
   * 
   * @param target - 目标对象（会被修改）
   * @param source - 源对象
   */
  private deepMerge(target: MergeTarget, source: MergeTarget): void {
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (sourceVal === undefined) continue;

      if (
        this.isPlainObject(sourceVal) &&
        this.isPlainObject(targetVal) &&
        key !== 'headers'
      ) {
        // 普通对象：递归深度合并
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key] as MergeTarget, sourceVal as MergeTarget);
      } else if (key === 'headers' && this.isPlainObject(sourceVal)) {
        // headers 特殊处理：浅合并（保留所有 header，后者覆盖同名 header）
        target[key] = { ...(targetVal as Record<string, unknown> | undefined), ...sourceVal };
      } else {
        // 基本类型、数组等：直接覆盖
        target[key] = sourceVal;
      }
    }
  }

  /**
   * 判断是否为普通对象（非 null、非数组、非特殊对象）
   */
  private isPlainObject(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }
}
