import { z } from 'zod';

// ==================== 用户角色枚举 ====================
// 定义系统中支持的用户角色
export const UserRoleEnum = z.enum(['admin', 'user', 'guest'], {
  errorMap: () => ({ message: '用户角色必须是 admin、user 或 guest' }),
});

// 用户角色类型
export type UserRole = z.infer<typeof UserRoleEnum>;

// ==================== 创建用户 Schema ====================
// 用于注册或管理员创建用户的场景
export const CreateUserSchema = z.object({
  // 用户名：3-20个字符，仅允许字母、数字、下划线
  username: z
    .string()
    .min(1, '用户名不能为空')
    .min(3, '用户名至少需要3个字符')
    .max(20, '用户名最多20个字符')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      '用户名只能包含字母、数字和下划线'
    ),

  // 邮箱地址（自动转小写存储）
  email: z
    .string()
    .min(1, '邮箱不能为空')
    .email('邮箱格式不正确')
    .transform((val) => val.toLowerCase()),

  // 密码：至少8位，必须包含字母和数字，可包含特殊字符
  password: z
    .string()
    .min(1, '密码不能为空')
    .min(8, '密码至少需要8个字符')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/,
      '密码必须包含至少一个字母和一个数字'
    ),

  // 显示名称：可选，2-50个字符
  displayName: z
    .string()
    .min(2, '显示名称至少2个字符')
    .max(50, '显示名称最多50个字符')
    .optional(),

  // 头像URL：可选，必须是有效的URL
  avatar: z
    .string()
    .url('头像必须是有效的URL地址')
    .optional()
    .or(z.literal('')),

  // 用户角色：默认为普通用户
  role: UserRoleEnum.default('user'),
});

// 创建用户输入类型
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// ==================== 更新用户 Schema ====================
// 用于更新用户信息的场景（排除密码字段）
export const UpdateUserSchema = CreateUserSchema.partial().omit({
  password: true,
}).refine(
  // 至少需要提供一个字段进行更新
  (data) => Object.keys(data).length > 0,
  {
    message: '至少需要提供一个要更新的字段',
  }
);

// 更新用户输入类型
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ==================== 修改密码 Schema ====================
// 用于用户自行修改密码的场景
export const ChangePasswordSchema = z.object({
  // 原密码验证
  oldPassword: z
    .string()
    .min(1, '原密码不能为空'),

  // 新密码验证规则与创建时一致
  newPassword: z
    .string()
    .min(1, '新密码不能为空')
    .min(8, '新密码至少需要8个字符')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/,
      '新密码必须包含至少一个字母和一个数字'
    ),
}).refine(
  // 确保新旧密码不同
  (data) => data.oldPassword !== data.newPassword,
  {
    message: '新密码不能与原密码相同',
    path: ['newPassword'],
  }
);

// 修改密码输入类型
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ==================== 重置密码 Schema ====================
// 管理员重置其他用户密码的场景
export const ResetPasswordSchema = z.object({
  // 新密码
  password: z
    .string()
    .min(1, '密码不能为空')
    .min(8, '密码至少需要8个字符')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/,
      '密码必须包含至少一个字母和一个数字'
    ),

  // 确认密码（必须与新密码一致）
  confirmPassword: z.string().min(1, '确认密码不能为空'),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  }
);

// 重置密码输入类型
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ==================== 用户查询参数 Schema ====================
// 用于用户列表的筛选和查询
export const UserQuerySchema = z.object({
  // 按角色筛选
  role: UserRoleEnum.optional(),

  // 按关键字搜索（匹配用户名、邮箱、显示名称）
  keyword: z.string().optional(),

  // 按状态筛选
  status: z.enum(['active', 'inactive', 'banned']).optional(),

  // 按创建时间范围筛选
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// 用户查询参数类型
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
