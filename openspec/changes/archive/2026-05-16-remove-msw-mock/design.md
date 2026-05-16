## Context

### 项目现状

uni-admin 是一个基于 pnpm Monorepo 的企业级管理后台项目，采用前后端分离架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    UNI-ADMIN 架构全景                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  apps/web (Vue3 + Vite)          apps/server (NestJS)       │
│  ┌─────────────────────┐         ┌─────────────────────┐    │
│  │ HttpClient (企业级)  │ ────▶   │ REST API (/api/v1)  │    │
│  │ • Token 管理        │  Proxy  │ • JWT 认证          │    │
│  │ • Loading 状态      │ :3000   │ • Prisma ORM        │    │
│  │ • 错误处理          │         │ • Redis 缓存        │    │
│  │ • 请求取消          │         │                     │    │
│  └─────────────────────┘         └─────────────────────┘    │
│         ▲                                   ▲               │
│         │                                   │               │
│    ❌ MSW (待移除)                    ✅ 运行中              │
│    • 空转的 Worker                   • terminal 2 活跃     │
│    • 无 handlers                     • Swagger 可用        │
│    • 增加复杂度                       • CORS 已配置         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**关键事实**：
1. **Server 已就绪**：NestJS 服务在 `localhost:3000` 正常运行（从 terminal 2 确认）
2. **代理已配置**：Vite 的 `server.proxy` 将 `/api` 请求转发到 Server
3. **MSW 空转**：`handlers.ts` 中 handlers 数组为空，所有请求 bypass 到真实服务器
4. **请求封装完成**：@uni-admin/request 包已实现完整的中间件架构（Token、Loading、Cancel、Error）

### 问题本质

MSW 处于"已集成但未使用"的状态，类似于引入了数据库连接池但从未执行查询。这种技术债务会：
- 增加新成员的认知负担（"为什么有 mocks 目录但什么都没有？"）
- 在调试时产生干扰（Service Worker 层在 Network 面板中可见）
- 浪费构建和安装时间（msw 包 ~40KB gzipped）
- 增加维护成本（未来升级时需考虑兼容性）

## Goals / Non-Goals

### Goals ✅

1. **完全移除 MSW 相关代码和依赖**
   - 删除所有 mock 文件、配置、环境变量
   - 从 package.json 中移除 msw 依赖
   - 清理应用启动逻辑中的条件分支

2. **零功能回归**
   - 所有 API 调用路径保持不变
   - 认证流程不受影响
   - 开发体验提升（更快的启动、更清晰的调试）

3. **代码库整洁性**
   - 移除所有 `mock`、`msw` 关键词引用
   - 更新 env.config.ts 接口定义
   - 确保 TypeScript 编译无错误

4. **文档同步**
   - 清理可能过时的注释或文档提及
   - 更新 README（如存在相关说明）

### Non-Goals ❌

- **不替换为其他 Mock 方案**（如 json-server、MirageJS）
  - 理由：Server 已稳定运行，无需 Mock 层
  - 如未来需要，可重新评估（见回滚方案）

- **不重构现有 API 调用层**
  - @/api/index.ts 中的废弃封装保留（属于另一个 change）
  - @/lib/request 的 HttpClient 架构不变

- **不修改 Vite Proxy 配置**
  - 当前的 `/api → localhost:3000` 配置已满足需求
  - 除非未来有特殊需求（如多环境切换）

- **不影响测试基础设施**
  - Vitest 单元测试不依赖 MSW（使用 jest.mock 或手动 stub）
  - Playwright E2E 测试直接调用真实 API（通过 proxy）

## Decisions

### 决策 1: 采用"硬删除"策略而非"软禁用"

**选择**：直接删除所有 MSW 相关文件和代码

**备选方案对比**：

| 方案 | 描述 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **🎯 硬删除（选中）** | 完全移除代码和依赖 | 最干净、零开销、不可逆 | 回退需重新编写 | Server 已稳定 |
| 软禁用 | 保留代码但注释掉 | 可快速恢复 | 代码噪音、仍安装依赖 | 临时停用 |
| 特性开关 | 通过 env 变量控制加载 | 灵活、按需启用 | 复杂度最高 | 需要 A/B 测试 |

