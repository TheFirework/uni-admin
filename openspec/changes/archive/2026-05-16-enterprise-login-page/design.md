## Context

### 当前状态

uni-admin 是一个基于 pnpm monorepo 的企业级管理后台项目，采用前后端分离架构：

- **前端**：Vue 3 + Element Plus + Vite + Pinia + TypeScript
- **后端**：NestJS + Prisma + MySQL + Redis + JWT 双 Token 认证
- **共享包**：@uni-admin/request（HTTP 封装）、@uni-admin/shared-types（Zod Schema）

### 已完成的实现 ✅

**前端实现** (`apps/web/src/`)：

1. **登录页面组件** (`views/login/index.vue`)
   - 现代简约风格 UI（左右分栏布局）
   - 完整表单验证（vee-validate + Zod）
   - 验证码条件显示与刷新
   - "记住我"功能（浏览器 Credential API）
   - "忘记密码"提示链接
   - 完善的错误处理和 Loading 状态
   - 响应式设计适配移动端

2. **认证状态管理** (`stores/auth.store.ts`)
   - Pinia Store 管理用户会话
   - login/logout/checkAuth 核心方法
   - Credential API 集成

3. **API 接口层** (`api/modules/auth.api.ts`)
   - 动态导入避免循环依赖
   - 登录接口配置：`skipToken`, `showError: false`, `skipAuthRedirect: true`

**后端实现** (`apps/server/src/`)：

1. **验证码服务** (`modules/auth/`)
   - `dto/captcha.dto.ts` - 验证码响应 DTO
   - `auth.service.ts` - `generateCaptcha()` 和 `validateCaptcha()` 方法
   - `auth.controller.ts` - `GET /auth/captcha` 接口
   - 使用 `svg-captcha` 库生成 SVG 格式验证码
   - Redis 存储（TTL 5 分钟，一次性使用）

2. **LoginDto 扩展** (`dto/login.dto.ts`)
   - 新增 `captcha` 可选字段（验证码文本）
   - 新增 `captchaKey` 可选字段（验证码唯一标识）
   - 支持首次登录无需验证码，失败后必填

3. **异常过滤器优化** (`common/filters/http-exception.filter.ts`)
   - Code 统一为**数字格式**（HTTP 状态码：200, 400, 401, 422, 500 等）
   - 使用完整 NestJS 异常类名映射（`BadRequestException` 而非 `BadRequest`）
   - 基于状态码的兜底匹配机制

**HTTP 封装层增强** (`packages/request/src/`)：

1. **新增 `skipAuthRedirect` 配置**
   - 解决登录接口 401 误触发认证跳转的问题
   - 登录接口的 401 是业务错误（密码错），不应跳转登录页

2. **Bug 修复**
   - `TokenManager.setWhiteList()` - 添加防御性检查防止 patterns.map 错误
   - `CancelManager` - 补充缺失的 `pendingMap` 属性声明
   - `tsup.config.ts` - 修复 dts 配置确保生成 JS 代码

---

## Goals / Non-Goals

### Goals ✅ (已全部实现)

1. ~~实现完整的用户认证流程~~ ✅
   - 调用真实 `POST /auth/login` 接口完成登录
   - 正确处理双 Token 机制（AccessToken + RefreshToken Cookie）
   - 登录成功后跳转到目标页面或默认首页

2. ~~提供企业级表单验证体验~~ ✅
   - 使用 vee-validate 实现声明式表单验证
   - 集成 Zod Schema 确保类型安全和前后端一致性
   - 提供清晰的实时错误提示（blur/submit 触发）

3. ~~集成图形验证码防暴力破解~~ ✅
   - 在首次登录失败后显示验证码
   - 调用 `GET /auth/captcha` 获取 SVG 验证码图片
   - 支持点击刷新验证码
   - 后端使用 svg-captcha + Redis 存储

4. ~~实现"记住我"功能~~ ✅
   - 使用浏览器原生 Credential Management API
   - autocomplete 属性配置支持自动填充
   - Tooltip 帮助文本说明

