# Naming Conventions Specification

定义 uni-admin 项目完整的命名规范体系，包括 Package Name、Directory、File、Code Identifiers 四个层级的命名规则，确保项目一致性和可读性。

---

## Purpose

本规格建立统一的命名规范体系，确保项目中包名、目录名、文件名和代码标识符具有一致性和可读性，降低团队协作成本，提高代码可维护性。

---

## Requirements

### Requirement: Package Name 命名规范

所有 monorepo 内的包名 MUST 遵循以下命名约定：

**基本格式**: `@uni-admin/<kebab-case-name>`

**命名规则**:
1. **必须带 scope**: 所有包名 MUST 以 `@uni-admin/` 开头
2. **使用 kebab-case**: scope 后面的名称 MUST 使用小写字母 + 连字符（kebab-case）
3. **名称有意义**: 包名 SHOULD 能够清晰表达包的职责和用途
4. **避免模糊名称**: 禁止使用过于简短或含义不清的名称（如 `@uni-admin/stuff`）

**按类型分类的命名模式**:

| 包类型 | 命名模式 | 示例 |
|--------|----------|------|
| 应用 (apps/) | `@uni-admin/<app-name>` | `@uni-admin/server`, `@uni-admin/web` |
| 共享类型 | `@uni-admin/shared-types` | 固定名称 |
| 共享工具 | `@uni-admin/shared-utils` | 固定名称 |
| UI 组件库 | `@uni-admin/ui-<component>` | `@uni-admin/ui-components`, `@uni-admin/ui-icons` |
| 工具配置 | `@uni-admin/<tool>-config` | `@uni-admin/eslint-config`, `@uni-admin/tsconfig` |

**禁止事项**:
- ❌ 不使用 camelCase: `@uni-admin/sharedTypes`
- ❌ 不使用 PascalCase: `@uni-admin/SharedTypes`
- ❌ 不使用下划线: `@uni-admin/shared_types`
- ❌ 不省略 scope: `shared-types`

#### Scenario: 应用包命名正确性
- **WHEN** 创建新的应用包（如后台管理应用）
- **THEN** 包名 MUST 符合 `@uni-admin/<app-name>` 格式
- **例如**: `@uni-admin/admin-panel` 是合法的
- **AND** `@uni-admin/AdminPanel` 或 `@uni-admin/admin_panel` 是非法的

#### Scenario: 共享库包命名一致性
- **WHEN** 查看所有 packages/ 下的 package.json 的 name 字段
- **THEN** 类型定义库 MUST 命名为 `@uni-admin/shared-types`
- **AND** 工具函数库 MUST 命名为 `@uni-admin/shared-utils`
- **AND** UI 组件库 MUST 以 `@uni-admin/ui-` 为前缀（如 `@uni-admin/ui-components`）

#### Scenario: Scope 统一性检查
- **WHEN** 扫描所有 package.json 文件
- **THEN** 每个内部包的 name 字段 MUST 都以 `@uni-admin/` 开头
- **AND** 不允许出现无 scope 的包名或不同 scope 的包名

---

### Requirement: Directory 目录命名规范

所有目录名 MUST 遵循以下命名约定：

**基本规则**:
1. **使用小写字母**: 目录名 MUST 全部使用小写字母
2. **使用连字符分隔多词**: 多单词目录名 MUST 使用 kebab-case（连字符分隔）
3. **使用复数名词**: 表示集合或容器的目录 SHOULD 使用复数形式（如 `components/`, `modules/`, `utils/`）

**按场景分类的目录命名模式**:

| 场景 | 命名风格 | 示例 |
|------|----------|------|
| 源码根目录 | 小写单/复数名词 | `src/`, `lib/`, `test/` |
| 功能模块 | 小写单数名词 | `auth/`, `user/`, `config/` |
| 组件集合 | 小写复数名词 | `components/`, `views/`, `stores/` |
| 工具函数 | 小写复数名词 | `utils/`, `helpers/`, `hooks/` |
| 多词功能 | kebab-case | `user-management/`, `shared-types/`, `ui-components/` |

**合法示例**:
```
✅ src/
✅ components/
✅ shared-types/
✅ user-management/
✅ auth/
✅ layouts/
✅ composables/
```

