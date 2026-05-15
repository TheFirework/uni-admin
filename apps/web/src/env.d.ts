/// <reference types="vite/client" />

// 声明 .vue 文件模块
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// 扩展 ImportMeta 接口以支持 Vite 环境变量
interface ImportMeta {
  readonly env: {
    readonly VITE_APP_TITLE: string
    readonly VITE_API_BASE_URL: string
    [key: string]: string | boolean | number | undefined
  }
}

// 使用 var 声明全局 window 对象（兼容性更好）
declare var window: Window & typeof globalThis