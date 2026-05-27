## 1. 数据层：Prisma Schema 与迁移

- [x] 1.1 在 `apps/server/prisma/schema.prisma` 中新增 `SysDictType` 模型（id, dictCode, dictName, status, isSystem, remark, createBy, createdAt, updateBy, updatedAt, isDeleted + 虚拟关系 dictData）
- [x] 1.2 在 `apps/server/prisma/schema.prisma` 中新增 `SysDictData` 模型（id, dictCode, dictLabel, dictValue, tagType, sort, status, remark, createBy, createdAt, updateBy, updatedAt, isDeleted）
- [x] 1.3 删除 schema.prisma 中旧的 `Dictionary` 模型定义
- [x] 1.4 执行 `npx prisma migrate dev --name enterprise_dict_tables` 生成迁移文件
- [x] 1.5 编辑生成的 migration SQL，追加数据迁移逻辑（旧 dictionary 表 → 聚合插入 sys_dict_type → 逐行插入 sys_dict_data → DROP 旧表）
- [x] 1.6 执行 `npx prisma generate` 更新 Prisma Client

## 2. 后端：DTO 定义

- [x] 2.1 创建 `apps/server/src/modules/dictionary/dto/type.dto.ts`：CreateDictTypeDto、UpdateDictTypeDto、DictTypeQueryDto、ToggleStatusDto（含 class-validator 校验装饰器）
- [x] 2.2 创建 `apps/server/src/modules/dictionary/dto/data.dto.ts`：CreateDictDataDto、UpdateDictDataDto、DictDataQueryDto

## 3. 后端：Service 层

- [x] 3.1 创建 `apps/server/src/modules/dictionary/dictionary.service.ts` 基础结构，注入 PrismaService 和 RedisCacheService
- [x] 3.2 实现字典类型 CRUD 方法：findTypeList / findTypeById / createType / updateType / deleteType（软删除 is_deleted=1，查询过滤 is_deleted=0）
- [x] 3.3 实现字典类型启用/禁用方法 toggleTypeStatus，含系统内置保护逻辑（is_system=1 禁止删除/改编码）
- [x] 3.4 实现字典数据 CRUD 方法：findDataList / createData / updateData / deleteData（软删除），查询支持按 dictCode 筛选
- [x] 3.5 实现公开查询方法：getItemsByCode（缓存 key=dict:data:{code}）、getLabelByValue（翻译）、getBatchItems（批量查询）
- [x] 3.6 实现缓存读写与失效逻辑：查询未命中时查库回填，写操作后 invalidatePattern('dict:*') 清除

## 4. 后端：Controller 层

- [x] 4.1 创建 `apps/server/src/modules/dictionary/dictionary.controller.ts`：管理接口部分（前缀 `/api/system/dict`），使用 @ApiTags、@UseGuards(JwtAuthGuard)、@ApiBearerAuth()
- [x] 4.2 实现字典类型管理接口：GET type/list、POST type、PUT type/:id、DELETE type/:id、PUT type/:id/status
- [x] 4.3 实现字典数据管理接口：GET data/list、POST data、PUT data/:id、DELETE data/:id
- [x] 4.4 在 Controller 中新增公开查询接口（前缀 `/api/public/dict`），使用 @Public() 装饰器跳过认证
- [x] 4.5 实现公开查询接口：GET :dictCode、GET :code/:value、GET batch

## 5. 后端：模块注册

- [x] 5.1 创建 `apps/server/src/modules/dictionary/dictionary.module.ts`，注册 Controller、Service、PrismaService、RedisCacheService
- [x] 5.2 在 `apps/server/src/app.module.ts` 的 imports 中加入 DictionaryModule

## 6. 后端：Seeder 更新

- [x] 6.1 重写 `apps/server/src/seeders/modules/dictionary.seeder.ts`，适配主从表结构（先 upsert sys_dict_type，再批量 insert sys_dict_data）

## 7. 前端：API 层

- [x] 7.1 在 `apps/web/src/api/modules/system.api.ts` 中新增字典管理接口函数：getDictTypeList、createDictType、updateDictType、deleteDictType、toggleDictTypeStatus
- [x] 7.2 新增字典数据管理接口函数：getDictDataList、createDictData、updateDictData、deleteDictData
- [x] 7.3 新增公开查询接口函数：getDictItems、getDictLabel、getDictBatch（替换旧的 getDictList）

## 8. 前端：可复用组件

- [x] 8.1 创建 `apps/web/src/components/DictSelect.vue`：接收 dictCode prop，自动加载选项渲染 el-select，支持 v-model、placeholder、disabled、clearable、filterable，内部请求去重
- [x] 8.2 创建 `apps/web/src/components/DictTag.vue`：接收 dictCode + value props，渲染 el-tag（type 来自 tagType），无匹配时回退显示原值

## 9. 前端：字典管理页面

- [x] 9.1 重构 `apps/web/src/views/system/dictionary/index.vue` 为左右分栏布局（el-row + el-col :span="8" / :span="16"）
- [x] 9.2 实现左侧面板：搜索框 + 字典类型列表（el-menu 或自定义列表），点击切换选中状态，高亮当前项
- [x] 9.3 实现右侧面板：顶部显示当前类型名称 + "新增字典项"按钮，下方为 el-table 数据列表（列：标签、存储值、标签类型、排序、状态、操作）
- [x] 9.4 实现右侧新增/编辑对话框（el-dialog + el-form），包含 dictLabel、dictValue、tagType（el-select 选 success/danger/warning/info）、sort、remark 字段
- [x] 9.5 实现删除确认（ElMessageBox.confirm）和启用/禁用切换功能
- [x] 9.6 实现左侧"新增字典类型"对话框（dictCode、dictName、remark）

## 10. 验证与集成

- [x] 10.1 执行 `npx prisma migrate dev` 验证数据库迁移成功
- [x] 10.2 执行 `npm run seed` 验证种子数据正确写入新表
- [x] 10.3 启动后端服务，用 Swagger 文档测试所有管理接口和公开接口
- [x] 10.4 启动前端服务，验证字典管理页面左右分栏正常展示和操作（需手动登录浏览器验证）
- [x] 10.5 验证 DictSelect 组件在页面中正常使用，DictTag 组件正确渲染带颜色标签（需手动登录浏览器验证）