**非法示例**:
```
❌ Src/                    # 大写开头
❌ Component/              # 单数形式（表示集合时）
❌ sharedTypes/            # camelCase
❌ UIComponents/           # PascalCase
❌ _private/               # 下划线前缀（除非特殊需求如 Next.js）
❌ MyFolder/               # 混合大小写
```

#### Scenario: apps/server 目录命名验证
- **WHEN** 查看 `apps/server/src/` 下的子目录
- **THEN** SHALL 看到 `common/`, `config/`, `modules/`, `prisma/` 等目录
- **AND** 所有目录名 MUST 全部为小写字母
- **AND** 多单词目录（如果存在）MUST 使用连字符分隔（如 `user-management/`）

#### Scenario: apps/web 目录命名验证
- **WHEN** 查看 `apps/web/src/` 下的子目录
- **THEN** SHALL 看到 `api/`, `views/`, `components/`, `stores/`, `router/`, `composables/`, `layouts/`, `assets/` 等
- **AND** 这些目录名 MUST 使用小写字母
- **AND** 表示集合的目录（如 views, stores, components）SHOULD 使用复数形式

#### Scenario: packages 目录命名验证
- **WHEN** 查看 `packages/` 下的子目录
- **THEN** SHALL 看到 `shared-types/`, `shared-utils/`, `ui-components/`
- **AND** 这些目录名 MUST 使用 kebab-case（因为包含多个有意义的单词）
- **AND** 与对应的 package name 保持一致（去掉 @uni-admin/ 前缀）

---

### Requirement: File 文件命名规范

所有文件名 MUST 根据文件类型遵循相应的命名约定：

**Vue 组件文件 (.vue)**:
- **规则**: MUST 使用 PascalCase（大驼峰命名法）
- **示例**: `DataTable.vue`, `SearchForm.vue`, `UserModal.vue`, `DefaultLayout.vue`
- **理由**: Vue 官方推荐，IDE 自动补全友好

**TypeScript/JavaScript 文件 (.ts/.js)**:

| 文件内容类型 | 命名风格 | 示例 |
|-------------|----------|------|
| 类/组件/接口定义 | PascalCase | `UserService.ts`, `DataTable.ts` |
| 工具函数/配置 | kebab-case | `date-utils.ts`, `vite.config.ts` |
| 类型定义文件 | kebab-case + `.types.ts` 后缀 | `api.types.ts`, `entity.types.ts` |
| 枚举常量文件 | kebab-case + `.enums.ts` 或 camelCase | `user.enums.ts`, `statusCodes.ts` |
| 路由/页面入口 | kebab-case | `public.routes.ts`, `index.ts` |

**测试文件**:
- **单元测试**: 与被测文件同名 + `.spec.ts` 或 `.test.ts` 后缀
  - 示例: `UserService.spec.ts`, `date-utils.test.ts`
- **E2E 测试**: 可使用 `.e2e-spec.ts` 或 `.cy.ts`（Playwright）后缀
  - 示例: `app.e2e-spec.ts`, `login.cy.ts`

**配置文件**:
- **规则**: 通常使用 kebab-case 或工具规定的固定名称
- **示例**: `vite.config.ts`, `nest-cli.json`, `tsconfig.app.json`, `.eslintrc.js`, `.prettierrc`, `docker-compose.yml`

**样式文件 (.scss/.css)**:
- **规则**: kebab-case
- **示例**: `variables.scss`, `mixins.scss`, `global.scss`, `DataTable.module.scss`

**合法示例**:
```
✅ DataTable.vue                    # Vue 组件
✅ UserService.ts                   # 类定义
✅ date-utils.ts                     # 工具函数
✅ api.types.ts                      # 类型定义
✅ user.enums.ts                     # 枚举定义
✅ vite.config.ts                    # 配置文件
✅ UserService.spec.ts               # 单元测试
✅ variables.scss                    # 样式变量
```

**非法示例**:
```
❌ dataTable.vue                    # Vue 组件不应使用 camelCase
❌ userService.ts                    # 类定义不应使用 camelCase
❌ dateUtils.ts                      # 工具函数不应使用 camelCase
❌ Api.Types.ts                      # 不应混合大小写
❌ user_spec.ts                      # 测试文件不应使用下划线
```

