/**
 * MSW (Mock Service Worker) 浏览器端入口
 * 仅在 env.web.enableMock=true 时由 main.ts 动态加载
 *
 * 使用方式:
 *   1. 安装: pnpm add -D msw
 *   2. 初始化: npx msw init public/ --save
 *   3. 在 mocks/handlers.ts 中定义 mock 数据
 */

export const worker = {
  start: async (_options?: { onUnhandledRequest?: string }) => {
    console.warn('[MSW] Mock Service Worker 未安装。如需启用 Mock，请执行: pnpm add -D msw && npx msw init public/ --save');
  },
};
