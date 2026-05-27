# dict-data-migration Specification

## Purpose
TBD - created by archiving change enterprise-dict-module. Update Purpose after archive.
## Requirements
### Requirement: Prisma Schema 迁移
系统 SHALL 创建新的 Prisma migration，包含：创建 sys_dict_type 和 sys_dict_data 两张新表、将旧 dictionary 表数据迁移到新结构、删除旧 dictionary 表。

#### Scenario: 新表创建
- **WHEN** 执行 migration
- **THEN** 数据库中创建 sys_dict_type 表（含 id, dict_code, dict_name, status, is_system, remark, create_by, created_at, update_by, updated_at, is_deleted 字段和索引）和 sys_dict_data 表（含 id, dict_code, dict_label, dict_value, tag_type, sort, status, remark, create_by, created_at, update_by, updated_at, is_deleted 字段和索引）

#### Scenario: 旧表数据聚合迁移
- **WHEN** 执行 migration 中的数据转换 SQL
- **THEN** 旧 dictionary 表中的 type 字段去重后插入 sys_dict_type（dict_code=type, dict_name 映射为中文名称, is_system=1, status=1）；旧表中每行数据插入 sys_dict_data（dict_code=type, dict_label=label, dict_value=value）

#### Scenario: 旧表删除
- **WHEN** 数据迁移完成且验证无误
- **THEN** 旧 dictionary 表从数据库中 DROP

#### Scenario: 迁移数据量验证
- **WHEN** migration 执行完毕
- **THEN** sys_dict_type 行数 = 旧表 type 去重数（预期 3 行：user_status/menu_type/gender）；sys_dict_data 行数 = 旧表总行数（预期 8 行）

### Requirement: Seeder 适配新结构
系统 SHALL 更新 DictionarySeeder 以适配新的主从表结构，初始化种子数据时写入 sys_dict_type 和 sys_dict_data。

#### Scenario: Seeder 初始化字典类型
- **WHEN** 执行 seed 命令
- **THEN** Seeder 向 sys_dict_type 插入用户状态、菜单类型、性别三个系统内置字典类型（is_system=1）

#### Scenario: Seeder 初始化字典数据
- **WHEN** 执行 seed 命令
- **THEN** Seeder 向 sys_dict_data 为每个类型插入预定义的字典项数据（启用/禁用、目录/菜单/按钮、男/女/未知）

#### Scenario: 幂等执行
- **WHEN** 多次执行 seed 命令
- **THEN** 使用 upsert 逻辑避免重复插入，已存在的数据不被覆盖或报错

### Requirement: Schema 旧模型清理
系统 SHALL 从 Prisma schema.prisma 中移除旧的 Dictionary 模型定义。

#### Scenario: 移除旧模型
- **WHEN** 代码变更合并完成
- **THEN** schema.prisma 中不再包含 `model Dictionary { ... }` 定义，仅保留 SysDictType 和 SysDictData 两个模型

