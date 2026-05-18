// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default [
  // ====== 基础推荐规则 ======
  eslint.configs.recommended,

  // ====== TypeScript 规则 ======
  ...tseslint.configs.recommended,

  // ====== Vue 规则（使用推荐的 Vue 配置） ======
  ...pluginVue.configs['flat/recommended'],

  {
    // ====== 语言选项 ======
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        parser: tseslint.parser,
      },

      // 全局变量
      globals: {
        node: true,
        browser: true,
        es2022: true,
      },
    },

    // ====== 文件匹配模式 ======
    files: ['**/*.{js,mjs,cjs,ts,vue}'],

    // ====== 忽略文件 ======
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.config.js',
      '.output/**',
    ],

    // ====== 自定义规则 ======
    rules: {
      // Vue 特定规则
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',

      // 其他规则
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },
];