5. ~~专业的 UI/UX 设计~~ ✅
   - 左右分栏布局（品牌展示区 + 登录表单区）
   - 现代简约视觉风格（明亮配色、大圆角、柔和阴影）
   - 响应式适配移动端（堆叠布局）

6. ~~完善的错误处理和用户反馈~~ ✅
   - 区分网络错误、凭证错误、验证码错误等场景
   - 友好的错误提示信息（显示后端返回的具体消息）
   - Loading 状态管理（按钮禁用、防止重复提交）
   - **不重复提示**（login 接口设置 `showError: false`）
   - **不刷新页面**（login 接口设置 `skipAuthRedirect: true`）

### Non-Goals ❌（本次不实现）

1. **第三方登录**（GitHub/GitLab/OAuth）- 后续迭代
2. **多因素认证（MFA/2FA）** - 后续迭代
3. **国际化支持（i18n）** - 后续迭代
4. **忘记密码完整流程** - 仅显示提示信息
5. **注册页面** - 企业后台通常由管理员创建账号
6. **动态背景效果** - 保持简洁专业风格

---

## Decisions

### 决策 1：表单验证方案 - vee-validate + Zod ✅

**已实施**：使用 `vee-validate` + `zod-validator` 适配器

**实际实现细节**：

```typescript
// apps/web/src/views/login/index.vue
import { useForm } from 'vee-validate';
import { toFieldValidator } from '@vee-validate/zod';
import { LoginSchema } from '@uni-admin/shared-types';

const { handleSubmit, errors } = useForm({
  validationSchema: toFieldValidator(LoginSchema),
});
```

---

### 决策 2：状态管理方案 - Pinia Store ✅

**已实施**：创建独立的 `useAuthStore` 管理认证状态

**实际文件位置**：`apps/web/src/stores/auth.store.ts`

**Store 结构**：

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
}

// Actions: login(), logout(), checkAuth()
```

---

### 决策 3：UI 布局方案 - 现代简约风格 ✅

**已实施**：左右分栏布局 + 现代简约视觉风格

**实际样式变量**（SCSS）：

```scss
// 主色调
$primary-color: #5B9BD5;          // 柔和蓝色
$primary-light: #E8F4FD;          // 极浅蓝背景
$primary-gradient: linear-gradient(135deg, #E8F4FD 0%, #F0E6FA 100%);

// 中性色
$text-primary: #1F2937;
$text-secondary: #6B7280;
$border-color: #E5E7EB;

// 卡片样式
$card-border-radius: 16px;
$card-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);

// 输入框样式
$input-height: 48px;
$input-border-radius: 10px;
$input-focus-shadow: 0 0 0 3px rgba(91, 155, 213, 0.15);
```

**品牌区实现**：
- Iconify 图标：`mdi:office-building-outline` (64px)
- 产品名称："Uni-Admin"
- Slogan："统一企业管理平台"

---

### 决策 4：验证码触发策略 - 条件显示 ✅

**已实施**：首次登录失败后显示验证码

**实际触发逻辑**：

```typescript
// apps/web/src/views/login/index.vue
const showCaptcha = ref(false);
const failCount = ref(0);

