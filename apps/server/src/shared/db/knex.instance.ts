/**
 * Knex 实例工厂模块
 *
 * 职责：
 *   1. 封装 Knex 连接实例的创建与生命周期管理
 *   2. 提供 NestJS DynamicModule 供其他模块按需导入
 *   3. 应用关闭时自动销毁连接池，防止资源泄漏
 *
 * 使用方式：
 *   // app.module.ts 或任意功能模块中注册
 *   import { KnexModule } from '@/shared/db/knex.instance';
 *   @Module({
 *     imports: [KnexModule.forRoot()],
 *   })
 *
 *   // 在 Service/Repository 中注入使用
 *   constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}
 */

import {
  DynamicModule,
  Global,
  Module,
  OnModuleDestroy,
  Provider,
  Injectable,
  Inject
} from '@nestjs/common';
import type { Knex } from 'knex';
import knex from 'knex';
import { createKnexConfig } from '../../config/knex.config.js';
import { getConfig } from '../../config/env.config.js';

// ==================== Injection Token ====================
// 使用 Symbol 作为 token，避免字符串冲突，提升类型安全性
export const KNEX_CONNECTION = Symbol.for('KNEX_CONNECTION');

// ==================== 接口定义 ====================

/**
 * Knex 模块异步配置接口
 * 支持通过 useFactory 动态创建配置（如从 ConfigService 读取）
 */
export interface KnexModuleAsyncOptions {
  /**
   * 异步工厂函数，返回 Knex.Config 或已创建的 Knex 实例
   * 可注入其他依赖（如 ConfigService）进行动态配置
   */
  useFactory?: (...args: any[]) => Promise<Knex.Config | Knex>;

  /**
   * 工厂函数依赖的 Provider 列表
   * 当 useFactory 需要注入其他服务时使用
   */
  inject?: any[];
}

/**
 * Knex 模块同步配置接口（简化版，直接传入配置对象）
 */
export interface KnexModuleOptions {
  /** Knex 配置对象或已创建的实例 */
  config?: Knex.Config | Knex;
}

// ==================== 核心服务类 ====================

/**
 * Knex 连接管理服务
 *
 * 设计要点：
 *   - 实现 OnModuleDestroy 接口，确保应用关闭时正确释放连接池
 *   - 封装 destroy 逻辑，避免直接操作底层连接
 *   - 单例模式：整个应用共享一个 Knex 实例和连接池
 */
@Injectable()
export class KnexConnectionService implements OnModuleDestroy {
  constructor(private readonly knexInstance: Knex) {}

  /** 获取 Knex 实例（供外部调用） */
  getKnex(): Knex {
    return this.knexInstance;
  }

  /**
   * NestJS 生命周期钩子：模块销毁时自动调用
   *
   * 重要说明：
   *   - 必须销毁连接池，否则 Node.js 进程不会正常退出
   *   - destroy() 会等待所有活跃查询完成后才关闭连接
   *   - 设置 5 秒超时，避免长时间阻塞进程退出
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // 销毁连接池并等待所有连接释放
      await this.knexInstance.destroy();
      console.log('[Knex] 连接池已成功销毁');
    } catch (error) {
      console.error('[Knex] 连接池销毁失败:', error);
      // 不抛出错误，避免影响其他模块的清理工作
    }
  }
}

// ==================== 模块定义 ====================

@Global() // 全局模块，注册后可在任何地方注入 KNEX_CONNECTION
@Module({})
export class KnexModule {
  /**
   * 同步初始化方式（推荐用于大多数场景）
   *
   * 直接使用项目默认配置创建 Knex 实例
   * 适用于不需要动态配置的场景
   *
   * @param options 可选的自定义配置（覆盖默认配置）
   * @returns NestJS DynamicModule
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [KnexModule.forRoot()],
   * })
   * ```
   */
  static forRoot(options?: KnexModuleOptions): DynamicModule {
    // 决定使用自定义配置还是默认配置
    const knexInstance =
      options?.config && 'raw' in options.config
        ? (options.config as Knex)
        : knex(options?.config || createKnexConfig(getConfig()));

    // 注册到 IoC 容器的 Provider 列表
    const providers: Provider[] = [
      // 1. 注入 Knex 实例本身（供 Repository 等直接使用）
      {
        provide: KNEX_CONNECTION,
        useValue: knexInstance,
      },
      // 2. 注入连接管理服务（负责生命周期管理）
      KnexConnectionService,
    ];

    // 导出 KNEX_CONNECTION，允许其他模块注入使用
    const exports = [KNEX_CONNECTION];

    return {
      module: KnexModule,
      providers,
      exports,
      global: true, // 全局可用
    };
  }

  /**
   * 异步初始化方式（适用于需要动态配置的场景）
   *
   * 支持通过 useFactory 注入 ConfigService 等依赖，
   * 实现运行时动态读取数据库配置
   *
   * @param options 异步配置选项
   * @returns NestJS DynamicModule
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [KnexModule.forRootAsync({
   *     useFactory: (configService: ConfigService) => ({
   *       client: 'mysql2',
   *       connection: configService.get('DATABASE_URL'),
   *     }),
   *     inject: [ConfigService],
   *   })],
   * })
   * ```
   */
  static forRootAsync(options: KnexModuleAsyncOptions): DynamicModule {
    // 异步工厂 Provider：延迟创建 Knex 实例
    const knexFactoryProvider: Provider = {
      provide: KNEX_CONNECTION,
      // useFactory 可以返回 Config 对象或已创建的 Knex 实例
      useFactory: async (...args: any[]) => {
        if (!options.useFactory) {
          throw new Error('KnexModule.forRootAsync() 必须提供 useFactory');
        }

        const result = await options.useFactory(...args);

        // 如果工厂函数返回的是配置对象，则用其创建 Knex 实例
        if ('client' in result || 'connection' in result) {
          return knex(result as Knex.Config);
        }

        // 如果返回的是 Knex 实例，直接使用
        return result as Knex;
      },
      // 注入工厂函数所需的依赖
      inject: options.inject || [],
    };

    const providers: Provider[] = [
      knexFactoryProvider,
      KnexConnectionService, // 仍然需要生命周期管理服务
    ];

    const exports = [KNEX_CONNECTION];

    return {
      module: KnexModule,
      providers,
      exports,
      global: true,
    };
  }
}

// ==================== 便捷导出 ====================

/**
 * 默认 Knex 实例（非注入场景可直接使用）
 *
 * 注意：
 *   - 仅用于无法依赖注入的特殊场景（如独立脚本、迁移工具等）
 *   - 在正常的 NestJS 服务/控制器中，应优先使用 @Inject(KNEX_CONNECTION)
 *   - 此实例不会参与 NestJS 的生命周期管理
 */
export const defaultKnex = knex(createKnexConfig(getConfig()));
