import { ref, reactive } from 'vue';

/**
 * DataTable 组合式函数
 * 封装表格数据加载逻辑（loading、data、pagination、reload）
 */
export function useDataTable<T = Record<string, unknown>>(fetchFn: (params: { page: number; pageSize: number }) => Promise<{ list: T[]; total: number }>) {
  const loading = ref(false);
  const data = ref<T[]>([]);
  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      const result = await fetchFn({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      data.value = result.list;
      pagination.total = result.total;
    } finally {
      loading.value = false;
    }
  };

  const reload = () => {
    return fetchData();
  };

  const handlePageChange = (page: number) => {
    pagination.current = page;
    return fetchData();
  };

  const handleSizeChange = (size: number) => {
    pagination.pageSize = size;
    pagination.current = 1;
    return fetchData();
  };

  // 初始加载
  fetchData();

  return {
    loading,
    data,
    pagination,
    reload,
    handlePageChange,
    handleSizeChange,
  };
}