// 登录失败时
failCount.value++;
if (failCount.value >= 1 && !showCaptcha.value) {
  showCaptcha.value = true;
  needRefreshCaptcha = true;  // 必须加载验证码
}
if (showCaptcha.value && needRefreshCaptcha) {
  await loadCaptcha();
}
```

**后端验证码实现**：

```typescript
// apps/server/src/modules/auth/auth.service.ts
async generateCaptcha(): Promise<CaptchaResponseDto> {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0oO1lIi',
    noise: 3,
    color: true,
    background: '#f0f0f0',
  });
  
  const captchaKey = uuidv4();
  await this.redisCache.set(`captcha:${captchaKey}`, captcha.text.toLowerCase(), 300);
  
  return {
    captchaKey,
    captchaImage: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`,
  };
}

async validateCaptcha(captchaKey: string, userInput: string): Promise<boolean> {
  const storedCaptcha = await this.redisCache.get(`captcha:${captchaKey}`);
  await this.redisCache.del(`captcha:${captchaKey}`);  // 一次性使用
  return storedCaptcha === userInput.toLowerCase();
}
```

**关键点**：
- 验证码图片格式：`data:image/svg+xml;base64,...`（不是 PNG！）
- 前端直接使用后端返回值作为 `<img src>`，不要再次包装

---

### 决策 5："记住我"实现策略 - 浏览器原生凭证 API ✅

**已实施**：使用 Credential Management API

**HTML 属性配置**：

```html
<el-input v-model="formData.username" autocomplete="username" />
<el-input v-model="formData.password" type="password" autocomplete="current-password" show-password />
<el-checkbox v-model="formData.rememberMe">记住登录状态</el-checkbox>
```

**Tooltip 帮助文本**：

```html
<el-tooltip content="勾选后，浏览器将记住您的登录状态，下次访问时自动填充用户名" placement="top">
  <Icon icon="mdi:information-outline" class="help-icon" />
</el-tooltip>
```

---

### 决策 6：错误处理与 HTTP 客户端配置 ✅

**已实施**：多层错误处理 + 特殊配置

**Login 接口特殊配置**：

```typescript
// apps/web/src/api/modules/auth.api.ts
export async function login(data: LoginDTO): Promise<LoginResult> {
  const instance = await getApi();
  return instance.post('/auth/login', data, {
    skipToken: true,           // 不注入 Token（登录前无 Token）
    showError: false,           // 不自动显示错误（由组件统一处理）
    skipAuthRedirect: true,     // 401 不触发跳转（密码错是业务错误）
  });
}
```

**为什么需要 `skipAuthRedirect`？**

问题场景：
1. 用户输入错误密码 → 后端返回 401
2. HTTP 中间件检测到 401 → 默认行为是跳转登录页
3. 结果：页面"刷新"，用户体验差

解决方案：
- 新增 `skipAuthRedirect` 配置项
- error 中间件检查此配置决定是否跳转

**异常过滤器 Code 格式**：

```typescript
// 统一使用数字格式（HTTP 状态码）
{
  "code": 200,   // 成功
  "code": 400,   // 请求参数错误
  "code": 401,   // 未授权（密码错/验证码错）
  "code": 422,   // 字段验证失败
  "code": 500,   // 服务器内部错误
}
```

**NestJS 异常类名映射**：

```typescript
// 使用完整的 NestJS 异常类名（不是简短名）
const EXCEPTION_MAP: Record<string, { status: HttpStatus; code: number }> = {
  BadRequestException: { status: 400, code: 400 },        // ✅ 正确
  UnauthorizedException: { status: 401, code: 401 },       // ✅ 正确
  UnprocessableEntityException: { status: 422, code: 422 }, // ✅ 正确
  
  // ❌ 以下写法无法匹配：
  // BadRequest: { status: 400, code: 400 },
};
```

---

## Risks / Trade-offs (已解决的问题)

### ✅ 问题 1：TokenManager patterns.map 错误

**问题**：`TypeError: patterns.map is not a function`

**原因**：Vite 缓存旧版本代码 + 构建配置错误

**解决方案**：
1. `TokenManager.setWhiteList()` 添加防御性检查
2. 修复 `tsup.config.ts` 的 `dts` 配置（`dts: true` 而非 `dts: { only: true }`）
3. 清除 Vite 缓存并重新构建

---

### ✅ 问题 2：验证码图片不显示

**问题**：显示"验证码"文字而非图片

**原因**：前端重复包装 data URI

```html
<!-- ❌ 错误 -->
<img :src="`data:image/png;base64,${captchaImage}`" />

<!-- ✅ 正确（后端已返回完整格式） -->
<img :src="captchaImage" />
```

---

### ✅ 问题 3：登录失败后页面刷新

**问题**：输入错误密码后页面刷新

**原因**：HTTP 中间件将所有 401 都视为"未授权"并跳转登录页

**解决方案**：新增 `skipAuthRedirect` 配置，login 接口的 401 是业务错误

---

### ✅ 问题 4：重复错误提示

**问题**：同一个错误显示两次

**原因**：HTTP 客户端自动提示 + 组件手动提示

**解决方案**：login 接口设置 `showError: false`，由组件统一处理

---

### ✅ 问题 5：输入框缺少边框

**问题**：Element Plus 输入框无边框

**原因**：CSS 变量覆盖不完整

**解决方案**：显式设置 border 并覆盖 CSS 变量

```scss
:deep(.el-input__wrapper) {
  border: 1px solid var(--el-input-border-color);
  background-color: #fff;
}
```

---

## Migration Plan (已完成)

### 已完成的部署步骤

#### ✅ 阶段 1：核心功能实现

1. 创建 Pinia AuthStore (`stores/auth.store.ts`)
2. 实现登录页面组件 (`views/login/index.vue`)
3. 集成表单验证（vee-validate + Zod）
4. 实现 API 调用逻辑和错误处理

#### ✅ 阶段 2：后端验证码接口

1. 安装 `svg-captcha` 依赖
2. 创建 Captcha DTO (`dto/captcha.dto.ts`)
3. 实现 AuthService 验证码方法
4. 添加 AuthController 接口 (`GET /auth/captcha`)
5. 扩展 LoginDto 支持 captcha 字段

#### ✅ 阶段 3：Bug 修复与优化

1. 修复 TokenManager 防御性检查
2. 修复 CancelManager 缺失属性
3. 修复 tsup 构建配置
4. 优化异常过滤器（code 数字格式）
5. 新增 skipAuthRedirect 配置
6. 修复验证码图片、输入框边框等 UI 问题

---

## 附录：实际技术选型与依赖

| 技术领域 | 选型方案 | 版本 | 用途 |
|---------|---------|------|------|
| 表单验证 | vee-validate + zod | ^4.15.1, ^4.4.3 | 类型安全表单校验 |
| 状态管理 | Pinia | ^2.1.7 | 认证状态管理 |
| UI 框架 | Element Plus | ^2.5.0 | UI 组件库 |
| HTTP 请求 | @uni-admin/workspace:\* | latest | 自动Token、错误处理 |
| 图标 | @iconify/vue | ^5.0.1 | 图标库 |
| CSS 预处理 | SCSS | ^1.69.5 | 样式变量和嵌套 |
| 构建工具 | Vite | ^5.0.0 | 开发服务器和打包 |
| **验证码生成** | **svg-captcha** | **^1.8.0** | **SVG 验证码图片** |

### 新增依赖

```json
// apps/server/package.json
{
  "dependencies": {
    "svg-captcha": "^1.8.0"  // SVG 验证码生成库
  }
}
```

### 修改的文件清单

**前端**：
- `apps/web/src/views/login/index.vue` - 登录页面主组件
- `apps/web/src/stores/auth.store.ts` - 认证状态管理
- `apps/web/src/api/modules/auth.api.ts` - API 接口层

**后端**：
- `apps/server/src/modules/auth/dto/captcha.dto.ts` - 新增验证码 DTO
- `apps/server/src/modules/auth/dto/login.dto.ts` - 扩展登录 DTO
- `apps/server/src/modules/auth/auth.service.ts` - 验证码服务方法
- `apps/server/src/modules/auth/auth.controller.ts` - 验证码接口
- `apps/server/src/common/filters/http-exception.filter.ts` - 异常过滤器优化

**HTTP 封装层**：
- `packages/request/src/middlewares/error.ts` - skipAuthRedirect 支持
- `packages/request/src/types/options.ts` - 类型定义扩展
- `packages/request/src/middlewares/config.merge.ts` - 配置合并
- `packages/request/src/managers/TokenManager.ts` - 防御性检查
- `packages/request/src/managers/CancelManager.ts` - 属性补全
- `packages/request/tsup.config.ts` - 构建配置修复
