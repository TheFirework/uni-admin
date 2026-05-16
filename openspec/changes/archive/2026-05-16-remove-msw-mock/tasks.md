## 1. 准备工作与基线验证

- [x] 1.1 确认 Git 工作区干净或仅有无关更改
  - **命令**: `git status`
  - **预期**: clean 状态或仅有与此变更无关的修改
  - **验证标准**: 无未提交的 MSW 相关文件

- [x] 1.2 全局搜索建立 MSW 引用基线
  - **命令**:
    ```bash
    grep -rn "mock\|msw\|enableMock\|VITE_ENABLE_MOCK" \
      --include="*.ts" --include="*.vue" --include="*.json" --include="*.env*" \
      apps/web/
    ```
  - **预期结果** (共 ~10 处):
    - `apps/web/src/main.ts` (1处: 条件启动逻辑)
    - `apps/web/src/utils/env.config.ts` (2处: 接口定义 + 校验逻辑)
    - `apps/web/src/mocks/browser.ts` (1处: import)
    - `apps/web/src/mocks/handlers.ts` (1处: import)
    - `apps/web/package.json` (2处: dependencies + msv config)
    - `apps/web/.env.development` (1处: VITE_ENABLE_MOCK=true)
    - `apps/web/public/mockServiceWorker.js` (1处: 文件内容)
  - **验证标准**: 搜索结果与预期一致，无遗漏

- [x] 1.3 确认 NestJS Server 正常运行
  - **命令**: `curl http://localhost:3000/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'`
  - **预期**: 返回 HTTP 401 或业务错误响应（非连接失败）
  - **验证标准**: Server 可达且 API 路由正常工作
  - **备选**: 如 Server 未运行，先启动 `pnpm dev:server`

- [x] 1.4 运行现有测试套件确保基线绿色
  - **命令**: `pnpm test` (或 `pnpm test:watch`)
  - **预期**: 所有测试通过
  - **验证标准**: 零失败用例

---

## 2. 应用层引用清理（Phase 1）

- [x] 2.1 修改 `apps/web/src/main.ts` - 移除 MSW 启动逻辑
  - **操作**: 删除第 16-20 行的条件导入代码块
  ```diff
   - if (env.enableMock) {
   -   import('./mocks/browser.js').then(({ worker }) => {
   -     worker.start({ onUnhandledRequest: 'bypass' });
   -   }).catch(() => { });
   - }
  ```
  - **验证标准**:
    - 文件中不再包含 `mocks`、`worker`、`enableMock` 关键词
    - TypeScript 编译无错误 (`pnpm --filter @uni-admin/web typecheck`)

- [x] 2.2 修改 `apps/web/src/utils/env.config.ts` - 删除 enableMock 字段
  - **操作 A**: 从 `WebEnvConfig` 接口中删除 `enableMock: boolean;`
  - **操作 B**: 从 `validateEnv()` 函数中删除:
    ```diff
    - const enableMock = isProduction ? false : parseBoolean(meta.VITE_ENABLE_MOCK);
    ```
  - **操作 C**: 从返回的冻结对象中删除:
    ```diff
     return Object.freeze({
       // ... 其他字段
    -  enableMock,
       // ...
     });
    ```
  - **验证标准**:
    - 接口中无 `enableMock` 属性
    - 函数体中无 `VITE_ENABLE_MOCK` 引用
    - TypeScript 编译无错误

- [x] 2.3 清理环境变量文件
  - **操作 A**: 编辑 `apps/web/.env.development`
    - 删除行: `VITE_ENABLE_MOCK=true`
  - **操作 B**: 检查 `apps/web/.env.test`
    - 如存在 `VITE_ENABLE_MOCK=*` 行，同样删除
    - 如不存在，跳过此步
  - **操作 C**: 检查 `apps/web/.env.production` (仅读取，不应包含此变量)
  - **验证标准**:
    - `.env.development` 和 `.env.test` 中无 `VITE_ENABLE_MOCK`
    - `.env.production` 中确实不包含此变量（安全确认）

---

## 3. 文件系统物理删除（Phase 2）

