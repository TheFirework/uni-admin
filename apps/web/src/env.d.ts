/**
 * Vue 单文件组件类型声明
 *
 * 让 TypeScript 识别 .vue 文件的导入
 * 解决 "找不到模块 xxx.vue 或其相应的类型声明" 错误
 *
 * 使用方式：
 *   import Foo from './Foo.vue'  // ✅ 不再报错
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}