**理由**：
1. 符合 YAGNI 原则（You Aren't Gonna Need It）
2. 当前 MSW 从未真正使用过（handlers 为空），不存在"可能还需要"的场景
3. 回滚成本可接受（~10-15 分钟，见 proposal.md 回滚方案）
4. 减少认知负担：新开发者无需理解"为什么这里有段被注释的代码"

**风险缓解**：
- Git 历史完整保留，可通过 `git checkout <hash>` 恢复任何文件
- proposal.md 中记录了详细的回滚步骤

---

### 决策 2: 移除顺序采用"依赖倒置"原则

**选择**：先清理消费者（main.ts），再清理生产者（mocks 目录），最后清理声明（package.json）

**执行顺序及理由**：

```
Phase 1: 应用层清理（立即生效，立即可验证）
  ├── main.ts           ← 移除 import 和条件启动逻辑
  ├── env.config.ts     ← 删除 enableMock 字段
  └── .env.*            ← 删除 VITE_ENABLE_MOCK 变量

Phase 2: 文件系统清理（物理删除）
  ├── src/mocks/        ← 删除整个目录
  └── public/mockServiceWorker.js  ← 删除 SW 脚本

Phase 3: 依赖声明清理（最后执行，避免中间态问题）
  └── package.json      ← 移除 msw 依赖 + msv 配置块
```

**为什么这个顺序？**
1. **安全性**：先断开引用再删除文件，避免 TypeScript 编译报错（"找不到模块"）
2. **可验证性**：每步完成后都可运行 `pnpm dev:web` 验证无报错
3. **原子性**：如果某步失败，可快速定位问题范围

**备选方案**：一次性全部删除
- 缺点：如果遗漏某个引用，TS 编译错误难以定位
- 不采纳原因：风险高于收益，分步执行更可控

---

### 决策 3: 接口变更采用"渐进式废弃"模式

**选择**：直接删除 `enableMock` 字段，不做兼容处理

**背景**：
```typescript
// 当前 WebEnvConfig 接口
export interface WebEnvConfig {
  // ... 其他字段
  enableMock: boolean;  // ← 将删除此字段
}
```

**备选方案**：

| 方案 | 描述 | 优缺点 |
|------|------|--------|
| **🎯 直接删除（选中）** | 移除字段 + 所有引用 | 简单、彻底；需全局搜索确认无其他使用者 |
| 标记 @deprecated | 保留字段但标记废弃 | 兼容旧代码；但增加噪音且无人使用 |
| 改为可选字段 | `enableMock?: boolean` | 更温和；但仍保留无用字段 |

**理由**：
1. `enableMock` 仅在 `env.config.ts` 的 `validateEnv()` 函数中使用一次
2. 仅在 `main.ts` 中消费一次（即将删除）
3. 无其他模块或组件依赖此字段
4. 直接删除符合"彻底清理"的目标

**验证方法**：
```bash
# 执行前检查
grep -r "enableMock" apps/web/src/
# 应仅返回 2 个结果：env.config.ts 定义 + main.ts 使用
```

---

### 决策 4: 不创建 Delta Specs

**选择**：跳过 specs 阶段，仅生成 proposal + design + tasks

**理由**（已在 proposal.md 中说明）：
1. 此变更为**纯技术债务清理**，不涉及业务规格变更
2. `env-config` spec 的核心行为不变（只是移除一个可选字段）
3. `request-core` spec 完全不受影响（HttpClient 架构未改）
4. 创建 delta spec 会增加不必要的文档负担

**OpenSpec 流程适配**：
- `specs/**/*.md` artifact 状态设为 "skipped"（或空目录）
- 直接进入 tasks 阶段

> ⚠️ **注意**：如果未来发现此变更意外影响了某个规格（例如破坏了某个隐含假设），应立即补建 delta spec。

## Risks / Trade-offs

### 风险矩阵

