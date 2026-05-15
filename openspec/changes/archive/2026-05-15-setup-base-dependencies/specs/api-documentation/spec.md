## ADDED Requirements

### Requirement: Swagger + Knife4j 文档集成
系统 MUST 集成 @nestjs/swagger 和 nest-knife4j，提供交互式 API 文档界面。

**文档访问路径**:
- 开发环境: `http://localhost:{port}/api/doc.html`（Knife4j 默认路径）
- 生产环境: 可通过环境变量 `enableSwagger` 控制（默认关闭）

**文档元数据**:
- 标题: "Uni-Admin API"
- 描述: "管理后台 RESTful API 文档"
- 版本: 从环境变量 `buildVersion` 读取
- 认证方式: Bearer Token (JWT)

#### Scenario: 启动服务后访问文档页面
- **WHEN** 开发环境启动 NestJS 服务（enableSwagger=true）
- **AND** 用户访问 `/api/doc.html`
- **THEN** 页面 MUST 显示 Knife4j 增强 UI（左侧分组导航、右侧文档详情）
- **AND** 顶部显示 API 标题和版本号
- **AND** 右上角显示"授权"按钮（输入 Bearer Token）

#### Scenario: 查看接口详情
- **WHEN** 用户点击某个 Controller 分组（如 Auth）
- **AND** 展开某个接口（如 POST /auth/login）
- **THEN** 页面 MUST 显示完整的请求/响应示例
- **AND** 包含请求参数说明（字段名、类型、是否必填、示例值）
- **AND** 包含响应状态码说明（200、400、401、403、500）
- **AND** 包含响应体 JSON Schema

#### Scenario: 在线调试接口
- **WHEN** 用户在文档页面点击"调试"按钮
- **AND** 输入请求参数和 Bearer Token
- **THEN** 系统 MUST 发送真实请求到后端
- **AND** 返回实际的响应结果和状态码
- **AND** 显示请求耗时（单位：毫秒）

#### Scenario: 导出离线文档
- **WHEN** 用户点击"离线文档"按钮
- **THEN** 系统 MUST 下载 Markdown 或 HTML 格式的完整 API 文档
- **AND** 文档包含所有接口的详细说明（可用于团队分享或存档）

---

### Requirement: Swagger 装饰器标准化
系统 MUST 在所有 Controller 和 DTO 中使用标准的 Swagger 装饰器，确保文档自动生成且准确。

**必需装饰器**:
- Controller: `@ApiTags()`, `@ApiBearerAuth()`, `@ApiOperation()`
- DTO: `@ApiProperty()`, `@ApiPropertyOptional()`, `@ApiResponse()`

#### Scenario: 自动生成接口文档
- **WHEN** 开发者在 Controller 方法上添加 `@ApiOperation({ summary: '用户登录' })`
- **AND** 在 DTO 类中使用 `@ApiProperty({ example: 'admin' })`
- **THEN** Swagger Module MUST 在启动时自动扫描并生成 OpenAPI 3.0 规范
- **AND** 文档 MUST 反映最新的代码变更（无需手动维护）

#### Scenario: 分组显示接口
- **WHEN** 不同模块的 Controller 使用不同的 `@ApiTags('Auth')`, `@ApiTags('User')`
- **THEN** Knife4j UI MUST 左侧按 Tag 分组显示接口列表
- **AND** 支持搜索过滤（按接口名称或路径模糊匹配）
