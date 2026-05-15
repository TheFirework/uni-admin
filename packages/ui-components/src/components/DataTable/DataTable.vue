<template>
  <el-table
    :data="data"
    :loading="loading"
    :row-key="rowKey"
    v-bind="$attrs"
    @selection-change="handleSelectionChange"
    @sort-change="handleSortChange"
  >
    <!-- 多选框列 -->
    <el-table-column
      v-if="showSelection"
      type="selection"
      width="55"
    />

    <!-- 序号列 -->
    <el-table-column
      v-if="showIndex"
      type="index"
      label="#"
      width="60"
      :index="indexMethod"
    />

    <!-- 数据列 -->
    <template v-for="column in columns" :key="String(column.key)">
      <el-table-column
        :prop="String(column.key)"
        :label="column.label"
        :width="column.width"
        :sortable="column.sortable || false"
      >
        <template #default="{ row }">
          <!-- 如果有自定义插槽，使用插槽 -->
          <slot
            v-if="column.slotName"
            :name="column.slotName"
            :row="row"
            :column="column"
          />
          <!-- 否则使用格式化函数或直接显示值 -->
          <template v-else>
            {{ column.formatter ? column.formatter(row, column, row[column.key as keyof typeof row]) : row[column.key as keyof typeof row] }}
          </template>
        </template>
      </el-table-column>
  </el-table>

  <!-- 分页器 -->
  <div v-if="pagination" class="table-pagination">
    <el-pagination
      :current-page="pagination.current"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />
  </div>

  <!-- 空状态 -->
  <div v-if="!loading && data.length === 0" class="table-empty">
    {{ emptyText || '暂无数据' }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DataTableProps } from './types';

const props = withDefaults(defineProps<DataTableProps>(), {
  loading: false,
  rowKey: 'id',
  showIndex: false,
  showSelection: false,
  emptyText: '暂无数据',
});

const emit = defineEmits<{
  (e: 'selection-change', selection: unknown[]): void;
  (e: 'sort-change', sort: { prop: string; order: string | null }): void;
  (e: 'page-change', page: number): void;
  (e: 'size-change', size: number): void;
}>();

/**
 * 序号计算方法（考虑分页）
 */
const indexMethod = (index: number) => {
  if (!props.pagination) return index + 1;
  return (props.pagination.current - 1) * props.pagination.pageSize + index + 1;
};

const handleSelectionChange = (selection: unknown[]) => {
  emit('selection-change', selection);
};

const handleSortChange = (sort: { prop: string; order: string | null }) => {
  emit('sort-change', sort);
};

const handlePageChange = (page: number) => {
  emit('page-change', page);
};

const handleSizeChange = (size: number) => {
  emit('size-change', size);
};
</script>

<style scoped>
.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.table-empty {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}
</style>
