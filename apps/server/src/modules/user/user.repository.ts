/**
 * 用户数据仓库（User Repository）
 *
 * 继承 BaseRepository，提供用户相关的特定查询方法
 *
 * 设计要点：
 *   - 封装用户表的复杂业务查询（联表、聚合统计等）
 *   - 保持类型安全：所有方法都有明确的输入输出类型
 *   - 可独立于 Service 层进行单元测试
 *   - 遵循单一职责：只关注数据访问，不包含业务逻辑验证
 *
 * 使用方式：
 *   ```typescript
 *   // 在 UserModule 中注册为 Provider
 *   @Module({
 *     providers: [UserRepository],
 *     exports: [UserRepository],
 *   })
 *
 *   // 在 UserService 中注入使用
 *   constructor(private readonly userRepo: UserRepository) {}
 *   const user = await this.userRepo.findByUsername('admin');
 *   ```
 *
 * TODO: [查询性能优化] 添加数据库索引建议和慢查询监控
 *   - 为 username, email, status, created_at 字段添加复合索引
 *   - 集成 Knex 的 debug 模式记录超过 100ms 的慢查询
 *   - 考虑使用 EXPLAIN ANALYZE 分析复杂联表查询的执行计划
 *   生产环境建议: 在 Prisma schema.prisma 中定义 @@index
 *
 * TODO: [缓存集成] 热点用户数据 Redis 缓存策略
 *   - findByUsername/findByEmail 结果缓存 5 分钟（高频访问）
 *   - findWithRoles 结果缓存 10 分钟（角色变更频率低）
 *   - getUserStats 缓存 1 分钟并使用缓存穿透保护
 *   - 数据变更时主动失效相关缓存（观察者模式或事件驱动）
 *   可复用: RedisCacheService (redis-cache.service.ts)
 *
 * TODO: [审计日志] 关键操作审计追踪
 *   - 记录用户状态变更（updateUserStatus）的操作人、时间、原因
 *   - 记录敏感信息查询（如批量导出用户列表）
 *   - 审计日志写入独立表（audit_logs）或发送到 ELK/Splunk
 *   符合 GDPR/等保合规要求
 */
import type { Knex } from 'knex';
import { Injectable, Inject } from '@nestjs/common';
import {
  BaseRepository,
  FindOptions,
  PaginatedResult,
} from '../../shared/db/base.repository';
import { KNEX_CONNECTION } from '../../shared/db/knex.instance';

// ==================== 类型定义 ====================

/**
 * 用户实体接口
 *
 * 定义 users 表的完整字段结构，确保编译时类型检查
 * 所有字段都标记为可选（?），因为不同场景返回的字段可能不同
 */
export interface User {
  /** 用户主键（自增 ID） */
  id?: number;

  /** 用户名（登录凭证之一） */
  username?: string;

  /** 邮箱地址（登录凭证之二） */
  email?: string;

  /** 密码哈希值（bcrypt 加密后的密文） */
  password_hash?: string;

  /** 显示名称（可修改的昵称） */
  display_name?: string;

  /** 头像 URL */
  avatar_url?: string;

  /**
   * 用户状态枚举：
   *   - active: 正常可用
   *   - inactive: 已禁用（无法登录）
   *   - suspended: 已封号（违规处理）
   */
  status?: 'active' | 'inactive' | 'suspended';

  /** 角色标识（简单场景可用，复杂场景用关联表） */
  role?: string;

  /** 最后登录时间 */
  last_login_at?: Date;

  /** 创建时间（自动填充） */
  created_at?: Date;

  /** 更新时间（自动填充） */
  updated_at?: Date;
}

/**
 * 用户角色关联接口（用于联表查询结果）
 */
export interface UserRole {
  /** 角色 ID */
  role_id: number;

  /** 角色名称 */
  role_name: string;

  /** 角色描述 */
  description?: string;
}

/**
 * 用户详细信息（包含角色列表）
 * 用于 findWithRoles 等联表查询方法的返回类型
 */
export interface UserWithRoles extends User {
  /** 用户关联的角色数组 */
  roles?: UserRole[];
}

/**
 * 用户搜索选项接口
 * 扩展基础 FindOptions，增加搜索关键词参数
 */
export interface UserSearchOptions extends FindOptions<User> {
  /** 搜索关键词（模糊匹配用户名或邮箱） */
  keyword?: string;
}

/**
 * 用户统计信息接口
 * 用于 getUserStats 方法的返回值
 */
