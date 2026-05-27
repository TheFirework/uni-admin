## Why

当前系统的字典模块仅有一个简单的单表 `Dictionary`（扁平结构：type + label + value），缺少独立的字典类型管理、缓存机制、软删除、审计追踪等企业级能力。后端无独立字典模块（仅有 Seeder 种子数据），前端页面为骨架代码（TODO/模拟数据），无法支撑生产环境的字典管理需求。需要构建一套**主从表分离、Redis 缓存加速、前后端完整闭环**的企业级字典模块。

## What Changes

### 数据层
- **BREAKING**: 移除旧 `Dictionary` 单表模型，替换为 **sys_dict_type（字典类型主表）+ sys_dict_data（字典数据从表）** 主从表结构
- 新增字段：`is_system`（系统内置保护）、`is_deleted`（软删除）、`tag_type`（标签颜色类型）、审计时间戳（create_by/update_by/create_time/update_time）
- 编写 Prisma 迁移脚本，将旧表数据自动转换到新表结构后删除旧表

### 后端 (NestJS)
- 新增 `dictionary` 模块：DictionaryModule / DictionaryController / DictionaryService
- **管理接口**（需 JWT 认证）：字典类型 CRUD、字典数据 CRUD、启用/禁用操作
- **查询接口**（完全公开，无需认证）：按编码查字典项、按值翻译标签、批量查询
- 接入已有 RedisCacheService 实现字典缓存（TTL 5分钟，写操作时 invalidatePattern 清除）
- 系统内置字典保护逻辑（is_system=1 禁止删除/修改编码）
- 更新 Seeder 适配新的主从表结构

### 前端 (Vue 3 + Element Plus)
- 重构字典管理页面为**左右分栏 Master-Detail 布局**（左侧类型列表 + 右侧数据管理）
- 实现字典类型的增删改查、搜索、启用/禁用
- 实现字典数据的批量维护、排序、tag_type 配置
- 新增 **DictSelect** 可复用组件（传入 dictCode 自动渲染下拉框）
- 新增 **DictTag** 组件（传入 dictCode + value 自动渲染带颜色的标签）
- 新增前端 API 层接口函数

### 路由 & 菜单
- 更新菜单 seeder，确保字典管理菜单正确注册

## Capabilities

### New Capabilities
- `dict-type-management`: 字典类型管理能力——包含类型的增删改查、启用/禁用、列表查询、系统内置保护
- `dict-data-management`: 字典数据管理能力——包含字典项的增删改查、排序、tag_type 配置、按类型筛选
- `dict-query-api`: 字典公开查询 API——包含按编码查询字典项、按值翻译标签、批量查询，接入 Redis 缓存，无需认证
- `dict-frontend-components`: 前端字典组件——DictSelect 下拉选择器、DictTag 标签渲染组件、左右分栏管理页面
- `dict-data-migration`: 数据迁移能力——将旧 dictionary 单表数据迁移至 sys_dict_type + sys_dict_data 主从表结构

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

### 受影响的代码文件
| 层级 | 文件 | 变更类型 |
|------|------|----------|
| Prisma Schema | `apps/server/prisma/schema.prisma` | 删除 Dictionary 模型，新增 SysDictType + SysDictData |
| Migration | `apps/server/prisma/migrations/` | 新增迁移 SQL（建表 + 数据迁移 + 删旧表） |
| 后端模块 | `apps/server/src/modules/dictionary/` | **新增目录**：controller/service/module/dto |
| 后端注册 | `apps/server/src/app.module.ts` | 注册 DictionaryModule |
| Seeder | `apps/server/src/seeders/modules/dictionary.seeder.ts` | 重写适配主从表结构 |
| 前端页面 | `apps/web/src/views/system/dictionary/index.vue` | 重写为左右分栏布局 |
| 前端 API | `apps/web/src/api/modules/system.api.ts` | 新增字典相关接口函数 |
| 前端组件 | `apps/web/src/components/DictSelect.vue` 等 | **新增**可复用字典组件 |
| 菜单 Seeder | `apps/server/src/seeders/modules/menu.seeder.ts` | 确认字典菜单配置 |

### 受影响的 API
| 接口 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/system/dict/type/list` | GET | JWT | 查询字典类型列表 |
| `/api/system/dict/type` | POST | JWT | 新增字典类型 |
| `/api/system/dict/type/:id` | PUT | JWT | 修改字典类型 |
| `/api/system/dict/type/:id` | DELETE | JWT | 删除字典类型（软删除） |
| `/api/system/dict/type/:id/status` | PUT | JWT | 启用/禁用字典类型 |
| `/api/system/dict/data/list` | GET | JWT | 查询字典数据列表（支持 dictCode 筛选） |
| `/api/system/dict/data` | POST | JWT | 新增字典数据 |
| `/api/system/dict/data/:id` | PUT | JWT | 修改字典数据 |
| `/api/system/dict/data/:id` | DELETE | JWT | 删除字典数据（软删除） |
| `/api/public/dict/:dictCode` | GET | 公开 | 按编码查询所有可用字典项（缓存） |
| `/api/public/dict/:code/:value` | GET | 公开 | 按编码+值翻译为标签（缓存） |
| `/api/public/dict/batch` | GET | 公开 | 批量查询多个字典（缓存） |

### 依赖变更
- **新增依赖**: 无（使用项目已有的 prisma、redis-cache-service、class-validator、swagger）
- **移除依赖**: 无

### 回滚计划
1. 保留旧 `Dictionary` Prisma 模型注释备份在 schema 中
2. 迁移脚本执行前自动创建旧表数据快照
3. 如需回滚：恢复旧 Dictionary 模型 → 执行反向 migration → 还原Seeder
