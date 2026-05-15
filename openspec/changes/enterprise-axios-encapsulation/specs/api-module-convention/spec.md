## ADDED Requirements

### Requirement: 按业务模块拆分 API 文件
系统 MUST 要求所有接口调用按业务模块拆分为独立的 API 文件，禁止业务代码直接调用 axios 或 request 包内部 API。

#### Scenario: 用户模块 API 文件
- **WHEN** 创建 `apps/web/src/api/modules/user.api.ts`
- **THEN** 导出用户相关的所有接口函数（getUserList / getUserDetail / createUser / updateUser / deleteUser）
- **AND** 每个函数定义入参类型和返回类型

#### Scenario: 认证模块 API 文件
- **WHEN** 创建 `apps/web/src/api/modules/auth.api.ts`
- **THEN** 导出登录、登出、刷新 Token 等认证相关接口

---

### Requirement: 强类型接口定义
系统 MUST 要求每个接口函数定义完整的 TypeScript 类型签名，包括请求参数类型和返回数据类型。

#### Scenario: 完整类型定义示例
- **WHEN** 定义 `export function getUserList(params: QueryUserParams): Promise<User[]>`
- **THEN** QueryUserParams 继承 PaginationParams 并扩展业务字段
- **AND** 返回类型明确为 User[] 而非 unknown

#### Scenario: 复杂请求体类型
- **WHEN** 定义 POST 接口 `export function createUser(data: CreateUserDTO): Promise<User>`
- **THEN** CreateUserDTO 使用 Zod schema 生成类型或手动定义 interface

---

### Requirement: 统一导出
系统 MUST 通过统一的 barrel 文件（index.ts）导出所有 API 模块，便于全局管理和接口替换。

#### Scenario: 统一入口导出
- **WHEN** 创建 `apps/web/src/api/modules/index.ts`
- **THEN** export * from './user.api' 等导出所有子模块
- **AND** 业务组件只需 `import { getUserList } from '@/api/modules'`

#### Scenario: 接口版本迭代
- **WHEN** 需要替换某个底层接口地址
- **THEN** 只需修改对应的 api 模块文件，所有引用自动更新

---

### Requirement: 禁止绕过封装
系统 MUST 通过代码规范约束，确保所有接口请求必须通过封装后的实例或 composable 发起，禁止直接使用原生 axios。

#### Scenario: ESLint 规则约束
- **WHEN** 代码中出现 `import axios from 'axios'` 或 `require('axios')`
- **THEN** ESLint 报错提示「请使用 @uni-admin/request 封装」

#### Scenario: 旧 API 废弃警告
- **WHEN** 代码中 import 旧的 `@/api` 模块
- **THEN** 控制台输出 deprecated 警告
- **AND** IDE 显示删除线提示
