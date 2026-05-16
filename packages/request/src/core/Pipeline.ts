import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { Middleware, RequestContext } from '../types/middleware.js';
import type { InternalRequestConfig } from '../types/options.js';

/**
 * 中间件条目（内部使用）
 * 包含中间件名称和处理器
 */
interface MiddlewareEntry<T = unknown> {
  name: string;
  handler: Middleware<T>;
}

/**
 * 洋葱模型 Pipeline 引擎
 * 
 * ## 核心设计原则
 * 1. **轻量**：~80-100 行核心代码，零外部依赖（仅依赖 axios 类型）
 * 2. **类型安全**：完整的泛型约束
 * 3. **可调试**：支持中间件命名和执行追踪
 * 4. **可组合**：支持子管道嵌套
 * 
 * ## 执行模型（洋葱模型）
 * ```
 *   index=0        index=1        index=N       core
 *   M0.before ▶ M1.before ▶ ... ▶ MN.before ▶ axios.request()
 *                                               │
 *   M0.after  ◀ M1.after  ◀ ... ◀ MN.after  ◀ return
 * ```
 * 
 * 每个中间件在调用 `ctx.next()` 前的代码是「前置阶段」（从外到内），
 * 在 `ctx.next()` 后的代码是「后置阶段」（从内到外）。
 * 
 * @example
 * ```typescript
 * const pipeline = new Pipeline();
 * 
 * // 注册中间件
 * pipeline.use('logger', async (ctx) => {
 *   console.log(`请求: ${ctx.config.url}`);
 *   await ctx.next();  // 穿透到下一个中间件
 *   console.log(`响应: ${ctx.response?.status}`);
 * });
 * 
 * // 执行管道
 * const ctx = createRequestContext(config);
 * await pipeline.execute(ctx);
 * ```
 */
export class Pipeline<T = unknown> {
  /** 已注册的中间件列表 */
  private middlewares: MiddlewareEntry<T>[] = [];
  
  /** 裸 axios 实例（无拦截器） */
  private rawAxiosInstance: AxiosInstance;

  constructor(axiosInstance?: AxiosInstance) {
    this.rawAxiosInstance = axiosInstance ?? axios.create();
  }

  /**
   * 注册中间件
   * 
   * 如果同名中间件已存在，会先移除旧的再注册新的。
   * 支持链式调用。
   * 
   * @param name - 中间件名称（用于调试、排序、移除）
   * @param handler - 中间件处理函数
   * @returns this（支持链式调用）
   */
  use(name: string, handler: Middleware<T>): this {
    const exists = this.middlewares.some(m => m.name === name);
    if (exists) {
      this.eject(name);
    }
    this.middlewares.push({ name, handler });
    return this;
  }

  /**
   * 在指定位置插入中间件
   * 
   * @param name - 中间件名称
   * @param handler - 中间件处理函数
   * @param options - 插入位置选项
   * @returns this（支持链式调用）
   */
  insert(
    name: string,
    handler: Middleware<T>,
    options: { position: 'before' | 'after'; relativeTo: string },
  ): this {
    const index = this.middlewares.findIndex(m => m.name === options.relativeTo);
    if (index === -1) {
      throw new Error(`[Pipeline] 找不到参考中间件 "${options.relativeTo}"`);
    }
    
    const insertIndex = options.position === 'before' ? index : index + 1;
    this.middlewares.splice(insertIndex, 0, { name, handler });
    return this;
  }

  /**
   * 移除指定中间件
   * 
   * @param name - 要移除的中间件名称
   * @returns this（支持链式调用）
   */
  eject(name: string): this {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
    return this;
  }

  /**
   * ★ 核心：执行管道
   * 
   * 递归驱动中间件链，实现洋葱模型的 Before/After 语义。
   * 
   * ## 执行流程
   * 1. 从第 0 个中间件开始递归
   * 2. 每个中间件执行时，`ctx.next` 被绑定为「调用下一个中间件」
   * 3. 当所有中间件都穿透后，调用 `executeCore` 发起实际 HTTP 请求
   * 4. 然后按相反顺序返回，执行每个中间件的 After 逻辑
   * 
   * @param ctx - 请求上下文（由 createRequestContext 创建）
   */
  async execute(ctx: RequestContext<T>): Promise<void> {
    let executionIndex = 0;

    /**
     * 递归调度函数
     * 驱动中间件链的递归执行
     */
    const dispatch = async (currentIndex: number): Promise<void> => {
      // 终止条件：已被终止 或 所有中间件都已穿透 → 执行核心请求
      if (ctx.meta.terminated || currentIndex >= this.middlewares.length) {
        await this.executeCore(ctx);
        return;
      }

      // 获取当前中间件
      const { name, handler } = this.middlewares[currentIndex];

      try {
        // 将 ctx.next 绑定为「调用下一个中间件」
        ctx.next = () => dispatch(currentIndex + 1);
        // 执行当前中间件
        await handler(ctx);
      } catch (err) {
        // 中间件抛出异常时，记录错误并标记终止
        ctx.error = err;
        ctx.meta.terminated = true;
        await this.executeCore(ctx);
      }
    };

    // 从索引 0 开始执行
    await dispatch(executionIndex);
  }

  /**
   * 管道核心：实际 HTTP 通信
   * 
   * 这是整个洋葱的「芯」— 唯一与 axios 交互的地方。
   * 只有当所有中间件的 Before 逻辑都执行完毕后才会到达这里。
   * 
   * 支持两种模式：
   * 1. 正常模式：通过 axios 发起 HTTP 请求
   * 2. 快捷模式：直接返回预设结果（用于缓存、Mock 等场景）
   */
  private async executeCore(ctx: RequestContext<T>): Promise<void> {
    // 快捷结果模式（缓存命中/Mock 等）
    if (ctx.meta.shortcutResult !== undefined) {
      ctx.response = {
        data: ctx.meta.shortcutResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: ctx.config,
      } as AxiosResponse<T>;
      return;
    }

    // 正常 HTTP 请求模式
    try {
      ctx.response = await this.rawAxiosInstance.request(ctx.config);
    } catch (err) {
      throw err;
    }
  }

  /**
   * 替换 axios 实例
   * 用于测试或特殊场景
   */
  setAxiosInstance(instance: AxiosInstance): void {
    this.rawAxiosInstance = instance;
  }

  /**
   * 获取所有已注册的中间件名称（按注册顺序）
   */
  getMiddlewareNames(): string[] {
    return this.middlewares.map(m => m.name);
  }

  /**
   * 获取已注册的中间件数量
   */
  get length(): number {
    return this.middlewares.length;
  }
}
