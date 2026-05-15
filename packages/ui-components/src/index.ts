// ===========================================
// @uni-admin/ui-components 统一导出入口
//
// 注意：此包的构建产物只包含 TypeScript 代码（hooks 和类型定义）
// Vue 组件 (.vue) 需要在消费端（如 apps/web）通过 Vite 直接引用源码
//
// 使用方式：
// import { useDataTable, DataTableProps } from '@uni-admin/ui-components'
// import { DataTable } from '@uni-admin/ui-components/src/components/DataTable/DataTable.vue'
// ===========================================

// 导出组合式函数 (Hooks) - 可通过构建产物使用
export { useDataTable } from './hooks/useDataTable.js'
export { useForm } from './hooks/useForm.js'
export { useModal } from './hooks/useModal.js'

// 导出类型定义 - 可通过构建产物使用
export type { DataTableProps, Column } from './components/DataTable/types.js'
export type { SearchFormField } from './components/SearchForm/types.js'
export type { ModalFormField } from './components/ModalForm/types.js'

// Vue 组件 - 需要直接引用源码（不包含在构建产物中）
// export { default as DataTable } from './components/DataTable/DataTable.vue'
// export { default as SearchForm } from './components/SearchForm/SearchForm.vue'
// export { default as ModalForm } from './components/ModalForm/ModalForm.vue'