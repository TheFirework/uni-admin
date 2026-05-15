// 统一导出业务组件库
// 当前阶段：只导出 TypeScript hooks 和类型定义
// Vue 组件（DataTable, SearchForm, ModalForm）将在后续迭代中实现

// 导出 hooks（纯 TypeScript，可立即使用）
export { useDataTable } from './hooks/useDataTable';
export { useForm } from './hooks/useForm';
export { useModal } from './hooks/useModal';

// 导出类型定义
export type { DataTableProps, Column } from './components/DataTable/types';

// TODO: Vue 组件需要额外的构建配置（esbuild vue 插件），后续迭代添加：
// export { default as DataTable } from './components/DataTable/DataTable.vue';
// export { default as SearchForm } from './components/SearchForm/SearchForm.vue';
// export { default as ModalForm } from './components/ModalForm/ModalForm.vue';
