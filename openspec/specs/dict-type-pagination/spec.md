# dict-type-pagination Specification

## Purpose
定义字典类型列表接口的服务端分页查询能力，包括参数规范、边界约束、与搜索的组合行为。

## Requirements

### Requirement: 分页查询
字典类型列表接口 SHALL 支持服务端分页查询，返回分页结果对象而非全量数组。

#### Scenario: 默认分页查询
- **WHEN** 前端调用 `GET /api/system/dict/type/list` 不传分页参数
- **THEN** 后端默认返回第 1 页、每页 10 条的分页结果 `{ list, total }`

#### Scenario: 指定页码和每页条数
- **WHEN** 前端传入 `?page=2&pageSize=20`
- **THEN** 后端返回第 2 页、每页 20 条的数据，total 为匹配条件的总记录数

#### Scenario: 分页参数边界约束
- **WHEN** 前端传入非法分页参数（如 `page=0`, `page=-1`, `pageSize=999`）
- **THEN** 后端自动修正：page 最小值为 1，pageSize 限制在 1-100 之间

#### Scenario: 分页与搜索组合
- **WHEN** 前端同时传入 keyword 和 page/pageSize 参数
- **THEN** 后端先按 keyword 过滤，再对过滤结果进行分页，total 为过滤后的总数