| # | 风险描述 | 概率 | 影响 | 缓解措施 | 验证方式 |
|---|---------|------|------|----------|----------|
| R1 | **TypeScript 编译错误** | 🟡 中 | 🔴 高 | 分步执行 + 每步验证 | `vue-tsc --noEmit` |
| R2 | **遗留引用导致运行时报错** | 🟢 低 | 🔴 高 | 全局 grep 搜索 + IDE 重构 | `pnpm dev:web` 手动测试 |
| R3 | **CI/CD 流水线失败** | 🟢 低 | 🟡 中 | 本地预跑 lint + typecheck | `pnpm lint && pnpm typecheck` |
| R4 | **团队成员工作流中断** | 🟢 低 | 🟡 中 | 提前通知 + 同步更新文档 | 团队沟通 |
| R5 | **依赖树污染** | 🔴 极低 | 🟢 低 | 执行 `pnpm why msw` 确认无反向依赖 | 包分析工具 |

### 权衡取舍

#### ✅ 收益

| 维度 | 量化指标 | 说明 |
|------|----------|------|
| **启动速度** | +50~100ms | 减少 Service Worker 注册时间 |
| **包体积** | -40KB (gzipped) | msw 包大小（node_modules） |
| **安装时间** | -2~5s | pnpm install 少装一个依赖 |
| **构建产物** | -6.8KB | public/mockServiceWorker.js |
| **代码行数** | -30~40 行 | 删除 mocks/ + main.ts 条件逻辑 |
| **认知负担** | 显著降低 | 新成员无需理解 MSW 配置 |

#### ⚠️ 代价

| 维度 | 影响程度 | 说明 |
|------|----------|------|
| **不可逆性** | 中等 | Git 历史可恢复，但需手动操作 |
| **未来灵活性** | 低 | 如需 Mock 能力需从头配置（~15分钟） |
| **团队适应** | 极低 | 变更透明，几乎无感知 |

**结论**：收益远大于代价，特别是在 Server 已稳定的前提下。

---

## Migration Plan（实施路径）

### Phase 0: 准备工作（Pre-flight Checks）

```bash
# 1. 确认当前分支状态
git status  # 应该是 clean 或仅有无关更改

# 2. 全局搜索 MSW 引用（建立基线）
grep -rn "mock\|msw\|enableMock\|VITE_ENABLE_MOCK" \
  --include="*.ts" --include="*.vue" --include="*.json" --include="*.env*" \
  apps/web/

# 预期结果：
# - apps/web/src/main.ts (1处)
# - apps/web/src/utils/env.config.ts (2处)
# - apps/web/src/mocks/*.ts (3处)
# - apps/web/package.json (2处)
# - apps/web/.env.development (1处)
# - apps/web/public/mockServiceWorker.js (1处)

# 3. 确认 Server 正常运行
curl http://localhost:3000/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
# 应返回 401 或业务错误（非网络错误）

# 4. 运行当前测试套件（确保基线绿色）
pnpm test  # 或 pnpm test:watch
```

### Phase 1: 应用层清理（预计 5 分钟）

**目标**：断开所有对 MSW 的引用，使代码库处于"可编译但引用悬空"状态

**步骤**：

1. **修改 `apps/web/src/main.ts`**
   ```diff
   - if (env.enableMock) {
   -   import('./mocks/browser.js').then(({ worker }) => {
   -     worker.start({ onUnhandledRequest: 'bypass' });
   -   }).catch(() => { });
   - }
   ```

2. **修改 `apps/web/src/utils/env.config.ts`**
   ```diff
   export interface WebEnvConfig {
     // ... 其他字段
   -  enableMock: boolean;
     // ...
   }

   // 在 validateEnv() 函数中:
   - const enableMock = isProduction ? false : parseBoolean(meta.VITE_ENABLE_MOCK);
   
   return Object.freeze({
     // ...
   -  enableMock,
     // ...
   });
   ```

3. **修改环境变量文件**
   - `apps/web/.env.development`: 删除 `VITE_ENABLE_MOCK=true`
   - `apps/web/.env.test`: 检查并删除（如存在）

**验证**：
```bash
cd apps/web && pnpm dev
# 观察控制台：
# ✅ 无 MSW 相关日志
# ✅ 无 "Cannot find module './mocks/browser'" 错误
# ✅ 应用正常启动
```

