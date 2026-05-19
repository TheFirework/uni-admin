# Menu Cache Spec

## Purpose

定义双层菜单缓存管理规范，实现 L1 内存缓存 + L2 Storage 持久化缓存的分层架构，支持版本化失效、TTL 过期、后台静默刷新等企业级缓存策略。

---

## Requirements

### Requirement: 双层缓存架构 (L1 + L2)

系统 SHALL 实现分层缓存设计，兼顾速度与持久性：

- **L1 内存缓存** (<0.1ms 响应，同步): 用于会话内高频访问
- **L2 Storage 缓存** (1-5ms 响应，异步): 用于跨刷新快速恢复
- **查找顺序**: L1 → L2 → miss (触发网络请求)

#### Scenario: L1 内存命中返回数据

- **WHEN** 调用 `menuCacheManager.getMenu()`
- **AND** L1 缓存存在且版本匹配且未过期
- **THEN** 立即返回 `{ hit: true, data, source: 'L1' }` (同步操作)
- **AND** 响应时间 < 0.1ms

#### Scenario: L1 未命中但 L2 命中

- **WHEN** L1 缓存为空或已失效
- **AND** L2 Storage 中存在有效数据
- **THEN** 从 Storage 读取并回填到 L1
- **AND** 返回 `{ hit: true, data, source: 'L2' }`
- **AND** 响应时间 1-5ms

#### Scenario: 双层都未命中

- **WHEN** L1 和 L2 都无有效数据
- **THEN** 返回 `{ hit: false, reason: 'not_found' }`
- **AND** 调用方 SHALL 触发网络请求获取数据

---

### Requirement: 缓存写入与双写一致性

系统 SHALL 在写入时同时更新 L1 和 L2，保证数据一致性。

#### Scenario: 写入缓存 (setMenu)

- **WHEN** 调用 `menuCacheManager.setMenu(data, source)`
- **THEN** 系统 SHALL:
  1. 构建 CacheEntry (包含 data, version, cachedAt, expiresAt)
  2. **同步写入 L1** (立即生效)
  3. **异步写入 L2** (使用 storage.set 带 TTL)
- **AND** L2 写入失败时仅输出警告，不影响 L1 数据

#### Scenario: CacheEntry 数据结构

每个缓存条目 SHALL 包含：

```typescript
interface CacheEntry<T> {
  data: T;              // 实际数据 (RouteRecordRaw[] 或 MenuItem[])
  version: string;      // 应用版本号 (用于失效检测)
  cachedAt: number;     // 写入时间戳
  expiresAt: number;    // 过期时间戳 (cachedAt + TTL)
}
```

---

### Requirement: 版本化缓存失效机制

系统 SHALL 通过版本号自动清除过期缓存，确保应用更新后不使用旧数据。

#### Scenario: 初始化时版本校验

- **WHEN** 应用启动调用 `menuCacheManager.initialize()`
- **THEN** 从 Storage 读取存储的版本号
- **AND** 与当前 `VITE_BUILD_VERSION` 对比:
  - **版本匹配**: 保持现有缓存
  - **版本不匹配**: 清除所有旧缓存，写入新版本号
  - **无版本记录**: 首次运行，写入当前版本号

#### Scenario: L1/L2 读取时版本检查

- **WHEN** 从 L1 或 L2 读取缓存条目
- **AND** entry.version !== 当前 appVersion
- **THEN** 视为失效，清除该层数据
- **AND** 返回 `{ hit: false, reason: 'version_mismatch' }`

---

### Requirement: TTL 时间过期机制

系统 SHALL 支持可配置的缓存过期时间，默认 30 分钟。

#### Scenario: TTL 过期检测

- **WHEN** 读取缓存条目时
- **AND** `Date.now() > entry.expiresAt`
- **THEN** 视为过期，清除该层数据
- **AND** 返回 `{ hit: false, reason: 'expired' }`

#### Scenario: 可配置的 TTL 值

- **WHEN** 需要调整缓存时间
- **THEN** 通过环境变量 `VITE_MENU_CACHE_TTL` 配置（毫秒）
- **AND** 默认值: 1800000 (30 分钟)
- **AND** 开发环境可设置为 0 或较小值以禁用缓存

---

### Requirement: 缓存清理与管理

系统 SHALL 提供完善的缓存清理和管理接口。

#### Scenario: 清除所有缓存 (clearAll)

- **WHEN** 调用 `menuCacheManager.clearAll()`
- **THEN** 清除 L1 内存缓存 (l1Cache = null)
- **AND** 删除 L2 Storage 中的缓存数据
- **AND** 忽略删除过程中的错误（容错处理）

#### Scenario: 获取统计信息 (getStats)

- **WHEN** 调用 `menuCacheManager.getStats()`
- **THEN** 返回当前缓存状态:
  ```typescript
  {
    l1Size: number,       // L1 缓存条目数 (0 或 1)
    version: string,      // 当前应用版本号
    lastCachedAt: number  // 最后一次缓存时间戳
  }
  ```

#### Scenario: 登出时清除缓存

- **WHEN** 用户执行登出操作
- **THEN** menuStore.resetMenuState() SHALL 调用 clearAll()
- **AND** 清除去重器的结果缓存
- **AND** 重置所有菜单相关状态

---

### Requirement: 后台静默刷新 (Stale-While-Revalidate)

系统 SHALL 实现 Stale-While-Revalidate 策略，在返回旧数据的同时后台更新。

#### Scenario: 缓存命中后触发后台刷新

- **WHEN** 从缓存获取到菜单数据（L1 或 L2 命中）
- **AND** 数据来源为 stale (source === 'L2')
- **THEN** 系统 SHALL 在 3 秒后触发后台静默刷新:
  1. 调用 RouteAdapter.fetchRoutes() 获取最新数据
  2. 更新 L1 和 L2 缓存
  3. 更新 menuStore 的 routes 和 menus
  4. 设置 cacheStatus 为 'fresh'

#### Scenario: 后台刷新失败不影响用户体验

- **WHEN** 后台静默刷新请求失败
- **THEN** 仅输出警告日志
- **AND** 不显示错误提示给用户
- **AND** 不影响当前页面正常使用

---

## Implementation Notes

- **Source**: smart-router-system change (2026-05-19)
- **Status**: ✅ Completed and synced
- **Key Files**:
  - [MenuCacheManager.ts](../../../apps/web/src/utils/cache/MenuCacheManager.ts)
  - [PromiseDeduplicator.ts](../../../apps/web/src/utils/concurrency/PromiseDeduplicator.ts)
