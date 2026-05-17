name: Pull Request Template for Login Page Modernization MVP
about: 登录页面现代化优化 (MVP) - 输入框增强、聚焦效果、响应式布局、错误提示优化
title: 'feat(login): modernize login page with MVP enhancements'
labels: enhancement, ui/ux, login, MVP
assignees: jiangbo
reviewers: []
milestone: v1.1.0
projects: []
body: |
  ## 📋 概述
  
  本 PR 实现了登录页面的现代化 MVP 优化，包括输入框交互增强、视觉反馈改进、响应式布局优化和错误提示体验提升。
  
  **关联 OpenSpec Change**: `login-page-modernization-mvp`
  
  ---
  
  ## ✨ 新增特性
  
  ### 🔴 P0 核心功能 (100% 完成)
  
  #### 1. **输入框一键清空功能**
  - ✅ 用户名/密码/验证码输入框均支持 `clearable` 属性
  - 密码框 × 图标与 👁 显示密码图标完美共存
  - 使用 Element Plus 原生能力，零新依赖
  
  #### 2. **聚焦效果增强**
  - 边框颜色渐变：#E5E7EB → #5B9BD5（蓝色）
  - 柔和阴影环：`box-shadow: 0 0 0 3px rgba(91, 155, 213, 0.15)`
  - 微妙上浮动画：`transform: translateY(-1px)`
  - 平滑过渡效果：200ms ease
  
  #### 3. **响应式布局优化**
  
  | 设备类型 | 断点 | 卡片内边距 | 圆角 | 标题字号 | 输入框高度 |
  |---------|------|-----------|------|---------|-----------|
  | Desktop | >768px | 48px 40px | 16px | 28px | 48px |
  | Tablet | ≤768px | 32px 24px | 12px | 28px | 48px |
  | Mobile | ≤576px | 24px 16px | 8px | 24px | **52px** |
  
  ### 🟡 P1 增强功能 (100% 完成)
  
  #### 4. **键盘无障碍支持**
  - Tab 键顺序符合逻辑（用户名 → 密码 → 验证码 → 记住我 → 忘记密码? → 登录按钮）
  - Enter 键快速提交 + Loading 状态防重复提交
  
  #### 5. **错误提示混合模式**
  - 字段级错误：内联显示在输入框下方（精准定位 + 动画）
  - API 级错误：ElMessage 全局通知（不遮挡表单）
  
  ---
  
  ## 📊 变更统计
  
  ```
   apps/web/src/views/login/components/CaptchaInput.vue    |   1 +
   apps/web/src/views/login/components/LoginCard.vue       | 132 ++++++++++-
   openspec/specs/login-ui-components/spec.md              | 252 ++++++++++++++++++++
   3 files changed, 371 insertions(+), 14 deletions(-)
  ```
  
  **主要修改文件**:
  - [LoginCard.vue](apps/web/src/views/login/components/LoginCard.vue) - 核心变更
  - [CaptchaInput.vue](apps/web/src/views/login/components/CaptchaInput.vue) - clearable 属性
  - [login-ui-components/spec.md](openspec/specs/login-ui-components/spec.md) - 规格同步
  
  ---
  
  ## 🧪 测试建议
  
  ### 必测项 (~45 分钟)
  - [ ] 清空图标三种输入框测试
  - [ ] 聚焦效果视觉验证（边框+阴影+上浮+流畅度）
  - [ ] 响应式三种视口切换（Desktop/Tablet/Mobile 375px）
  - [ ] 键盘 Tab/Enter 交互测试
  - [ ] 错误提示场景（多字段/单字段/动画/API 全局通知）
  
  ### 性能测试 (~15 分钟)
  - [ ] Lighthouse 审计对比基线数据
  - [ ] Performance 面板录制聚焦动画性能
  
  ---
  
  ## 📸 测试截图
  
  > ⚠️ **待补充**: 请在合并前附上以下截图：
  
  1. Desktop 视图（正常状态 + 聚焦状态 + 清空图标）
  2. Mobile 视图 (375px)（紧凑布局 + 52px 输入框）
  3. 错误提示场景（多字段内联 + API 全局通知）
  4. *(可选)* Lighthouse 报告对比
  
  ---
  
  ## 🔍 Code Review 要点
  
  ### 重点审查
  1. `fieldErrors` reactive 对象的使用合理性
  2. `getZodErrorMessage()` 错误映射完善性
  3. CSS `:deep()` 选择器是否有更好方案
  4. 聚焦动画对低端设备性能影响
  
  ### 性能关注
  - 已使用 GPU 加速属性（transform, opacity）
  - 仅 2 个媒体查询断点（影响可控）
  - transition 避免布局抖动
  
  ---
  
  ## 🔄 后续优化（不在本次范围）
  
  - [ ] 浮动标签动画（Floating Label）
  - [ ] 加载状态骨架屏
  - [ ] 按钮进度条
  - [ ] 国际化支持（i18n）
  - [ ] 暗色模式适配
  - [ ] Playwright E2E 自动化测试
  
  ---
  
  ## ✅ 合并检查清单
  
  - [x] 代码规范（ESLint + TypeScript + SCSS）
  - [x] Conventional Commit 格式正确
  - [x] 主规格文档已同步
  - [x] OpenSpec change 已归档
  - [x] 无敏感信息泄露
  - [ ] **待完成**: 浏览器手动测试
  - [ ] **待补充**: 测试截图
  
  ---
  
  ## 📝 CHANGELOG
  
  ```markdown
  ## 登录页面现代化优化 (MVP)
  
  ### 新增特性
  - ✨ 输入框支持一键清空（clearable icon）
  - ✨ 聚焦时增强视觉效果（边框变色、阴影、微浮动画）
  - ✨ 移动端响应式布局优化（触摸友好 52px 高度）
  - ⌨️ Tab 键盘导航顺序符合规范
  - 🎯 字段错误改为内联提示（精准定位 + 动画）
  
  ### 技术改进
  - 零新依赖（复用 Element Plus 原生能力）
  - GPU 加速动画（性能友好）
  - 主规格文档同步更新
  
  ### 影响范围
  - 主要：LoginCard.vue（模板+样式+逻辑）
  - 次要：CaptchaInput.vue（clearable 属性）
  - 无 API 变更，无需后端配合
  ```
  
  ---
  
  ## 🔗 相关链接
  
  - **完整 PR 描述**: [PR_DESCRIPTION.md](PR_DESCRIPTION.md)
  - **OpenSpec 归档**: `openspec/changes/archive/2026-05-17-login-page-modernization-mvp/`
  - **主规格文件**: [login-ui-components/spec.md](openspec/specs/login-ui-components/spec.md)
  
  ---
  
  💬 **欢迎 Review 和讨论！**