- [x] 3.1 删除 mocks 目录
  - **命令**: `rm -rf apps/web/src/mocks/`
  - **影响文件**:
    - `apps/web/src/mocks/browser.ts` (4行)
    - `apps/web/src/mocks/handlers.ts` (4行)
  - **验证标准**:
    - `ls apps/web/src/mocks/` 报错 "No such file or directory"
    - Git status 显示这两个文件为 "deleted"

- [x] 3.2 删除 Service Worker 脚本
  - **命令**: `rm apps/web/public/mockServiceWorker.js`
  - **影响文件**:
    - `apps/web/public/mockServiceWorker.js` (6.8KB, MSW 生成的 SW 代码)
  - **验证标准**:
    - `ls apps/web/public/mockServiceWorker.js` 报错 "No such file or directory"
    - Git status 显示此文件为 "deleted"

- [x] 3.3 验证应用仍可正常启动
  - **命令**: `pnpm dev:web` (在另一终端运行 10 秒后 Ctrl+C 停止)
  - **观察控制台输出**:
    - ✅ 无 "Cannot find module './mocks/browser'" 错误
    - ✅ 无 MSW 相关日志 (如 "[MSW] Mocking enabled.")
    - ✅ Vite 开发服务器成功启动 (通常显示 "Local: http://localhost:5173/")
  - **验证标准**: 应用可正常启动，零报错

---

## 4. 依赖声明清理（Phase 3）

- [x] 4.1 修改 `apps/web/package.json` - 移除 msw 依赖
  - **操作 A**: 从 `devDependencies` 对象中删除:
    ```json
    - "msw": "^2.14.6",
    ```
  - **操作 B**: 从根级别配置对象中删除整个 `msw` 配置块:
    ```json
    - "msw": {
    -   "workerDirectory": [
    -     "public"
    -   ]
    - }
    ```
  - **验证标准**:
    - `package.json` 中不包含字符串 `"msw"`
    - JSON 格式有效（无语法错误）

- [x] 4.2 重装依赖并确认 msw 已移除
  - **命令**: `pnpm install`
  - **观察**:
    - Lockfile (`pnpm-lock.yaml`) 更新（msw 及其依赖树被移除）
    - 安装日志中显示 removed packages 包含 `msw`
    - 安装时间可能微幅缩短 (~2-5s)
  - **验证命令**:
    ```bash
    # 方法1: 检查 node_modules
    ls apps/web/node_modules/msw  # 应报错 "No such file or directory"

    # 方法2: 使用 pnpm why (如安装了 pnpm-why 插件)
    pnpm why msw  # 应显示 "No reasons found" 或类似信息

    # 方法3: 直接检查 lockfile
    grep -c "msw@" pnpm-lock.yaml  # 应返回 0
    ```

---

## 5. 综合验证与回归测试（Phase 4）

- [x] 5.1 TypeScript 类型检查
  - **命令**: `pnpm typecheck` (项目根目录)
  - **预期**: 零错误，退出码 0
  - **重点关注**:
    - `env.config.ts` 的接口变更是否导致其他文件编译错误
    - `main.ts` 的 import 删除是否影响模块解析
  - **验证标准**: 输出中无 "error TS" 字样

- [x] 5.2 ESLint 代码质量检查
  - **命令**: `pnpm lint` (项目根目录)
  - **预期**: 零错误/警告，退出码 0
  - **验证标准**: 输出中无 "error" 或 "warning" (允许忽略 .gitignore 相关提示)

- [x] 5.3 Web 应用功能冒烟测试
  - **前置条件**: 确保 NestJS Server 在运行 (`pnpm dev:server`)
  - **步骤**:
    1. 启动 Web 应用: `pnpm dev:web`
    2. 打开浏览器访问: http://localhost:5173
    3. 打开 DevTools → Network 面板
    4. 执行以下操作并观察:
  - **测试场景清单**:

    | # | 操作 | 预期结果 | 验证点 |
    |---|------|----------|--------|
    | T1 | 页面加载 | 登录页正常渲染 | 无白屏/控制台错误 |
    | T2 | 输入用户名密码点击登录 | 发送 POST `/api/v1/auth/login` | Network 显示请求直达 localhost:3000 |
    | T3 | 登录失败提示 | 显示错误消息（Element Plus Message） | 错误处理中间件正常 |
    | T4 | 查看 Network 面板详情 | 无 Service Worker 拦截层 | 请求列表中 initiator 非 "serviceWorker" |

  - **验证标准**: 所有测试场景通过，API 调用路径清晰可见（无 SW 层干扰）