### Phase 2: 文件系统清理（预计 2 分钟）

**目标**：物理删除 MSW 相关文件

**步骤**：

```bash
# 删除 mocks 目录
rm -rf apps/web/src/mocks/

# 删除 Service Worker 脚本
rm apps/web/public/mockServiceWorker.js
```

**验证**：
```bash
# 确认文件已删除
ls apps/web/src/mocks/  # 应报错 "No such file or directory"
ls apps/web/public/mockServiceWorker.js  # 应报错 "No such file or directory"
```

### Phase 3: 依赖声明清理（预计 3 分钟）

**目标**：从 package.json 中移除 msw

**步骤**：

**修改 `apps/web/package.json`**：

```json
{
  "devDependencies": {
    // ... 其他依赖
-   "msw": "^2.14.6",
    // ...
  },
- "msw": {
-   "workerDirectory": ["public"]
- }
}
```

**执行依赖重装**：
```bash
pnpm install
# 观察：
# ✅ Lock file 更新（msw 及其依赖被移除）
# ✅ node_modules 中无 msw 目录
```

### Phase 4: 最终验证（预计 5 分钟）

**目标**：确保所有功能正常，无回归

**检查清单**：

```bash
# 1. TypeScript 编译
pnpm typecheck
# ✅ 零错误

# 2. ESLint 检查
pnpm lint
# ✅ 零错误/警告

# 3. 启动 Web 应用
pnpm dev:web
# ✅ 控制台无 MSW 日志
# ✅ Network 面板无 Service Worker 层
# ✅ 页面正常渲染

# 4. 功能测试（手动）
# 打开浏览器访问 http://localhost:5173
# - 登录页面正常显示
# - 输入凭证后调用 /api/v1/auth/login
# - Network 面板显示请求直达 localhost:3000（无 SW 拦截）
# - 响应数据正确解析

# 5. 全局搜索残留（最终确认）
grep -r "msw\|mockServiceWorker\|enableMock" apps/web/
# ✅ 零匹配（除 .gitignore 或 node_modules 外）
```

### Phase 5: 文档与提交（预计 2 分钟）

**Git 提交信息建议**：

```
refactor(web): remove unused MSW mock infrastructure

- Delete empty MSW handlers and browser setup (src/mocks/)
- Remove mockServiceWorker.js from public/
- Clean up enableMock env var and conditional startup logic
- Remove msw dependency from package.json

Rationale: Server is stable and all requests were bypassing
MSW anyway. This simplifies the architecture and improves
dev experience (faster startup, cleaner Network panel).

Closes: #[issue-number-if-any]
```

**可选：更新 README**

如果项目的 README 中提及了 MSW 或 Mock 开发模式，需要同步更新。

---

## Open Questions

### Q1: 是否需要在 `.gitignore` 中添加排除规则？

**当前状态**：`.gitignore` 未明确忽略 `src/mocks/` 或 `public/mockServiceWorker.js`

**建议**：✅ **不需要**

**理由**：
- 这些文件将被删除，不存在"防止意外提交"的问题
- 如果未来重新引入 MSW，应在那时再决定是否 gitignore
- 过度防御性的 gitignore 规则会增加认知负担

**决策**：不在此次变更中修改 `.gitignore`

---

### Q2: 是否需要通知团队其他成员？

**建议**：⚠️ **视情况而定**

**如果满足以下任一条件，应该通知**：
- 有其他活跃开发者在同一分支工作
- CI/CD 流水线中有针对 MSW 的特殊处理
- 文档（Wiki/Confluence）中记录了 MSW 使用指南

**通知模板**（可通过 Slack/邮件发送）：

> 👋 Hi team,
>
> 我正在清理 uni-admin 项目中未使用的 MSW (Mock Service Worker) 依赖。
>
> **变更内容**：
> - 移除空的 mock handlers 和 Service Worker
> - 删除 `VITE_ENABLE_MOCK` 环境变量
> - 从 package.json 中移除 msw 包
>
> **影响**：
> - ✅ 对功能零影响（MSW 从未真正拦截过请求）
> - ✅ 启动速度微幅提升 (~50-100ms)
> - ✅ 代码库更简洁
>
> **回滚**：如需恢复，可参考 `openspec/changes/remove-msw-mock/proposal.md` 中的回滚方案。
>
> 有疑问请随时联系！🚀

