## Why

当前 uni-admin 项目的 API 请求层（[apps/web/src/api/index.ts](../../../apps/web/src/api/index.ts)）仅做了最基础的 axios 封装，缺少请求取消、重试、缓存、Token 管理、Loading 状态、接口级配置、监控埋点等企业级能力。随着业务模块增多和团队规模扩大，直接使用原生 axios 或简单封装会导致：接口请求规范不统一、错误处理不一致、重复代码散落各处、难以排查线上问题，且已存在 **401 并发重复跳转** 等生产隐患。需要建设一套标准化、可复用、可扩展、可监控的企业级 Axios 请求封装方案。

## What Changes

### 新增 packages/request 包（框架无关核心层）

- 创建 `@uni-admin/request` 共享包，包含完整的请求引擎实现
- 支持多实例创建（主 API / 文件服务 / 第三方服务等独立配置）
- 实现三层配置合并机制（全局默认 → 实例配置 → 接口级覆盖）
- 实现 CancelManager 统一管理请求取消（防重复、路由切换、组件卸载、手动取消）
- 实现 RetryEngine 重试引擎（仅 GET 自动重试，可配置次数/间隔）
- 实现 CacheEngine 缓存引擎（GET 自动缓存 + TTL 过期 + 手动清理 + 用户身份隔离）
- 实现 TokenManager Token 管理器（白名单机制、自动携带、401 加锁处理、P1 阶段含 Refresh 竞态处理）
- 完整 TypeScript 类型系统（RequestOptions 扩展、泛型自动推导）

### 新增 apps/web/src/lib/request（Vue 深度适配层）

- 创建 Vue 适配器（Loading 状态 → ref、路由跳转 → vue-router、生命周期 → onUnmounted）
- 实现 useRequest / useRequestAutoCancel 组合式函数
- 配置多实例（default/file/thirdparty），每个实例独立隔离
- 错误提示抽象接口 + Element Plus 默认实现
- 环境区分日志（dev 完整日志 / pro 脱敏输出）

### 新增模块化 API 层规范

- 按业务模块拆分 API 文件（user.api.ts / auth.api.ts / system.api.ts 等）
- 每个接口定义强类型请求参数与返回类型
- 统一导出，禁止业务代码直接调用 axios 或 request 包内部 API

### 替换现有 API 封装

- **BREAKING**: 移除 [apps/web/src/api/index.ts](../../../apps/web/src/api/index.ts) 中的旧封装
- 全局迁移至新的 `useRequest()` composable 或实例方法调用方式
- 响应数据默认自动解包（返回 T 而非 AxiosResponse<ApiResponse<T>>）

### P0 首批交付范围（最小可用版本）

- ✅ 多实例工厂 + 配置合并引擎
- ✅ 统一响应处理（双层状态码校验 + 自动解包）
- ✅ Token 管理（白名单 + 自动携带 + 401 加锁跳转）
- ✅ Loading 状态管理（实例级计数器 + 接口级开关）
- ✅ 统一错误提示（可接口级关闭，Cancel 静默）
- ✅ 基础请求取消（AbortController + CancelManager 初始化）
- ✅ TypeScript 完整类型定义
- ✅ Vue composable 层（useRequest）
- ✅ 环境区分日志

### P1-P3 后续迭代范围（不在本次交付）

- ○ P1: RetryEngine + CacheEngine + Token Refresh 竞态处理 + 上传下载进度
- ○ P2: 安全签名（MD5/SHA256 时间戳 nonce）+ 监控埋点 + 参数脱敏 + TraceId
- ○ P3: 熔断降级（429 限流退避 + 5xx 连续失败熔断）+ 浏览器并发队列控制

## Capabilities

### New Capabilities

- `request-core`: 核心请求引擎，包含多实例工厂、配置合并、拦截器管线、类型定义
- `request-cancel`: 请求取消能力，防重复请求、路由级批量取消、组件卸载自动取消
- `request-token`: Token 管理能力，白名单机制、自动携带、401 加锁处理、Refresh 竞态队列
- `request-retry`: 请求重试能力，网络异常/超时/5xx 自动重试、仅 GET 默认开启
- `request-cache`: 接口缓存能力，GET 自动缓存、TTL 过期、用户身份隔离、手动清理
- `request-loading`: Loading 状态管理，实例级计数器、接口级开关、多实例隔离
- `request-error`: 统一错误处理，分类策略（Cancel/Timeout/Network/4xx/5xx/Biz）、可配置提示
- `request-monitor`: 监控埋点能力，耗时统计、慢接口告警、环境区分日志、参数脱敏
- `request-security`: 安全能力，接口签名防重放、TraceId 链路追踪、敏感数据加密
- `request-upload-download`: 文件上传下载，进度回调、长超时、Blob 流、大文件支持
- `vue-request-adapter`: Vue 深度适配层，composable 函数、Vue Router 集成、响应式 Loading
- `api-module-convention`: API 模块化管理规范，按业务拆分、强类型约束、统一导出

### Modified Capabilities

（无现有 spec 需要修改，这是全新能力建设）

## Impact

### 受影响的代码模块

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| `packages/request` | **新增** | 新共享包，~15-20 个源文件 |
| `apps/web/src/lib/request` | **新增** | Vue 适配层，~8-12 个源文件 |
| `apps/web/src/api/index.ts` | **替换** | 旧封装废弃，迁移至新 API |
| `apps/web/src/utils/env.config.ts` | **扩展** | 新增请求相关环境变量（可选） |
| `packages/shared-types/src/api.types.ts` | **扩展** | 新增 RequestOptions、InternalConfig 等类型 |
| 业务组件中所有 api 调用点 | **迁移** | 从 `import { get } from '@/api'` 迁移至 `import { useRequest } from '@/lib/request'` |

### API 变更

**对外接口（业务层使用方式）**:

```typescript
// 旧方式（将被移除）
import { get, post } from '@/api';
const res = await get<User[]>('/users');
const users = res.data.data; // 双层解构

// 新方式 - composable
import { useRequest } from '@/lib/request';
const { get, post, loading } = useRequest();
const users = await get<User[]>('/users'); // 直接拿到 User[]

// 新方式 - 直接调用实例
import defaultInstance from '@/lib/request/instances/default';
const users = await defaultInstance.get<User[]>('/users');

// 接口级精细化控制
const users = await get<User[]>('/users', {
  loading: false,
  showError: false,
  cache: { ttl: 300000 },
});
```

### 依赖影响

- **packages/request/package.json**: 依赖 `axios`（peerDependency）、`@uni-admin/shared-types`
- **apps/web/package.json**: 新增依赖 `@uni-admin/request`（workspace 引用）
- 无新增外部 npm 依赖（P0 阶段），P2 阶段可能引入加密库（已有 crypto-ts 可复用）

### 团队协作影响

- **前端开发人员**: 学习新的 API 调用方式（composable / 实例方法），遵循模块化 API 规范
- **后端开发人员**: 无需变更（响应格式保持 ApiResponse<T> 不变）
- **新成员入职**: 通过 API 模块文件快速了解接口全貌，类型即文档

### 回滚计划

- 保留原 `apps/web/src/api/index.ts` 文件至迁移完成并稳定运行 1 个迭代周期后再删除
- 新旧封装可在过渡期共存，通过渐进式迁移降低风险
- 如遇严重问题，可快速回滚到 import 路径指向旧封装