export interface UserStats {
  /** 总用户数 */
  totalUsers: number;

  /** 活跃用户数（30 天内有登录） */
  activeUsers: number;

  /** 本月新注册用户数 */
  newUsersThisMonth: number;

  /** 近 7 天每天的新增用户数（用于趋势图） */
  registrationTrend: Array<{
    date: string; // YYYY-MM-DD 格式
    count: number;
  }>;
}

// ==================== Repository 实现 ====================

/**
 * 用户数据仓库类
 *
 * 通过 @Injectable() 装饰器标记为 NestJS 可注入的服务
 * 构造函数通过依赖注入获取 Knex 实例
 *
 * 继承 BaseRepository<User> 获得通用 CRUD 能力，
 * 同时扩展用户特定的业务查询方法
 */
@Injectable()
export class UserRepository extends BaseRepository<User> {
  /**
   * 构造函数
   *
   * 使用 NestJS 的构造函数注入模式获取 Knex 实例
   * KNEX_CONNECTION 是在 knex.instance.ts 中定义的 Injection Token
   *
   * @param knex 从 IoC 容器注入的 Knex 实例
   */
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    // 调用父类构造函数，指定表名为 'users'
    super(knex, 'users');
  }

  // ==================== 基础查找方法 ====================

  /**
   * 根据用户名查找用户
   *
   * 用户名通常具有唯一性约束，因此返回单个用户或 null
   * 主要用于登录认证时的用户查找
   *
   * @param username 要查找的用户名（区分大小写）
   * @returns 找到的用户对象，或 null（如果不存在）
   *
   * @example
   * ```typescript
   * const user = await userRepo.findByUsername('zhangsan');
   * if (user) {
   *   console.log('找到用户:', user.display_name);
   * }
   * ```
   */
  async findByUsername(username: string): Promise<User | null> {
    // 使用父类的 findOne 方法，传入唯一性条件
    return this.findOne({ username: username } as Partial<User>);
  }

  /**
   * 根据邮箱地址查找用户
   *
   * 邮箱同样是唯一性字段，常用于：
   *   - 邮箱登录认证
   *   - 忘记密码时的身份验证
   *   - 发送通知前的有效性检查
   *
   * @param email 要查找的邮箱地址（已转为小写）
   * @returns 找到的用户对象，或 null
   *
   * @example
   * ```typescript
   * const user = await userRepo.findByEmail('zhangsan@example.com');
   * ```
   */
  async findByEmail(email: string): Promise<User | null> {
    // 邮箱存储时统一为小写，查询时也转小写确保匹配
    return this.findOne({
      email: email.toLowerCase(),
    } as Partial<User>);
  }

  // ==================== 高级搜索方法 ====================

  /**
   * 用户模糊搜索
   *
   * 支持按关键词在用户名和邮箱中进行模糊匹配
   * 适用于管理后台的用户列表搜索功能
   *
   * 性能优化说明：
   *   - 使用 LIKE '%keyword%' 进行模糊匹配
   *   - 生产环境建议添加全文索引以提升性能
   *   - 关键词为空时退化为普通分页查询
   *
   * @param keyword 搜索关键词（可选）
   * @param options 查询选项（排序、分页等）
   * @returns 分页查询结果
   *
   * @example
   * ```typescript
   * // 搜索包含 "张" 的用户
   * const result = await userRepo.searchUsers('张', {
   *   orderBy: [{ column: 'created_at', direction: 'desc' }],
   * });
   * console.log(`找到 ${result.total} 个匹配用户`);
   * ```
   */
  async searchUsers(
    keyword?: string,
    options?: UserSearchOptions,
  ): Promise<PaginatedResult<User>> {
    // 基础查询构建器
    let query = this.knex<User>('users');

    // 如果有搜索关键词，添加模糊匹配条件
    if (keyword && keyword.trim()) {
      const searchTerm = `%${keyword.trim()}%`; // 添加通配符

      // 在用户名 OR 邮箱中搜索（使用括号分组确保 OR 逻辑正确）
      query = query.where((builder) => {
        builder
          .where('username', 'like', searchTerm)
          .orWhere('email', 'like', searchTerm);
      });
    }

    // 应用额外的过滤条件（如果有）
    if (options?.where && Object.keys(options.where).length > 0) {
      query = query.andWhere(options.where);
    }

    // 应用排序规则
    if (options?.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach((order) => {
        query = query.orderBy(order.column as string, order.direction);
      });
    }

    // 计算分页参数
    const page = options?.limit && options?.offset
      ? Math.floor(options.offset / options.limit) + 1
      : 1;
    const pageSize = options?.limit || 20;

    // 并行执行数据查询和总数统计
    const [items, total] = await Promise.all([
      // 分页查询当前页数据
      query
        .clone() // 克隆查询以避免状态污染
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      // 统计符合条件的总记录数
      query.clone().count('* as count').first().then((result) =>
        Number((result as any)?.count || 0),
      ),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 联表查询方法 ====================

  /**
   * 查询用户及其关联的角色信息
   *
   * 使用 LEFT JOIN 联接用户表和角色关联表
   * 返回包含完整角色列表的用户对象
   *
   * 数据模型假设：
   *   - users 表：用户基本信息
   *   - user_roles 表：用户-角色多对多关联中间表
   *   - roles 表：角色定义表
   *
   * SQL 等效语句：
   *   SELECT u.*, r.*
   *   FROM users u
   *   LEFT JOIN user_roles ur ON u.id = ur.user_id
   *   LEFT JOIN roles r ON ur.role_id = r.id
   *   WHERE u.id = ?
   *
   * @param userId 用户主键 ID
   * @returns 包含角色信息的用户对象，或 null
   *
   * @example
   * ```typescript
   * const userWithRoles = await userRepo.findWithRoles(123);
   * if (userWithRoles?.roles) {
   *   console.log('用户角色:', userWithRoles.roles.map(r => r.role_name));
   * }
   * ```
   */
  async findWithRoles(userId: number): Promise<UserWithRoles | null> {
    // 主查询：获取用户基本信息
    const user = await this.findById(userId);

    if (!user) {
      return null; // 用户不存在，直接返回 null
    }

    // 子查询：获取该用户的所有角色（通过中间表联查）
    const roles = await this.knex<UserRole>('roles')
      .select(
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.description',
      )
      // 联接中间表（user_roles）建立用户与角色的关系
      .innerJoin('user_roles', 'roles.id', 'user_roles.role_id')
      .where('user_roles.user_id', userId);

    // 组合最终结果：用户信息 + 角色列表
    return {
      ...user,
      roles: roles.length > 0 ? roles : undefined, // 无角色时不返回空数组
    };
  }

  // ==================== 聚合统计方法 ====================

  /**
   * 获取用户聚合统计数据
   *
   * 生成管理仪表盘所需的各项用户指标：
   *   - 总用户数、活跃用户数
   *   - 新增用户趋势（支持时间维度分析）
   *
   * 性能考虑：
   *   - 多个统计查询并行执行，减少总体耗时
   *   - 时间范围查询利用索引（created_at 字段应有索引）
   *   - 趋势数据限制最近 7 天，避免大量数据传输
   *
   * @returns 包含各项统计指标的对象
   *
   * @example
   * ```typescript
   * const stats = await userRepo.getUserStats();
   * console.log(`总用户数: ${stats.totalUsers}`);
   * console.log(`活跃用户: ${stats.activeUsers}`);
   * stats.registrationTrend.forEach(day => {
   *   console.log(`${day.date}: +${day.count} 人`);
   * });
   * ```
   */
  async getUserStats(): Promise<UserStats> {
    // 定义时间边界（用于活跃度判断和趋势计算）
    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    // 并行执行多个独立的统计查询（性能优化关键点）
    const [totalUsers, activeUsers, newUsersThisMonth, registrationTrend] =
      await Promise.all([
        // 1. 总用户数：简单的 COUNT 查询
        this.knex('users').count('* as count').first().then((r) =>
          Number(r?.count || 0),
        ),

        // 2. 活跃用户数：30 天内有登录记录的用户
        this.knex('users')
          .where('last_login_at', '>=', thirtyDaysAgo)
          .count('* as count')
          .first()
          .then((r) => Number(r?.count || 0)),

        // 3. 本月新增用户数：当月 1 日至今的注册用户
        this.knex('users')
          .where('created_at', '>=', new Date(now.getFullYear(), now.getMonth(), 1))
          .count('* as count')
          .first()
          .then((r) => Number(r?.count || 0)),

        // 4. 注册趋势：近 7 天每天新增用户数（GROUP BY + DATE 函数）
        this.knex('users')
          .select(
            // 使用 DATE() 函数提取日期部分（忽略时分秒）
            this.knex.raw('DATE(created_at) as date'),
          )
          .count('* as count')
          .where('created_at', '>=', sevenDaysAgo)
          // 按日期分组
          .groupByRaw('DATE(created_at)')
          // 按日期升序排列（旧到新）
          .orderBy('date', 'asc'),
      ]);

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      // 格式化趋势数据：确保类型一致
      registrationTrend: (registrationTrend as Array<any>).map((row) => ({
        date: row.date,
        count: Number(row.count || 0),
      })),
    };
  }

  // ==================== 状态管理方法 ====================

  /**
   * 更新用户状态
   *
   * 专用的状态更新方法，相比通用的 update() 方法：
   *   - 语义更清晰（明确表达业务意图）
   *   - 可添加状态变更的前置/后置逻辑（如审计日志）
   *   - 可扩展状态机校验（如禁止某些状态转换）
   *
   * 支持的状态值：
   *   - active: 激活用户（解封/启用）
   *   - inactive: 禁用用户（管理员手动禁用）
   *   - suspended: 封号处理（违规处罚）
   *
   * @param id 用户主键 ID
   * @param status 目标状态值
   * @returns 更新后的用户对象，或 null（如果用户不存在）
   *
   * @example
   * ```typescript
   * // 封禁违规用户
   * const updated = await userRepo.updateUserStatus(123, 'suspended');
   * if (!updated) {
   *   throw new NotFoundException('用户不存在');
   * }
   * ```
   */
  async updateUserStatus(
    id: number,
    status: 'active' | 'inactive' | 'suspended',
  ): Promise<User | null> {
    // 调用父类的 update 方法，只更新 status 字段
    // 自动维护 updated_at 时间戳
    return this.update(id, { status } as Partial<Omit<User, 'id'>>);
  }

  // ==================== 业务辅助方法 ====================

  /**
   * 根据用户名或邮箱查找用户（统一登录入口）
   *
   * 登录场景中，用户可能输入用户名或邮箱，
   * 此方法统一处理两种情况，简化上层逻辑
   *
   * @param loginName 用户输入的登录凭证（可能是用户名或邮箱）
   * @returns 找到的用户对象，或 null
   *
   * @example
   * ```typescript
   * // 登录接口中的典型用法
   * const user = await userRepo.findByLoginName(loginDto.account);
   * if (!user || !await bcrypt.compare(loginDto.password, user.password_hash)) {
   *   throw new UnauthorizedException('用户名或密码错误');
   * }
   * ```
   */
  async findByLoginName(loginName: string): Promise<User | null> {
    // 判断输入是否包含 @ 符号来区分邮箱和用户名
    const isEmail = loginName.includes('@');

    return isEmail
      ? this.findByEmail(loginName)
      : this.findByUsername(loginName);
  }

  /**
   * 更新用户的最后登录时间
   *
   * 每次成功登录后调用，用于：
   *   - 统计用户活跃度
   *   - 判断僵尸账号
   *   - 安全审计（异常登录检测）
   *
   * @param id 用户主键 ID
   * @returns 是否更新成功
   */
  async updateLastLogin(id: number): Promise<boolean> {
    const affectedRows = await this.knex('users')
      .where('id', id)
      .update({ last_login_at: new Date() });

    return affectedRows > 0;
  }

  /**
   * 检查用户名是否已被占用
   *
   * 用于注册时的唯一性校验，避免重复注册
   * 排除当前用户自身（编辑个人信息时可保留原用户名）
   *
   * @param username 待检查的用户名
   * @param excludeId 排除的用户 ID（编辑时使用）
   * @returns 是否已被占用（true = 已存在）
   */
  async isUsernameTaken(
    username: string,
    excludeId?: number,
  ): Promise<boolean> {
    let query = this.knex('users').where('username', username);

    // 编辑场景：排除当前用户自身
    if (excludeId) {
      query = query.andWhereNot('id', excludeId);
    }

    // 只需知道是否存在，不需要具体数据
    const result = await query.first().count('* as count');
    return Number(result?.count || 0) > 0;
  }

  /**
   * 检查邮箱是否已被占用
   *
   * 与 isUsernameTaken 类似，用于邮箱的唯一性校验
   *
   * @param email 待检查的邮箱地址
   * @param excludeId 排除的用户 ID
   * @returns 是否已被占用
   */
  async isEmailTaken(
    email: string,
    excludeId?: number,
  ): Promise<boolean> {
    let query = this.knex('users').where('email', email.toLowerCase());

    if (excludeId) {
      query = query.andWhereNot('id', excludeId);
    }

    const result = await query.first().count('* as count');
    return Number(result?.count || 0) > 0;
  }
}