- [x] 5.4 全局残留搜索（最终确认）
  - **命令**:
    ```bash
    grep -r "msw\|mockServiceWorker\|enableMock" \
      --include="*.ts" --include="*.vue" --include="*.json" \
      --include="*.md" --include="*.env*" \
      apps/web/ \
      --exclude-dir=node_modules \
      --exclude-dir=dist
    ```
  - **预期**: 零匹配（或仅匹配到 .gitignore 中的规则）
  - **例外情况** (可接受):
    - `.gitignore` 中的排除规则 (如果有)
    - `CHANGELOG.md` 或 commit message 中的历史记录
  - **验证标准**: 源代码中完全清除 MSW 引用

---

## 6. 文档更新与 Git 提交（Phase 5）

- [x] 6.1 检查并更新 README (如需要)
  - **操作**: 搜索项目中所有 README 文件
    ```bash
    find . -name "README.md" -not -path "./node_modules/*"
    ```
  - **检查内容**: 是否提及 MSW、Mock 开发模式、`VITE_ENABLE_MOCK` 等
  - **操作**: 如发现相关描述，进行更新或删除
  - **验证标准**: README 中无过时的 MSW 相关说明

- [x] 6.2 检查 CONTRIBUTING.md 或开发文档
  - **操作**: 类似 6.1，检查是否有 "Mock 开发指南" 章节
  - **验证标准**: 开发文档与当前架构一致

- [x] 6.3 生成 Git 提交
  - **预检**:
    ```bash
    git status          # 确认变更范围正确
    git diff --stat     # 查看变更统计
    git log --oneline -5  # 参考最近的 commit style
    ```
  - **提交信息** (遵循 Conventional Commits):
    ```
    refactor(web): remove unused MSW mock infrastructure

    - Delete empty MSW handlers and browser setup (src/mocks/)
    - Remove mockServiceWorker.js from public/
    - Clean up enableMock env var and conditional startup logic
    - Remove msw dependency from package.json

    Rationale: Server is stable and all requests were bypassing
    MSW anyway. This simplifies the architecture and improves
    dev experience (faster startup, cleaner Network panel).

    Ref: openspec/changes/remove-msw-mock
    ```
  - **操作**:
    ```bash
    git add apps/web/src/main.ts
    git add apps/web/src/utils/env.config.ts
    git add apps/web/.env.development
    git add apps/web/.env.test  # 如果有变更
    git add apps/web/src/mocks/
    git add apps/web/public/mockServiceWorker.js
    git add apps/web/package.json
    git add pnpm-lock.yaml
    # 如有 README/文档变更也一并添加
    git commit -m "<上述提交信息>"
    ```
  - **验证标准**:
    - Commit hash 生成成功
    - `git status` 显示 clean working tree
    - `git show --stat` 确认变更文件列表正确

- [x] 6.4 (可选) 创建 Git Tag 用于快速回滚
  - **命令**: `git tag -a "pre-msw-removal-$(date +%Y%m%d)" -m "Snapshot before MSW removal for easy rollback"`
  - **用途**: 如需紧急回滚，可使用 `git checkout <tag>` 快速恢复
  - **验证标准**: `git tag -l "pre-msw-*"` 显示新创建的 tag

---

## 7. 后置清理与团队同步（可选但推荐）

- [x] 7.1 清理 OpenSpec Change 状态 (实施完成后)
  - **操作**: 当所有任务完成后，运行:
    ```bash
    openspec archive change "remove-msw-mock"
    ```
  - **目的**: 将此 change 标记为已完成，移至 `openspec/changes/archive/`
  - **验证标准**: `openspec list --json` 不再显示此 active change

- [x] 7.2 通知团队成员 (如适用)
  - **渠道**: Slack / 钉钉 / 邮件 / 站内信
  - **模板**: 见 design.md "Open Questions > Q2" 部分
  - **内容包括**:
    - 变更摘要（做了什么）
    - 影响说明（对谁有影响，影响程度）
    - 回滚方案（如果出问题怎么办）
    - 相关文档链接（proposal/design/tasks）
  - **验证标准**: 团队成员已知晓此次变更

