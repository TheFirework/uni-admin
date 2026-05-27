## Context

### 当前状态

uni-admin 是一个基于 NestJS + Vue 3 + Prisma + MySQL + Redis 的单体后台管理系统。当前字典功能存在以下问题：

1. **数据模型缺陷**：仅有一个扁平的 `Dictionary` 单表（type + label + value），无法独立管理字典类型（启用/禁用/删除分类）、缺少软删除、审计字段、系统内置保护
2. **后端缺失**：无独立的 DictionaryModule/Controller/Service，仅有 Seeder 种子数据初始化，无法通过 API 管理字典
3. **前端空壳**：`views/system/dictionary/index.vue` 为骨架代码，所有 CRUD 都是 TODO/模拟数据
4. **无缓存机制**：字典是高频读取场景（前端下拉框、表格状态翻译等），每次都查数据库

### 技术约束

- 必须兼容现有架构：NestJS 模块化、Prisma ORM、RedisCacheService、class-validator DTO、Swagger 文档
- 前端使用 Vue 3 Composition API + Element Plus + TypeScript
- 已有 `@Public()` 装饰器可用于跳过 JWT 认证
- 菜单系统基于数据库动态路由生成

## Goals / Non-Goals

**Goals:**
- 构建主从表分离的企业级字典数据模型（sys_dict_type + sys_dict_data）
- 实现完整的后端 CRUD API（管理接口需认证 + 公开查询接口免认证）
- 接入 Redis 缓存加速高频查询（TTL 5分钟）
- 实现左右分栏的前端字典管理页面
- 提供 DictSelect / DictTag 可复用组件供业务页面使用
- 安全迁移旧表数据到新结构

**Non-Goals:**
- 不实现多租户（tenant_id）——与现有模型保持一致
- 不实现国际化（language 字段）——后续按需扩展
- 不实现独立审计表（sys_dict_audit）——仅保留基础审计时间戳字段
- 不实现导入导出功能 —— 留到第二期增强
- 不实现 Prisma Middleware 统一软删除 —— 第一阶段在 Service 层手动过滤

## Decisions

### 决策 1: 主从表设计（带物理外键约束）

**选择**: sys_dict_type（类型主表）+ sys_dict_data（数据从表），使用 Prisma @relation 定义关系并生成**物理外键约束**保证引用完整性

**替代方案考虑**:
- 方案 A（原设计）: 无物理外键 → 更灵活但需应用层保证数据一致性
- 方案 C：单表 JSON 字段 → 查询灵活性差，无法单独索引字典项

**理由**: 
经实施验证，物理外键在字典场景下的优势：
- ✅ **更强的数据完整性保护**：数据库层面防止孤儿记录
- ✅ **Seeder 兼容性良好**：upsert 逻辑可正确处理依赖顺序（先插入主表再插入从表）
- ✅ **不影响批量操作**：当前业务场景的导入导出频率低，外键约束开销可接受
- ✅ **未来可移除**：如需更高灵活性，可通过迁移轻松删除外键约束
- ⚠️ **注意事项**：批量导入时需确保 sys_dict_type 中存在对应的 dictCode 记录

**实施结果**: [migration.sql:76](../../../apps/server/prisma/migrations/20260526061149_sync_schema_changes/migration.sql#L76) 创建了 `sys_dict_data_dict_code_fkey` 外键约束（ON DELETE RESTRICT, ON UPDATE CASCADE）

### 决策 2: Service 层软删除（非 Middleware）

**选择**: 在 DictionaryService 中每个查询方法显式添加 `where: { isDeleted: 0 }` 条件，删除操作改为 `update({ data: { isDeleted: 1 } })`

**替代方案考虑**:
- 方案 B：Prisma Middleware 全局拦截 → 一劳永逸但调试困难、影响范围不透明

**理由**: 字典模块只有两个模型，手动过滤代码清晰可控。后续如果项目模型增多可统一重构为 Middleware。

### 决策 3: 公开查询接口无需认证

**选择**: `/api/public/dict/*` 路由下的查询接口完全公开，不需要 JWT Token

**替代方案考虑**:
- 方案 B：需要登录才能访问 → 多一层安全防护但增加前端初始化复杂度

**理由**: 字典属于配置型数据（状态码、分类等），不含敏感信息。公开访问可简化前端调用（页面加载时无需等待登录即可获取字典数据渲染下拉框）。使用已有的 `@Public()` 装饰器实现。

### 决策 4: Redis 缓存 Key 设计 + invalidatePattern 失效

**选择**:
- Key 格式：`dict:data:{dictCode}` 存储字典项数组，TTL=300s
- 写操作（增删改）后调用 `redisCache.invalidatePattern('dict:*')` 清除所有字典缓存
- 查询未命中时查库并回填缓存；空结果缓存空数组 TTL=60s 防穿透

**替代方案考虑**:
- 方案 B：精确清除单个 dictCode → 需要追踪每个 type 对应哪些 code，复杂度高
- 方案 C：事件驱动缓存更新 → 引入消息队列，过度设计

**理由**: 字典数据量小（通常每个编码 < 50 项），全量清除开销极低（< 1ms），简单可靠。

### 决策 5: 扩展字段 tag_type

**选择**: 在 sys_dict_data 表中新增 `tag_type` 字段（varchar(20)），存储 Element Plus el-tag 的 type 属性值（success/danger/warning/info/primary）

**理由**: 企业应用中状态列通常需要颜色区分（启用=绿色、禁用=红色），硬编码在前端不利于维护。配置化后运营人员可直接调整。

### 决策 6: 前端左右分栏布局

**选择**: 左侧为字典类型列表（可搜索、显示状态），右侧为选中类型的字典数据管理区（CRUD 表格 + 新增表单）

**替代方案考虑**:
- 方案 B：列表 + 详情页跳转 → 操作路径长，用户体验差
- 方案 C：Tab 切换 → 不适合多类型场景

**理由**: 字典管理的核心操作流就是"选类型 → 管理该类型下的数据项"，Master-Detail 是最自然的交互模式。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 数据迁移过程中旧表数据丢失 | 高 | 迁移脚本执行前先验证旧表数据完整性，迁移后对比行数确认 |
| invalidatePattern 使用 KEYS 命令在大数据量时阻塞 Redis | 低 | 字典缓存 Key 数量极少（< 100），KEYS 无性能问题 |
| 公开接口被恶意频繁调用 | 中 | Redis 缓存命中后不打库；后续可加 Rate Limit 中间件 |
| 软删除数据累积导致查询变慢 | 低 | 后续可加定期清理任务或归档脚本 |
| 前端 DictSelect 组件重复请求同一字典 | 低 | 组件内部做请求去重/单例缓存 |

## Migration Plan

### 部署步骤

1. **代码部署**: 合并包含新模型的代码分支
2. **Database Migration**: 执行 `npx prisma migrate deploy`
   - 创建 sys_dict_type 和 sys_dict_data 新表
   - 将旧 dictionary 表数据聚合插入新表
   - 删除旧 dictionary 表
3. **Seed 更新**: 运行 `npm run seed` 更新种子数据
4. **验证**: 检查字典管理页面正常加载和操作

### 回滚策略

1. Prisma migration 支持 `migrate resolve --rolled-back` 回滚
2. 如紧急回滚：恢复代码到上一版本 → 执行向下 migration → 旧 Dictionary 模型自动恢复
3. 旧表数据在迁移前可通过 `CREATE TABLE dictionary_backup AS SELECT * FROM dictionary` 手动备份

## Open Questions

（无待决问题，所有关键决策已在 Explore 阶段确认）
