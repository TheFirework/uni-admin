# Prefetch Engine Spec

## Purpose

定义智能预加载引擎规范，实现基于鼠标悬停的组件预加载和 Promise 并发去重机制，提升页面切换响应速度 80%+，减少网络请求冗余。

---

## Requirements

### Requirement: 悬停预加载策略 (Hover Prefetch)

系统 SHALL 实现基于鼠标悬停的组件预加载机制，提升页面切换响应速度。

#### Scenario: 鼠标进入菜单项触发延迟定时器

- **WHEN** 用户鼠标进入菜单项 DOM 元素
- **AND** 该元素已通过 `hoverPrefetcher.bind()` 绑定预加载事件
- **THEN** 系统 SHALL 启动 150ms 延迟定时器
- **AND** 不立即执行预加载（避免误触发）

#### Scenario: 150ms 后执行预加载

- **WHEN** 鼠标持续停留在元素上超过 150ms
- **THEN** 定时器到期，执行 `loader()` 函数
- **AND** loader() 通常是路由组件的动态 import()
- **AND** 控制台输出 `[HoverPrefetch] 预加载: {routePath}`

#### Scenario: 鼠标快速滑过不触发预加载

- **WHEN** 鼠标在 150ms 内离开元素
- **THEN** 系统 SHALL 取消定时器
- **AND** 不执行预加载操作
- **AND** 避免带宽浪费（误触过滤）

#### Scenario: 预加载失败不影响正常导航

- **WHEN** loader() 执行过程中抛出错误
- **THEN** 错误被 catch 并输出警告日志
- **AND** 不影响用户后续点击该菜单项的正常导航

---

### Requirement: 可配置的延迟时间

系统 SHALL 支持可配置的悬停延迟时间。

#### Scenario: 默认延迟 150ms

- **WHEN** 创建 HoverPrefetcher 实例时未指定延迟
- **THEN** 使用默认值 150ms

#### Scenario: 通过配置自定义延迟

- **WHEN** 需要调整延迟时间
- **THEN** 通过环境变量 `VITE_HOVER_DELAY` 配置（毫秒）
- **AND** HoverPrefetcher 实例使用该配置值初始化

#### Scenario: 150ms 延迟的设计理由

150ms 是黄金平衡点：
- **过短 (<100ms)**: 鼠标快速滑过时误触发，浪费带宽
- **过长 (>300ms)**: 用户点击后才触发预加载，失去意义
- **150ms**: 足够过滤误触 + 用户无感延迟

---

### Requirement: 生命周期管理

系统 SHALL 提供完善的预加载器生命周期管理接口。

#### Scenario: 绑定预加载事件 (bind)

- **WHEN** 调用 `hoverPrefetcher.bind(element, routePath, loader)`
- **THEN** 为元素添加 mouseenter 和 mouseleave 事件监听
- **AND** 存储定时器和监听器引用到内部 Map
- **AND** 如果该元素已有绑定，先清理旧绑定（防重复）

#### Scenario: 解绑预加载事件 (unbind)

- **WHEN** 调用 `hoverPrefetcher.unbind(element)`
- **THEN** 取消该元素的定时器（如有）
- **AND** 移除 mouseenter 和 mouseleave 事件监听
- **AND** 从内部 Map 中删除引用

#### Scenario: 销毁所有预加载 (destroy)

- **WHEN** 组件卸载或需要清理时调用 `hoverPrefetcher.destroy()`
- **THEN** 遍历所有定时器并取消
- **AND** 遍历所有监听器并移除
- **AND** 清空内部 Map，释放内存

---

### Requirement: 与 Sidebar 的集成

系统 SHALL 在侧边栏组件中自动集成悬停预加载功能。

#### Scenario: Sidebar 挂载后绑定预加载事件

- **WHEN** Sidebar 组件 onMounted 生命周期触发
- **AND** routerConfig.prefetchEnabled === true
- **THEN** 在 nextTick 后遍历所有 `.el-menu-item[data-path]` 元素
- **AND** 为每个菜单项:
  1. 读取 data-path 属性获取路由路径
  2. 使用 router.resolve(path) 解析匹配的路由记录
  3. 提取最后一个 matched route 的 component
  4. 如果 component 是函数（懒加载），绑定 hoverPrefetcher

#### Scenario: Sidebar 卸载时清理预加载

- **WHEN** Sidebar 组件 onUnmounted 生命周期触发
- **THEN** 调用 `hoverPrefetcher.destroy()` 清理所有预加载资源
- **AND** 防止内存泄漏

#### Scenario: 预加载功能开关控制

- **WHEN** routerConfig.prefetchEnabled === false
- **THEN** Sidebar 不绑定任何预加载事件
- **AND** 节省移动设备或受限环境的资源

---

### Requirement: 并发去重器 (Promise Deduplicator)

系统 SHALL 实现 Promise 去重机制，确保相同请求不重复发送。

#### Scenario: 相同 key 的并发请求去重

- **WHEN** 多个组件同时调用 `deduplicator.execute('same-key', fn)`
- **AND** 第一次调用正在执行中（Promise pending）
- **THEN** 后续调用 SHALL 返回同一个 Promise 引用
- **AND** 实际函数只执行一次
- **AND** 所有调用者共享同一个结果

#### Scenario: 结果短时缓存

- **WHEN** 调用 execute() 时指定 options.cacheTTL (如 5000ms)
- **AND** 上一次相同 key 的请求已完成且在 TTL 内
- **THEN** 直接返回缓存的结果，不重新执行函数
- **AND** 减少不必要的网络请求

#### Scenario: 请求完成后自动清理

- **WHEN** Promise 执行完成（resolve 或 reject）
- **THEN** 自动从 pendingRequests Map 中删除该 key
- **AND** 允许下次同 key 请求重新执行

#### Scenario: 手动取消请求

- **WHEN** 调用 `deduplicator.cancel(key)`
- **THEN** 从 pendingRequests Map 中删除该 key
- **AND** 返回 boolean 表示是否成功取消
- **AND** 已完成的请求 cancel 返回 false

#### Scenario: 强制刷新时清除缓存

- **WHEN** 调用 menuStore.forceRefresh()
- **THEN** 同时清除 deduplicator 的 resultCache
- **AND** 确保下次 fetchMenus 一定会发起新请求

---

## Implementation Notes

- **Source**: smart-router-system change (2026-05-19)
- **Status**: ✅ Completed and synced
- **Key Files**:
  - [HoverPrefetcher.ts](../../../apps/web/src/utils/prefetch/HoverPrefetcher.ts)
  - [PromiseDeduplicator.ts](../../../apps/web/src/utils/concurrency/PromiseDeduplicator.ts)
  - [Sidebar/index.vue](../../../apps/web/src/layouts/components/Sidebar/index.vue)