#### Scenario: Vue 组件文件命名
- **WHEN** 在 `apps/web/src/components/` 或 `packages/ui-components/src/components/` 下创建新组件
- **THEN** 文件名 MUST 使用 PascalCase
- **例如**: 创建数据表格组件时，文件名 MUST 是 `DataTable.vue` 而非 `dataTable.vue` 或 `data-table.vue`

#### Scenario: TypeScript 工具文件命名
- **WHEN** 在 `packages/shared-utils/src/` 下创建新的工具模块
- **THEN** 文件名 MUST 使用 kebab-case
- **例如**: 创建日期处理工具时，文件名 MUST 是 `date.ts` 或 `date-utils.ts`，而非 `DateUtils.ts` 或 `dateUtils.ts`

#### Scenario: 类型定义文件命名
- **WHEN** 在 `packages/shared-types/src/` 下创建类型定义文件
- **THEN** 文件名 SHOULD 使用 `<purpose>.types.ts` 格式
- **例如**: API 相关类型 MUST 定义在 `api.types.ts` 中
- **AND** 实体相关类型 MUST 定义在 `entity.types.ts` 中

#### Scenario: 测试文件命名对应关系
- **WHEN** 为 `src/utils/date.ts` 编写单元测试
- **THEN** 测试文件名 MUST 是 `date.spec.ts` 或 `date.test.ts`
- **AND** 测试文件 SHOULD 位于与源文件相同的目录或 `__tests__/` 子目录中

---

### Requirement: Code Identifiers 代码标识符命名规范

源代码中的所有标识符（变量、函数、类、常量、枚举等）MUST 遵循以下 TypeScript/JavaScript 标准命名约定：

**类和接口 (Classes & Interfaces)**:
- **规则**: MUST 使用 PascalCase（大驼峰）
- **类前缀（可选但推荐）**: 接口可以使用 `I` 前缀（如 `IUser`），类型别名可以使用 `T` 前缀
- **示例**:
  ```typescript
  class UserService { }
  interface IUserRepository { }
  type ApiResponse<T> = { ... }
  interface DataTableProps { }
  ```

**函数和变量 (Functions & Variables)**:
- **规则**: MUST 使用 camelCase（小驼峰）
- **示例**:
  ```typescript
  function getUserById(id: string): Promise<IUser> { }
  const isLoading = ref(false);
  let currentPage = 1;
  const handleSubmit = async () => { };
  ```

**常量 (Constants)**:
- **规则**: MUST 使用 UPPER_SNAKE_CASE（全大写 + 下划线）
- **适用场景**: 模块级常量、配置值、魔法数字
- **示例**:
  ```typescript
  const MAX_RETRY_COUNT = 3;
  const API_BASE_URL = '/api/v1';
  const DEFAULT_PAGE_SIZE = 20;
  const TOKEN_EXPIRY_TIME = 3600; // 秒
  ```

**枚举 (Enumerations)**:
- **枚举名**: MUST 使用 PascalCase
- **枚举值**: MUST 使用 UPPER_SNAKE_CASE
- **示例**:
  ```typescript
  enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
    GUEST = 'GUEST'
  }

  enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
  }
  ```

**CSS 类名 (Class Names)**:
- **规则**: MUST 使用 kebab-case，推荐 BEM 方法论
- **示例**:
  ```css
  .user-card { }
  .user-card__title { }
  .user-card--active { }
  .btn { }
  .btn--primary { }
  .btn__icon { }
  ```

**CSS/SCSS 变量**:
- **规则**: MUST 使用 kebab-case，建议加前缀避免冲突
- **示例**:
  ```scss
  $color-primary: #409eff;
  $spacing-md: 16px;
  $font-size-base: 14px;
  $breakpoint-sm: 576px;
  ```

**TypeScript 类型导入别名**:
- **规则**: 导入类型时，类型别名 SHOULD 使用 PascalCase 或带 T 前缀
- **示例**:
  ```typescript
  import type { IUser, ApiResponse } from '@uni-admin/shared-types';
  // 或
  import type { User as TUser } from '@uni-admin/shared-types';
  ```

