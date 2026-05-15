import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // 外部依赖：zod 由使用者自行安装
  external: ['zod'],
  // 暂时禁用 DTS 生成（tsup 与 TS Project References 存在兼容性问题）
  // 后续可通过 rollup-plugin-dts 或手动 tsc 生成
  dts: false,
  clean: true,
  sourcemap: true,
});
