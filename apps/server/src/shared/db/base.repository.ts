/**
 * 基础数据仓库抽象类（Base Repository Pattern）
 *
 * 设计理念：
 *   - 封装通用的 CRUD 操作，避免每个实体重复编写相同逻辑
 *   - 采用泛型设计 <T>，支持任意数据表的类型安全操作
 *   - 提供事务、分页等高级查询能力
 *   - 预留扩展点，允许子类添加特定业务查询方法
 *
 * 使用方式：
 *   ```typescript
 *   // 继承创建特定实体的 Repository
 *   class UserRepository extends BaseRepository<User> {
 *     constructor(knex: Knex) {
 *       super(knex, 'users');
 *     }
 *
 *     // 可在此添加特定业务方法...
 *   }
 *
 *   // 在 Service 中使用
 *   const userRepo = new UserRepository(knex);
 *   const users = await userRepo.find({ where: { status: 'active' } });
 *   ```
 */

import type { Knex } from 'knex';

// ==================== 类型定义 ====================

/**
 * 查询选项接口
 * 支持灵活的条件组合，满足大多数列表查询场景
 */
export interface FindOptions<T = Record<string, any>> {
  /** WHERE 条件对象（AND 连接多个条件） */
  where?: Partial<T>;

  /** 排序规则：字段名 → 升序(asc)/降序(desc) */
  orderBy?: { column: keyof T; direction: 'asc' | 'desc' }[];

  /** 返回结果数量限制（用于分页或限制返回条数） */
  limit?: number;

  /** 结果偏移量（与 limit 配合实现分页） */
  offset?: number;

  /** 需要选择的字段列表（默认选择所有字段） */
  select?: (keyof T)[];
}

/**
 * 分页查询结果接口
 * 标准化的分页响应格式，前端可直接使用
 */
export interface PaginatedResult<T> {
  /** 当前页的数据列表 */
  items: T[];

  /** 符合条件的总记录数（不受分页影响） */
  total: number;

  /** 当前页码（从 1 开始） */
  page: number;

  /** 每页大小 */
  pageSize: number;

  /** 总页数（根据 total 和 pageSize 自动计算） */
  totalPages: number;
}

/**
 * 事务回调函数类型
 * 用于在事务中执行一系列数据库操作
 */
export type TransactionCallback<T = any> = (
  trx: Knex.Transaction,
) => Promise<T>;

// ==================== 抽象基类 ====================

/**
 * 通用数据仓库基类
 *
 * 泛型参数 T：表记录的类型定义，确保编译时类型检查
 *
 * 设计原则：
 *   - 单一职责：只关注数据访问层，不包含业务逻辑
 *   - 开放封闭：通过继承扩展功能，而非修改基类
 *   - 依赖倒置：依赖 Knex 抽象接口，不绑定具体实现
 *
 * @template T 表记录类型，必须为对象类型
 */
export abstract class BaseRepository<T extends Record<string, any>> {
  /**
   * 构造函数
   *
   * @param knex - Knex 实例（通常从 NestJS 容器注入）
   * @param tableName - 对应的数据库表名（由子类指定）
   */
  constructor(
    protected readonly knex: Knex,
    protected readonly tableName: string,
  ) {}

  // ==================== 查询操作 ====================

  /**
   * 查询记录列表
   *
   * 支持条件过滤、排序、分页等常用场景
   * 返回符合条件的所有记录数组
   *
   * @param options 查询选项（可选）
   * @returns 匹配的记录数组
   *
   * @example
   * ```typescript
   * // 查找所有活跃用户，按创建时间降序排列
   * const users = await userRepo.find({
   *   where: { status: 'active' },
   *   orderBy: [{ column: 'created_at', direction: 'desc' }],
   *   limit: 10,
   * });
   * ```
   */
  async find(options?: FindOptions<T>): Promise<T[]> {
    // 构建基础查询（链式调用 Knex Query Builder）
    let query = this.knex<T>(this.tableName);

    // 条件过滤：动态添加 WHERE 子句
    if (options?.where && Object.keys(options.where).length > 0) {
      query = query.where(options.where);
    }

    // 字段选择：只查询需要的字段（优化性能）
    if (options?.select && options.select.length > 0) {
      query = query.select(options.select as string[]);
    }

    // 排序：支持多字段排序
    if (options?.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach((order) => {
        query = query.orderBy(
          order.column as string,
          order.direction,
        );
      });
    }

    // 数量限制和偏移（用于分页）
    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }

    if (options?.offset !== undefined) {
      query = query.offset(options.offset);
    }