- [x] 7.3 更新项目文档或 Wiki (如存在)
  - **检查位置**:
    - GitHub/GitLab Wiki 页面
    - Confluence/Notion 知识库
    - 内部技术分享文档
  - **操作**: 将 "开发环境搭建" 章节中的 MSW 相关步骤删除
  - **验证标准**: 外部文档与代码库状态一致

---

## 任务依赖关系图

```
Phase 1 (应用层清理)
  ├── 1.1 ──────────────┐
  ├── 1.2 ──────────────┤──▶ 2.1 ──▶ 2.2 ──▶ 2.3
  ├── 1.3 ──────────────┤         │
  └── 1.4 ──────────────┘         │
                                    ▼
Phase 2 (文件系统清理)        3.1 ──▶ 3.2 ──▶ 3.3
                                    │
                                    ▼
Phase 3 (依赖清理)           4.1 ──▶ 4.2
                                    │
                                    ▼
Phase 4 (综合验证)        5.1 ─┤
                          5.2 ─┤
                          5.3 ─┤──▶ 全部通过
                          5.4 ─┘
                                    │
                                    ▼
Phase 5 (提交)            6.1 ──┤
                          6.2 ──┤
                          6.3 ◀─┘
                          6.4 (可选)

Phase 6 (后置, 可选)      7.x (并行执行)
```

**关键路径**: 1.1~1.4 → 2.1~2.3 → 3.1~3.3 → 4.1~4.2 → 5.1~5.4 → 6.3

**预计总耗时**: 20-30 分钟（含验证时间）

---

## 验证检查清单总览

完成所有任务后，应满足以下 **DONE 标准**：

### 功能性 ✅
- [x] Web 应用正常启动，控制台零错误
- [x] 所有 API 调用正常工作（登录、CRUD 等）
- [x] 认证流程不受影响（Token 管理、401 处理）

### 代码质量 ✅
- [x] TypeScript 编译零错误 (`pnpm typecheck`)
- [x] ESLint 检查零警告 (`pnpm lint`)
- [x] 无遗留的 MSW 引用（全局 grep 确认）

### 依赖管理 ✅
- [x] `package.json` 中无 msw 声明
- [x] `node_modules` 中无 msw 目录
- [x] `pnpm-lock.yaml` 中无 msw 条目
- [x] `pnpm install` 成功执行

### 文件系统 ✅
- [x] `src/mocks/` 目录已删除
- [x] `public/mockServiceWorker.js` 已删除
- [x] `.env.*` 文件中无 `VITE_ENABLE_MOCK`

### 体验提升 ✅
- [x] 启动速度提升（体感 +50~100ms）
- [x] Network 面板更清晰（无 SW 层）
- [x] 项目结构更简洁（减少 ~40 行代码 + 3 个文件）

---

## 常见问题排查 (Troubleshooting)

### Q: TypeScript 报错 "Cannot find module './mocks/browser'"
**原因**: Phase 1 未完成就进入 Phase 2（删除了文件但 main.ts 还在引用）
**解决**: 先完成 2.1 任务（修改 main.ts），再删除文件

### Q: pnpm install 后 msw 仍在 node_modules
**原因**: 可能是 lockfile 缓存或 pnpm store 问题
**解决**:
```bash
rm -rf node_modules/.pnpm
pnpm install --force
```

### Q: 浏览器控制台仍有 MSW 日志
**原因**: Service Worker 可能被浏览器缓存
**解决**:
1. 打开 DevTools → Application → Service Workers
2. 点击 "Unregister" 注销旧 SW
3. 强制刷新页面 (Cmd+Shift+R)

### Q: Git 提交时提示文件未被跟踪
**原因**: `.gitignore` 可能忽略了某些文件
**检查**: `git check-ignore -v apps/web/public/mockServiceWorker.js`
**解决**: 如被忽略，临时修改 `.gitignore` 或使用 `-f` 强制添加

---

**下一步**: 所有任务完成后，运行 `/opsx:apply` 开始自动执行，或手动按顺序完成任务。
