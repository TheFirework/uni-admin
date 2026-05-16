import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    only: true,
  },
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['axios'],
});