#### Scenario: 类和接口命名验证
- **WHEN** 在代码中定义新的服务类或仓库接口
- **THEN** 类名 MUST 使用 PascalCase（如 `class AuthService {}`）
- **AND** 接口名 MUST 使用 PascalCase（可选 I 前缀，如 `interface IAuthRepository {}`）

#### Scenario: 函数和变量命名验证
- **WHEN** 定义新的业务逻辑函数或组件状态变量
- **THEN** 函数名 MUST 使用 camelCase（如 `function validateUserInput()`）
- **AND** 变量名 MUST 使用 camelCase（如 `const isFormValid = ref(false)`）
- **AND** 禁止使用单字母变量名（除循环计数器 i, j, k 和坐标 x, y 外）

#### Scenario: 常量命名验证
- **WHEN** 定义模块级的配置常量或魔法数字
- **THEN** 常量名 MUST 使用 UPPER_SNAKE_CASE（如 `const MAX_FILE_SIZE = 10 * 1024 * 1024`）
- **AND** 常量名 SHOULD 具有描述性，能够清晰表达其用途

#### Scenario: 枚举命名验证
- **WHEN** 定义新的枚举类型
- **THEN** 枚举名 MUST 使用 PascalCase（如 `enum PermissionType {}`）
- **AND** 所有枚举值 MUST 使用 UPPER_SNAKE_CASE（如 `READ = 'READ'`, `WRITE = 'WRITE'`）

#### Scenario: CSS BEM 命名验证
- **WHEN** 编写 Vue 组件的 scoped style 或全局 CSS
- **THEN** 类名 MUST 使用 kebab-case
- **AND** 推荐使用 BEM 命名规范：Block__Element--Modifier
- **例如**: `.search-form__input--error` 而非 `.searchFormInputError`

---

### Requirement: 命名规范的自动化强制执行

为了确保命名规范的一致性，项目 SHOULD 配置自动化工具来辅助强制执行这些规范：

**ESLint 规则**:
- SHOULD 启用 `@typescript-eslint/naming-convention` 规则
- SHOULD 配置针对变量、函数、类、接口、类型别名、枚举、枚举值的不同命名模式
- SHOULD 在 CI/CD 流水线中执行 ESLint 检查

**Prettier 配置**:
- 虽然 Prettier 主要关注格式化，但它可以确保一致的风格
- SHOULD 与 ESLint 配合使用，避免冲突

**Commitlint（可选）**:
- 可以用于强制 commit message 格式（虽然不是文件命名，但是代码组织的一部分）

**自定义脚本（可选）**:
- 可以编写脚本检查文件名是否符合规范（如检查是否有大写开头的非组件文件）

#### Scenario: ESLint naming-convention 规则配置
- **WHEN** 查看 `.eslintrc.js` 或 ESLint 配置文件
- **THEN** SHOULD 包含 `@typescript-eslint/naming-convention` 规则配置
- **AND** 该规则 SHOULD 强制执行：
  - 类和接口使用 PascalCase
  - 函数和变量使用 camelCase
  - 常量使用 UPPER_SNAKE_CASE
  - 枚举值使用 UPPER_SNAKE_CASE
- **AND** 该规则 SHOULD 对 Vue 组件文件（.vue）中的 `<script>` 部分也生效

#### Scenario: CI/CD 中的命名规范检查
- **WHEN** 开发者提交 Pull Request 或 Merge Request
- **THEN** CI/CD 流水线 SHOULD 运行 `pnpm lint` 命令
- **AND** 如果存在违反命名规范的代码，构建 SHOULD 失败并给出明确的错误信息
- **AND** 错误信息 SHOULD 指出具体的文件、行号和违规的标识符名称

#### Scenario: IDE 集成支持
- **WHEN** 开发者在 VSCode 或其他支持的 IDE 中编写代码
- **THEN** ESLint 插件 SHOULD 实时提示命名规范错误
- **AND** 开发者 SHOULD 能够看到波浪线下划线和错误提示
- **AND** ideally 提供自动修复功能（auto-fix）对于可以自动修正的命名问题
