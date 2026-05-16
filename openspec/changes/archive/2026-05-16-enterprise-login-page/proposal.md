## Why

当前登录页面是一个占位实现，使用 `setTimeout` 模拟 API 调用，未集成后端认证系统、验证码功能和企业级安全特性。这导致：

- 无法完成真实的用户认证流程
- 缺乏防暴力破解机制（验证码）
- 不符合企业级管理后台的安全和用户体验标准

**为什么现在做？**
后端认证服务（JWT 双 Token、Redis 存储、验证码接口）已完全就绪，前端请求封装库（@uni-admin/request）已支持自动 Token 管理和错误处理，现在实现完整登录页面的时机已成熟。

**当前状态：已全部实现 ✅**

---

## What Changes (已完成)

### 新增功能 ✅

- **完整的用户认证流程**：调用真实 `auth.api.login()` 接口，替换 `setTimeout` 模拟
- **图形验证码集成**：
  - 后端实现 `GET /auth/captcha` 接口（svg-captcha + Redis 存储）
  - 前端条件显示验证码（首次失败后显示）
  - 支持点击刷新验证码
- **企业级表单验证**：使用 vee-validate + Zod Schema 实现类型安全的表单校验
- **"记住我"功能**：使用浏览器原生 Credential Management API
- **专业的 UI/UX 设计**：左右分栏布局、现代简约视觉风格、响应式适配移动端
- **完善的错误处理**：
  - 分类友好提示（网络错误、凭证错误、验证码错误等）
  - 不重复提示（login 接口设置 `showError: false`）
  - 不刷新页面（login 接口设置 `skipAuthRedirect: true`）
- **Loading 状态管理**：按钮禁用、防止重复提交

### 修改内容 ✅

#### 前端修改

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/views/login/index.vue` | **重写** | 完整的企业级登录组件 |
| `apps/web/src/stores/auth.store.ts` | **新增** | Pinia 认证状态管理 |
| `apps/web/src/api/modules/auth.api.ts` | **修改** | 添加 showError/skipAuthRedirect 配置 |

#### 后端修改

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/server/src/modules/auth/dto/captcha.dto.ts` | **新增** | 验证码响应 DTO |
| `apps/server/src/modules/auth/dto/login.dto.ts` | **修改** | 添加 captcha/captchaKey 字段 |
| `apps/server/src/modules/auth/auth.service.ts` | **修改** | 添加 generateCaptcha/validateCaptcha 方法 |
| `apps/server/src/modules/auth/auth.controller.ts` | **修改** | 添加 GET /auth/captcha 接口 |
| `apps/server/src/common/filters/http-exception.filter.ts` | **修改** | code 改为数字格式 |

#### HTTP 封装层修改

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/request/src/middlewares/error.ts` | **修改** | 支持 skipAuthRedirect 配置 |
| `packages/request/src/types/options.ts` | **修改** | 添加 skipAuthRedirect 类型定义 |
| `packages/request/src/managers/TokenManager.ts` | **修改** | 防御性检查 |
| `packages/request/src/managers/CancelManager.ts` | **修改** | 补充缺失属性 |
| `packages/request/tsup.config.ts` | **修改** | 修复构建配置 |

### 移除/废弃

- ❌ 移除 `setTimeout` 模拟代码
- ❌ 移除 Element Plus 内置表单验证（改用 vee-validate）

### 新增依赖

```json
// apps/server/package.json
{
  "dependencies": {
    "svg-captcha": "^1.8.0"  // SVG 验证码生成库
  }
}
```

---

## Capabilities

### New Capabilities ✅

- **enterprise-login**: 企业级登录页面的完整实现
- **captcha-service**: 图形验证码服务（生成 + 验证 + Redis 存储）
- **skip-auth-redirect**: HTTP 客户端配置选项（区分业务 401 和认证 401）

### Modified Capabilities

- **jwt-auth**: LoginDto 扩展支持验证码字段
- **request-token**: TokenManager 增强（防御性检查）
- **error-handling**: 异常过滤器优化（code 数字格式）

---

## Impact

### 受影响的代码模块

```
apps/web/
  └── src/
      ├── views/login/index.vue          # ✅ 重写完成
      ├── api/modules/auth.api.ts        # ✅ 修改完成
      └── stores/auth.store.ts           # ✅ 新增完成

apps/server/
  └── src/
      └── modules/auth/
          ├── dto/captcha.dto.ts         # ✅ 新增完成
          ├── dto/login.dto.ts           # ✅ 扩展完成
          ├── auth.service.ts            # ✅ 修改完成
          └── auth.controller.ts         # ✅ 修改完成

packages/request/
  └── src/
      ├── middlewares/error.ts           # ✅ skipAuthRedirect
      ├── types/options.ts              # ✅ 类型扩展
      ├── managers/TokenManager.ts      # ✅ 防御性检查
      ├── managers/CancelManager.ts     # ✅ 属性补全
      └── tsup.config.ts                # ✅ 构建修复
```

### 受影响的 API 接口

- `POST /auth/login` - 用户登录（支持可选的 captcha/captchaKey 字段）
- `GET /auth/captcha` - 获取验证码图片（**新增**）
- `POST /auth/logout` - 用户登出（无变更）
- `POST /auth/refresh-token` - 刷新 Token（无变更）

### 响应格式变更

**统一使用数字 code 格式**：

```json
// 成功
{ "code": 200, "message": "...", "data": {...} }

// 业务错误
{ "code": 422, "message": "密码必须包含至少一个大写字母..." }
{ "code": 401, "message": "用户名或密码错误" }

// 服务器错误
{ "code": 500, "message": "服务器内部错误" }
```

---

## 测试验证清单

### 功能测试 ✅

- [x] 正常登录流程：输入正确凭证 → 成功跳转
- [x] 空字段验证：不填写直接提交 → 显示必填错误
- [x] 错误凭证处理：输入错误密码 → 显示错误 + 验证码出现
- [x] 验证码流程：显示 → 输入 → 刷新 → 重新输入
- [x] 记住我功能：勾选 → Tooltip 显示帮助文本
- [x] 忘记密码：点击链接 → 显示 ElMessage.info 提示
- [x] Loading 状态：点击 → 按钮禁用 → 请求完成 → 恢复
- [x] 网络断开测试：断网 → 提示网络错误 → 恢复后重试成功
- [x] **不刷新页面**：登录失败后保持在当前页面
- [x] **不重复提示**：只显示一个错误消息
- [x] **Code 是数字**：所有接口返回数字格式的 code

### UI 测试 ✅

- [x] 左右分栏布局正常显示（桌面端）
- [x] 移动端堆叠布局正常显示（<992px）
- [x] 输入框有清晰的边框
- [x] hover/focus 状态正确显示
- [x] 验证码图片正常加载和显示
- [x] 点击验证码可刷新
- [x] 品牌区图标和文字正常显示

---

## 回滚计划

如果新版本出现问题，可以快速回滚：

1. Git revert 相关提交即可恢复到旧的占位登录页面
2. 后端 API 受影响较小（主要是新增 captcha 接口）
3. @uni-admin/request 包需要重新发布旧版本
4. 建议回滚时间窗口：< 10 分钟