**决策**：由用户根据团队实际情况决定是否通知

---

### Q3: 是否应该在移除后添加架构守护规则？

**背景**：防止未来有人重新引入 MSW 但忘记配置 handlers

**建议**：❌ **暂不需要**

**理由**：
1. 当前团队规模小，代码审查可有效防止此类问题
2. 添加 ESLint rule 或 pre-commit hook 会增加工具链复杂度
3. 如果未来项目扩大，可在那时引入更严格的架构治理

**替代方案**（轻量级）：
- 在 `CONTRIBUTING.md` 中添加一条："避免引入未使用的依赖"
- Code Review 时注意新的 `devDependencies`

**决策**：不在此次变更中添加自动化规则

---

## 附录：架构对比图

### 移除前

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE (Current State)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser                                                    │
│    │                                                        │
│    ▼                                                        │
│  ┌──────────────┐                                          │
│  │ Vue App      │                                          │
│  │ (main.ts)    │                                          │
│  └──────┬───────┘                                          │
│         │ if (env.enableMock)                               │
│         ▼                                                   │
│  ┌──────────────┐    onUnhandledRequest: 'bypass'          │
│  │ MSW Worker   │ ──────────────────────────────────┐      │
│  │ (空转)        │                                   │      │
│  └──────────────┘                                   │      │
│                                                     ▼      │
│  ┌──────────────┐    ┌──────────────┐               │      │
│  │ Vite DevServer│   │ Axios/Fetch  │◀──────────────┘      │
│  │ (:5173)      │   │ (HttpClient) │                      │
│  └──────┬───────┘   └──────┬───────┘                      │
│         │ proxy:/api        │ baseURL: /api/v1             │
│         ▼                  ▼                                │
│  ┌──────────────────────────────────┐                      │
│  │ NestJS Server (:3000)            │                      │
│  │ • Auth Module                     │                      │
│  │ • User Module                     │                      │
│  │ • Swagger Docs                    │                      │
│  └──────────────────────────────────┘                      │
│                                                             │
│  ❌ 问题：多余的拦截层 + 空转开销                             │
└─────────────────────────────────────────────────────────────┘
```

### 移除后

```
┌─────────────────────────────────────────────────────────────┐
│                    AFTER (Target State)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser                                                    │
│    │                                                        │
│    ▼                                                        │
│  ┌──────────────┐                                          │
│  │ Vue App      │                                          │
│  │ (main.ts)    │                                          │
│  │ [精简版]     │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │ Axios/Fetch  │                                          │
│  │ (HttpClient) │                                          │
│  └──────┬───────┘                                          │
│         │ baseURL: /api/v1                                 │
│         ▼                                                  │
│  ┌──────────────┐    proxy:/api                            │
│  │ Vite DevServer│ ─────────────┐                          │
│  │ (:5173)      │               │                          │
│  └──────────────┘               │                          │
│                                  ▼                          │
│  ┌──────────────────────────────────┐                      │
│  │ NestJS Server (:3000)            │                      │
│  │ • Auth Module                     │                      │
│  │ • User Module                     │                      │
│  │ • Swagger Docs                    │                      │
│  └──────────────────────────────────┘                      │
│                                                             │
│  ✅ 优势：简洁直连 + 快速启动 + 清晰调试                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 总结

本设计文档详细阐述了**移除 MSW Mock 基础设施**的技术方案，核心要点：

1. **安全可控**：分步执行 + 每步验证，降低回归风险
2. **彻底清理**：硬删除策略，不留残余代码
3. **收益明确**：启动速度 +50~100ms，减少 ~40KB 依赖体积
4. **可逆性强**：Git 历史完整保留，回滚成本 ~10-15 分钟

下一步：查看 `tasks.md` 获取详细的实施任务清单。