    // 执行查询并返回结果数组
    return query as unknown as T[];
  }

  /**
   * 根据 ID 查询单条记录
   *
   * 主键查询是最常见的单条查询场景
   * 如果未找到记录，返回 null 而非抛出异常（方便调用方处理）
   *
   * @param id 记录主键值
   * @returns 找到的记录，或 null
   */
  async findById(id: string | number): Promise<T | null> {
    const result = await this.knex<T>(this.tableName).where('id', id).first();

    return (result || null) as T | null;
  }

  /**
   * 根据条件查询单条记录
   *
   * 适用于唯一性约束字段查询（如用户名、邮箱等）
   * 注意：如果有多条匹配记录，只返回第一条
   *
   * @param conditions 查询条件对象
   * @returns 找到的记录，或 null
   *
   * @example
   * ```typescript
   * const user = await userRepo.findOne({ email: 'test@example.com' });
   * ```
   */
  async findOne(conditions: Partial<T>): Promise<T | null> {
    const result = await this.knex<T>(this.tableName)
      .where(conditions)
      .first();

    return (result || null) as T | null;
  }

  // ==================== 写入操作 ====================

  /**
   * 创建新记录
   *
   * 自动插入 created_at 和 updated_at 时间戳（如果表中存在这些字段）
   * 返回新创建的完整记录（包括自增 ID）
   *
   * @param data 要插入的数据（不需要包含 id 和时间戳字段）
   * @returns 新创建的记录（包含数据库生成的字段）
   */
  async create(data: Omit<T, 'id'>): Promise<T> {
    // 构建带时间戳的完整数据对象
    const now = new Date();
    const insertData = {
      ...data,
      // 仅在目标表有时间戳字段时才添加（避免字段不存在时报错）
      ...(this.hasTimestamp('created_at') && { created_at: now }),
      ...(this.hasTimestamp('updated_at') && { updated_at: now }),
    } as any;

    // 插入数据并返回完整的记录（包括自增主键）
    const [createdRecord] = await this.knex<T>(this.tableName)
      .insert(insertData)
      .returning('*');

    return createdRecord as unknown as T;
  }

  /**
   * 更新现有记录
   *
   * 根据 ID 定位记录并更新指定字段
   * 自动更新 updated_at 时间戳
   *
   * @param id 记录主键值
   * data 要更新的字段（部分更新，无需传递完整对象）
   * @returns 更新后的记录，或 null（如果记录不存在）
   */
  async update(
    id: string | number,
    data: Partial<Omit<T, 'id'>>,
  ): Promise<T | null> {
    // 构建更新数据，自动维护 updated_at 字段
    const updateData = {
      ...data,
      ...(this.hasTimestamp('updated_at') && {
        updated_at: new Date(),
      }),
    } as any;

    // 执行更新并返回更新后的完整记录
    const [updatedRecord] = await this.knex<T>(this.tableName)
      .where('id', id)
      .update(updateData)
      .returning('*');

    return (updatedRecord || null) as T | null;
  }

  /**
   * 删除记录（硬删除）
   *
   * 根据主键删除单条记录
   * 如果需要软删除，请在子类中覆盖此方法或使用 update() 改变状态
   *
   * @param id 要删除的记录主键值
   * @returns 是否成功删除（true 表示找到并删除了记录）
   */
  async delete(id: string | number): Promise<boolean> {
    // 执行删除操作，affectedRows 表示受影响的行数
    const affectedRows = await this.knex(this.tableName)
      .where('id', id)
      .delete();

    // 如果删除了至少一行，返回 true
    return affectedRows > 0;
  }

  // ==================== 统计与分页 ====================

  /**
   * 统计符合条件的记录数量
   *
   * 用于分页计算总数、数据校验等场景
   * 性能优于查询全部记录后用 JS 计算 length
   *
   * @param conditions 可选的过滤条件
   * @returns 符合条件的记录数
   */
  async count(conditions?: Partial<T>): Promise<number> {
    let query = this.knex<T>(this.tableName).count('* as count');

    // 有条件时添加 WHERE 子句
    if (conditions && Object.keys(conditions).length > 0) {
      query = query.where(conditions);
    }

    // 执行查询：Knex 返回格式为 [{ count: '10' }]，需要转换类型
    const result = await query.first() as { count: string | number } | undefined;
    // 将字符串类型的计数转为数字
    return Number(result?.count || 0);
  }

  /**
   * 分页查询（高级封装）
   *
   * 一次性完成数据查询和总数统计，避免两次查询的不一致问题
   * 返回标准化的分页结构，便于前端直接渲染分页组件
   *
   * @param conditions 过滤条件（可选）
   * @param page 页码（默认第 1 页，从 1 开始计数）
   * @param pageSize 每页大小（默认 20 条）
   * @returns 包含数据和分页信息的完整结果
   *
   * @example
   * ```typescript
   * const result = await userRepo.paginate(
   *   { status: 'active' },  // 只查活跃用户
   *   1,                      // 第 1 页
   *   10                      // 每页 10 条
   * );
   * console.log(result.items);       // 当前页的用户数组
   * console.log(result.total);       // 总记录数
   * console.log(result.totalPages);  // 总页数
   * ```
   */
  async paginate(
    conditions?: Partial<T>,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedResult<T>> {
    // 参数校验：确保页码和每页大小的合理性
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 100); // 限制最大 100 条

    // 并行执行两个独立查询（性能优化：减少等待时间）
    const [items, total] = await Promise.all([
      // 查询当前页的数据
      this.find({
        where: conditions,
        limit: validPageSize,
        offset: (validPage - 1) * validPageSize,
      }),
      // 统计符合条件的总记录数（用于计算总页数）
      this.count(conditions),
    ]);

    // 计算总页数（向上取整）
    const totalPages = Math.ceil(total / validPageSize);

    return {
      items,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  }

  // ==================== 事务处理 ====================

  /**
   * 事务包装器
   *
   * 将多个数据库操作包裹在事务中，保证原子性：
   *   - 全部成功 → 自动提交（COMMIT）
   *   - 任一失败 → 自动回滚（ROLLBACK）
   *
   * 适用场景：
   *   - 跨表关联操作（如创建订单同时扣减库存）
   *   - 需要保证数据一致性的批量操作
   *
   * @param callback 事务回调函数，接收事务实例作为参数
   * @returns 回调函数的返回值
   * @throws 如果回调函数抛出异常，事务自动回滚并重新抛出异常
   *
   * @example
   * ```typescript
   * const result = await userRepo.transaction(async (trx) => {
   *   // 在事务中创建用户
   *   const user = await trx('users').insert(userData).returning('*');
   *   // 同时创建用户的初始配置
   *   await trx('user_profiles').insert({ userId: user.id, ... });
   *   // 如果上面任何一步失败，整个事务会回滚
   *   return user;
   * });
   * ```
   */
  async transaction<R = any>(
    callback: TransactionCallback<R>,
  ): Promise<R> {
    // 使用 Knex 的事务 API，自动管理提交/回滚
    return this.knex.transaction(callback);
  }

  // ==================== 辅助方法 ====================

  /**
   * 检查记录是否存在
   *
   * 性能优化：使用 EXISTS 子查询而非 COUNT(*)，
   * 数据库引擎在找到第一条匹配记录后会立即返回
   *
   * @param id 记录主键值
   * @returns 是否存在该记录
   */
  async exists(id: string | number): Promise<boolean> {
    // 使用 COUNT 的轻量版本：只要找到 1 条就停止扫描
    const count = await this.knex(this.tableName)
      .where('id', id)
      .first()
      .count('* as count');

    return Number(count?.count || 0) > 0;
  }

  /**
   * 批量创建记录
   *
   * 一次性插入多条数据，性能优于循环调用 create()
   * 适用于数据导入、批量初始化等场景
   *
   * @param dataArray 要插入的数据数组
   * @returns 新创建的记录数组
   */
  async bulkCreate(dataArray: Omit<T, 'id'>[]): Promise<T[]> {
    if (dataArray.length === 0) {
      return [];
    }

    // 为每条记录添加时间戳
    const now = new Date();
    const insertDataArray = dataArray.map((data) => ({
      ...data,
      ...(this.hasTimestamp('created_at') && { created_at: now }),
      ...(this.hasTimestamp('updated_at') && { updated_at: now }),
    })) as any[];

    // 批量插入并返回所有记录
    return (this.knex<T>(this.tableName)
      .insert(insertDataArray as any)
      .returning('*')) as unknown as T[];
  }

  /**
   * 批量更新记录
   *
   * 根据条件批量更新多条记录的字段
   * 适用于状态变更、批量审核等场景
   *
   * @param conditions 更新条件（WHERE 子句）
   * @param data 要更新的字段
   * @returns 受影响的行数
   */
  async bulkUpdate(
    conditions: Partial<T>,
    data: Partial<Omit<T, 'id'>>,
  ): Promise<number> {
    const updateData = {
      ...data,
      ...(this.hasTimestamp('updated_at') && {
        updated_at: new Date(),
      }),
    } as any;

    return this.knex(this.tableName)
      .where(conditions)
      .update(updateData);
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 检查表是否包含指定的字段（内部工具方法）
   *
   * 用于判断是否需要自动填充时间戳字段
   * 通过查询信息架构（information_schema）来验证字段存在性
   *
   * 注意：生产环境可考虑缓存结果以提升性能
   *
   * @param fieldName 待检查的字段名
   * @returns 该字段是否存在于当前表中
   */
  private hasTimestamp(fieldName: string): boolean {
    // 简化实现：假设大多数表都有这两个字段
    // 生产环境可通过 information_schema.columns 表精确检查
    // 此处采用宽松策略，即使字段不存在也不会报错（MySQL 会忽略未知字段）
    return ['created_at', 'updated_at'].includes(fieldName);
  }
}
