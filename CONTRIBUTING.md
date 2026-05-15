# Contributing to uni-admin

感谢你对 uni-admin 的贡献！本文档将指导你如何设置开发环境、遵循代码规范以及提交贡献。

## 📋 目录

- [开发环境搭建](#开发环境搭建)
- [代码规范](#代码规范)
- [开发流程](#开发流程)
- [Pull Request 模板](#pull-request-模板)
- [测试要求](#测试要求)

---

## 🛠️ 开发环境搭建

### 前置要求

- **Node.js**: >= 18.x (推荐使用 LTS 版本)
- **pnpm**: >= 8.x (推荐使用 pnpm 作为包管理器)
- **Docker**: >= 20.x (用于本地 MySQL 和 Redis 服务)
- **Git**: 最新版本
- **IDE**: 推荐 VSCode（已配置好 TypeScript 和 Vue 插件）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-org/uni-admin.git
   cd uni-admin
   ```

2. **安装 pnpm**（如果尚未安装）
   ```bash
   npm install -g pnpm
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **启动依赖服务**（MySQL + Redis）
   ```bash
   docker-compose up -d mysql redis
   ```
   
   等待服务启动完成（约 10-15 秒），验证连接：
   ```bash
   # 验证 MySQL
   mysql -h localhost -u admin -padmin_password -e "SELECT 1"
   
   # 验证 Redis
   redis-cli ping
   ```

5. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入你的本地配置
   ```

6. **启动开发服务器**
   ```bash
   # 启动所有应用（前后端并行）
   pnpm dev
   
   # 或者单独启动：
   pnpm dev:server  # 仅后端 (http://localhost:3000)
   pnpm dev:web     # 仅前端 (http://localhost:5173)
   ```

### 推荐的 VSCode 插件

- **Vue Language Features (Volar)**: Vue3 语言支持
- **TypeScript Vue Plugin (Volar)**: Vue SFC 中 TS 支持
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Prisma**: 数据库工具

---

## 📝 代码规范

### 命名规范

项目采用严格的命名规范，详见 [naming-conventions spec](./openspec/specs/naming-conventions/spec.md)。

| 类型 | 规范 | 示例 |
|------|------|------|
| Package Name | `@uni-admin/<kebab-case>` | `@uni-admin/shared-types` |
| Directory | 小写复数或 kebab-case | `components/`, `shared-utils/` |
| File (.vue) | PascalCase | `DataTable.vue` |
| File (.ts 工具) | kebab-case | `date.utils.ts` |
| File (.ts 类型) | `<name>.types.ts` | `api.types.ts` |
| Class/Interface | PascalCase | `UserService`, `IUser` |
| Function/Variable | camelCase | `getUserById`, `isLoading` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

### Git Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例**:
```bash
feat(auth): add JWT token refresh mechanism

- Implement automatic token refresh before expiry
- Add refresh token endpoint to auth module
- Update axios interceptor to handle 401 responses

Closes: #123
```

### 代码风格

项目使用 **ESLint** 和 **Prettier** 自动强制代码风格：

```bash
# 检查代码质量
pnpm lint

# 自动修复可修复的问题
pnpm lint:fix

# 格式化代码
pnpm format
```

**建议在 VSCode 中启用**:
- **Format On Save**: 保存时自动格式化
- **ESLint**: 实时显示代码问题

---

## 🔄 开发流程

### 分支策略

```
main (主分支，受保护)
  └── feature/<feature-name> (功能分支)
      └── fix/<bug-description> (修复分支)
```

### 开发步骤

1. **从 main 创建功能分支**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/add-user-export
   ```

2. **开发和测试**
   - 在本地进行开发和单元测试
   - 确保通过 `pnpm lint`、`pnpm format`、`pnpm typecheck`
   - 如有新增功能，编写相应的单元测试

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat(user): add user data export to CSV"
   ```

4. **推送并创建 PR**
   ```bash
   git push origin feature/add-user-export
   ```
   然后在 GitHub/GitLab 上创建 Pull Request

5. **Code Review**
   - 至少需要 1 位维护者审核通过
   - 解决所有提出的修改意见
   - 确保 CI 检查全部通过

6. **合并到 main**
   - 使用 Squash and Merge 保持历史整洁
   - 删除已合并的功能分支

---

## 🔀 Pull Request 模板

创建 PR 时请包含以下信息：

```markdown
## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他：_____

## 变更描述
简要描述本次变更的内容和目的。

## 相关 Issue
Closes: #<issue-number>

## 变更详情
<!-- 列出主要的文件变更 -->

### 新增文件
- `path/to/new-file.ts`: 文件说明

### 修改文件
- `path/to/modified.ts`: 修改说明

## 测试清单
<!-- 确保以下项都已验证 -->
- [ ] 代码通过 `pnpm lint` 检查
- [ ] 代码通过 `pnpm format` 格式化
- [ ] 代码通过 `pnpm typecheck` 类型检查
- [ ] 新增功能已编写单元测试
- [ ] 已有测试通过 (`pnpm test`)
- [ ] 手动测试通过（如适用）

## 截图/演示
<!-- UI 变更请提供截图或 GIF -->
```

---

## ✅ 测试要求

### 单元测试

- 新增的工具函数和业务逻辑**必须**包含单元测试
- 使用 **Vitest** 作为测试框架
- 测试文件与源码同目录或 `__tests__/` 子目录
- 测试文件命名：`<filename>.test.ts` 或 `<filename>.spec.ts`

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @uni-admin/shared-utils test

# 监听模式
pnpm test:watch
```

### 测试覆盖率目标

| 包类型 | 覆盖率目标 |
|--------|-----------|
| shared-types | N/A（纯类型定义）|
| shared-utils | ≥ 80% |
| ui-components | ≥ 70% |
| apps/server | ≥ 60% |
| apps/web | ≥ 50% |

---

## ❓ 问题反馈

### Bug 报告模板

**标题**: `<简短描述问题>`

**内容**:
```markdown
## 环境信息
- Node.js 版本:
- pnpm 版本:
- 操作系统:
- 浏览器版本:

## 问题描述
清晰描述遇到的问题。

## 复现步骤
1. 执行 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 发现错误

## 期望行为
描述应该发生什么。

## 实际行为
描述实际发生了什么。

## 截图
如有界面问题，请附上截图。
```

---

## 📚 更多资源

- [架构文档](./ARCHITECTURE.md)（可选）
- [命名规范详细说明](./openspec/specs/naming-conventions/spec.md)
- [Monorepo 结构说明](./openspec/specs/monorepo-structure/spec.md)
- [API 文档]（开发中）

---

感谢你为 uni-admin 做出贡献！🎉