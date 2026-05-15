import { defineConfig } from 'tsup'

export default defineConfig({
  // 只导出 TypeScript hooks 和类型定义
  // Vue 组件 (.vue) 需要在消费端（apps/web）直接引用源码
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  sourcemap: true,
  external: ['vue', 'element-plus'],
})