## Context

字典管理页面基于 `enterprise-dict-module` 基础模块构建，采用左右分栏 Master-Detail 布局。当前实现存在以下问题：

- **后端**：`GET /api/system/dict/type/list` 返回全量数组，无分页能力，数据量增长后前端性能下降
- **前端左侧**：列表项信息冗余（名称+编码+状态tag 占 3 行），hover 操作按钮（编辑/删除/启用禁用）增加视觉噪音
- **前端右侧**：表格缺少复选框/ID 列，日期显示原始 ISO 字符串，操作列按钮换行影响整洁度，列头排序功能在此场景下无实际意义
- **分页控件**：前端有 el-pagination 但 API 不消费 page/pageSize 参数，属于"假分页"

技术栈约束：NestJS + Prisma + MySQL（后端），Vue 3 + Element Plus + TypeScript（前端），monorepo 结构。

## Goals / Non-Goals

**Goals:**
- 后端字典类型列表接口支持真正的服务端分页
- 前端 UI 全面对齐参考设计（紧凑左侧 + 增强右侧表格）
- 操作交互简化：左侧纯选择、右侧工具栏集中操作入口
- 表格信息密度提升：复选框/ID/标签类型/状态/格式化日期

**Non-Goals:**
- 不改 Redis 缓存策略或公开查询 API
- 不改 DictSelect / DictTag 公共组件
- 不做响应式适配（仅桌面端）
- 不加后端排序参数（移除前端 sortable 即可）

## Decisions

### D1: 分页参数使用字符串类型 DTO 字段

**决策**: DictTypeQueryDto 中 `page` / `pageSize` 使用 `string` 类型而非 `number`

**理由**: NestJS `@Query()` 装饰器从 URL 提取的值始终为字符串。若用 `@IsInt()` 校验 number 类型，会导致 `"1" !== 1` 的 400 错误。将类型校验下沉到 Service 层用 `parseInt` 转换 + `Math.max/min` 边界约束更可靠。

**备选方案**: 使用 ParseIntPipe 全局管道 — 但需要额外配置且影响范围过大，当前方案改动最小。

### D2: Service 层并行查询 list + total

**决策**: 使用 `Promise.all([findMany, count])` 并行执行

**理由**: Prisma 的 findMany 和 count 是独立查询，无依赖关系。串行执行会增加 ~1 次 RTT 并行化可减少总耗时约 40%。

### D3: 左侧列表项移除所有操作按钮

**决策**: 左侧面板仅保留「选择」单一交互

**理由**: 参考图（Snow Cool Admin）的字典管理左侧为纯导航列表，操作集中在右侧工具栏。这降低了认知负荷——左侧「选什么」，右侧「做什么」。编辑/删除字典类型的操作可通过其他入口（如右键菜单）后续补充。

### D4: 操作列使用 link 按钮替代 plain 按钮

**决策**: 编辑/删除使用 `<el-button link>` 替代 `<el-button plain>`

**理由**: plain 按钮 padding 较宽（~32px × 28px），3 个按钮横向排列在 180px 宽度内会换行。link 按钮文字宽度自适应，两个按钮（编辑+删除）在 160px 内不换行。

### D5: 日期在前端 formatTime 格式化

**决策**: 新增 `formatTime()` 工具函数在前端渲染时格式化，不改后端返回值

**理由**: 保持 API 返回原始 ISO 字符串的通用性，让各消费者自行决定展示格式。如需统一格式可在后续引入 dayjs/fns 库。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **API Breaking Change**: getDictTypeList 返回值从数组变为对象 | 其他调用方需同步适配 | 项目内唯一调用点即 dictionary/index.vue，已同步修改 |
| **假分页残留**: 前端其他地方可能依赖旧签名 | TypeScript 编译期可捕获 | PaginatedResult 泛型确保类型安全 |
| **ElScrollbar 在某些浏览器兼容性** | 滚动条美化失效降级为原生滚动 | ElScrollbar 是 Element Plus 核心组件，主流浏览器均支持 |
| **移除 sortable 后用户无法本地排序** | 表体验丢失排序能力 | 数据量小无需排序；大数据量应由后端排序 |
