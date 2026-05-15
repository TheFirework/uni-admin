## 1. Web 端独立环境配置模块

- [x] 1.1 创建 `apps/web/src/env.d.ts` — 扩展 ImportMetaEnv 接口声明所有自定义 VITE_* 变量类型
- [x] 1.2 创建 `apps/web/src/utils/env.config.ts` — 定义 WebEnvConfig 接口、从 import.meta.env 读取 VITE_* 变量、立即校验、导出只读 env 单例
- [x] 1.3 实现 Web 端必填变量检查（VITE_APP_TITLE、VITE_API_BASE_URL 等）
- [x] 1.4 实现 Web 端枚举值校验（VITE_APP_ENV: development | test | production）
- [x] 1.5 实现 Web 端功能开关强制覆盖（生产环境 enableDevtools 强制 false）

## 2. Server 端独立环境配置模块

- [x] 2.1 创建 `apps/server/src/config/env.config.ts` — 定义 ServerEnvConfig 接口、从 process.env 读取原生变量、惰性校验（getEnv 函数）
- [x] 2.2 实现 Server 端惰性初始化（cachedEnv 模式，首次调用 getEnv() 时执行校验）
- [x] 2.3 实现 Server 端必填变量检查（DATABASE_URL、PORT 等）
- [x] 2.4 实现 Server 端枚举值校验（NODE_ENV: development | test | production）
- [x] 2.5 实现 Server 端端口范围校验（PORT: 1-65535）
- [x] 2.6 实现 Server 端弱密钥警告（JWT_SECRET 默认值检测，仅警告不终止）

## 3. Web 端多环境文件体系

- [x] 3.1 创建 `apps/web/.env.development` — 开发环境配置（VITE_* 前缀）
- [x] 3.2 创建 `apps/web/.env.test` — 测试环境配置
- [x] 3.3 创建 `apps/web/.env.production` — 生产环境配置
- [x] 3.4 重写 `apps/web/.env.example` 为完整模板文档（含注释说明）

## 4. Server 端多环境文件体系

- [x] 4.1 创建 `apps/server/.env.development` — 开发环境配置（原生变量名）
- [x] 4.2 创建 `apps/server/.env.test` — 测试环境配置
- [x] 4.3 创建 `apps/server/.env.production` — 生产环境配置
- [x] 4.4 重写 `apps/server/.env.example` 为完整模板文档（含 CI/CD Secrets 说明）

## 5. Vite 构建配置改造（Web 端）

- [x] 5.1 在 `apps/web/vite.config.ts` 中读取 package.json version 字段
- [x] 5.2 添加 define 配置注入 VITE_BUILD_VERSION 和 VITE_BUILD_TIME
- [x] 5.3 在 `apps/web/package.json` scripts 中新增 dev:test 和 dev:prod 命令
- [x] 5.4 升级 vue-tsc 到 ^2.2.x 解决 TypeScript 5.9 兼容性问题

## 6. Web 现有代码集成

- [x] 6.1 改造 `apps/web/src/api/index.ts` — 使用 env.apiBaseUrl / env.apiTimeout 替代直接读取 import.meta.env
- [x] 6.2 改造 `apps/web/src/main.ts` — 导入 { env } 触发即时校验；根据 env.enableDevtools 加载 DevTools；根据 env.enableMock 加载 MSW
- [x] 6.3 创建 `apps/web/src/mocks/browser.ts` MSW stub 文件（预留接口）

## 7. Server 现有代码集成

- [x] 7.1 改造 `apps/server/src/main.ts` — 在 bootstrap() 内动态导入 getEnv() 替代 process.env 直接读取
- [x] 7.2 更新 `apps/server/src/app.module.ts` — ConfigModule envFilePath 动态匹配 mode 文件（'.env.local', '.env.${NODE_ENV}', '.env'）
- [x] 7.3 更新 `apps/server/tsconfig.json` — 移除 composite/references 配置修复 nest build 不生成产物问题
- [x] 7.4 新增 `apps/server/package.json` 的 "type": "module" 声明

## 8. 清理根目录冗余配置

- [x] 8.1 删除根目录 `.env` 文件（已被各 app 的 .env.* 替代）
- [x] 8.2 删除根目录 `.env.example` 文件（同上）
- [x] 8.3 删除根目录 `config/` 目录（已无全局配置需求，各端独立维护 env.d.ts）

## 9. 验证与测试

- [x] 9.1 ✅ 执行 pnpm --filter @uni-admin/web build — Web 生产构建成功（exit code 0）
- [x] 9.2 ✅ 执行 npx tsc --noEmit (server) — Server 类型检查通过（exit code 0）
- [x] 9.3 ✅ 验证根目录无 .env* 文件残留
- [x] 9.4 ✅ 验证根目录无 config/ 目录残留
- [x] 9.5 验证 Web 端 dev 模式正常启动（需手动验证）
- [x] 9.6 验证 Server 端 dev 模式正常启动（需手动验证）
- [x] 9.7 验证 Web 端故意删除必填变量后启动报错（需手动验证）
- [x] 9.8 验证 Server 端故意删除必填变量后启动报错（需手动验证）
- [x] 9.9 验证 Server 端使用默认 JWT_SECRET 时显示警告但不终止（需手动验证）
