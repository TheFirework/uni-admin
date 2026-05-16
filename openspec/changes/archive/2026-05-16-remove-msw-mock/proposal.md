## Why

当前项目（uni-admin）已具备完整的 NestJS 后端服务，且企业级 Axios 请求封装（@uni-admin/request）已完成开发。MSW (Mock Service Worker) 虽然已集成但处于**空转状态**：Worker 已启动但无任何拦截规则（handlers 为空数组），所有请求均通过 `onUnhandledRequest: 'bypass'` 直接透传到真实服务器。

这种"僵尸状态"带来了不必要的复杂性：
- **性能开销**：Service Worker 启动增加 ~50-100ms 延迟
- **调试干扰**：Network 面板显示 SW 请求层，影响问题排查
- **维护负担**：mocks 目录、环境变量开关、msw 依赖等需要持续维护
- **包体积**：msw (~40KB gzipped) 增加安装和构建体积

**核心动机**：Server 已稳定运行（terminal 2 显示 `pnpm start:dev` 正常），Vite Proxy 配置完善（`/api` → `localhost:3000`），CORS 已正确配置，完全具备直连条件。移除 MSW 符合 YAGNI 原则，简化架构并提升开发体验。

## What Changes

### 移除项

- **删除 MSW 核心文件**
  - `apps/web/public/mockServiceWorker.js` - Service Worker 脚本（6.8KB）
  - `apps/web/src/mocks/browser.ts` - Worker 初始化代码（4行）
  - `apps/web/src/mocks/handlers.ts` - 空的 handlers 定义（4行）

- **修改应用入口**
  - `apps/web/src/main.ts` - 移除第 16-20 行的 MSW 条件启动逻辑

- **清理环境配置**
  - `apps/web/.env.development` - 删除 `VITE_ENABLE_MOCK=true`
  - `apps/web/.env.test` - 检查并删除相关配置（如存在）
  - `apps/web/src/utils/env.config.ts` - 移除 `enableMock` 字段及校验逻辑

- **更新依赖声明**
  - `apps/web/package.json` - 从 devDependencies 中移除 `"msw": "^2.14.6"` 及 msw 配置块

### 影响范围

**无破坏性变更**：
- ✅ 所有 API 调用路径不变（仍通过 Vite Proxy → Server）
- ✅ HttpClient 实例配置不受影响（baseURL 保持 `/api/v1`）
- ✅ 认证流程不变（Token 管理、401 处理等）
- ✅ 开发体验提升（减少一层拦截，更清晰的 Network 面板）

## Capabilities

### New Capabilities

无新增能力。此变更为**纯移除操作**，不引入新功能。

### Modified Capabilities

无现有能力的需求变更。此变更仅涉及实现层面的清理，不影响任何业务规格：

- `env-config` spec 不需要修改（仅移除 `enableMock` 可选字段，不改变核心行为）
- `request-core` spec 不受影响（HttpClient 架构保持不变）
- `api-module-convention` spec 无需调整（API 调用方式未改变）

> **决策说明**：经评估，此次变更属于"技术债务清理"，不涉及规格层面变更，因此无需创建 delta specs。

## Impact

### 受影响的系统组件

| 组件 | 变更类型 | 说明 |
|------|----------|------|
| **Web 应用入口** (`main.ts`) | 修改 | 移除 ~5 行 MSW 启动代码 |
| **环境配置系统** (`env.config.ts`) | 修改 | 删除 `enableMock` 字段（接口变更） |
| **环境变量文件** (`.env.*`) | 修改 | 删除 `VITE_ENABLE_MOCK` 配置 |
| **包管理** (`package.json`) | 修改 | 移除 msw 依赖及配置 |
| **文件系统** (`mocks/`, `public/`) | 删除 | 清理 3 个文件 + 1 个目录 |

### 受影响的团队/角色

| 角色 | 影响 | 需要的操作 |
|------|------|-----------|
| **前端开发者** | 🟢 正面 | 更简洁的项目结构，更快的启动速度 |
| **DevOps/CI** | 🟢 正面 | 减少依赖安装时间，缩小构建产物 |
| **新成员入职** | 🟢 正面 | 降低认知负担（无需理解 MSW 配置） |

### 回滚方案

如果未来需要重新启用 Mock 能力（例如后端未就绪的前端独立开发场景）：

```bash
# 1. 重新安装 MSW
pnpm --filter @uni-admin/web add -D msw

# 2. 初始化 Service Worker
npx msw init public/ --save

# 3. 恢复 mocks 目录结构（可从 Git 历史恢复）
git checkout <commit-hash> -- apps/web/src/mocks/

# 4. 重新添加环境变量和启动逻辑（参考本次变更的 Git diff）
```

**回滚成本评估**：~10-15 分钟（主要耗时在重新编写 handlers，如需复杂数据 mock 则更长）

### 风险评估

| 风险项 | 级别 | 缓解措施 | 验证方法 |
|--------|------|----------|----------|
| **功能回归** | 🟢 极低 | MSW 当前无 handlers，所有请求已透传到 Server | 运行完整 E2E 测试套件 |
| **环境兼容性** | 🟢 低 | 仅影响 development/test 环境 | 检查 `.env.production` 未包含相关配置 |
| **依赖冲突** | 🟢 低 | msw 仅在 web 应用使用，无其他包依赖 | 执行 `pnpm why msw` 确认无反向依赖 |
| **文档过时** | 🟡 中 | 可能存在提及 MSW 的 README 或注释 | 全局搜索 `mock\|msw` 关键词并清理 |

### 成功标准

- [ ] `pnpm install` 后不再安装 msw 包
- [ ] `pnpm dev:web` 启动时无 MSW 相关日志
- [ ] 浏览器 DevTools Network 面板中无 Service Worker 拦截层
- [ ] 所有 API 调用正常工作（登录、CRUD 等）
- [ ] TypeScript 编译无错误（env.config 接口变更后）
- [ ] ESLint/Prettier 检查通过
