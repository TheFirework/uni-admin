<template>
  <div class="dictionary-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>字典管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增字典
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="name" label="字典名称" min-width="150" />
        <el-table-column prop="code" label="字典编码" min-width="120" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

interface DictionaryItem {
  id: string;
  name: string;
  code: string;
  description: string;
  status: number;
}

const loading = ref(false);
const tableData = ref<DictionaryItem[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

async function fetchData() {
  loading.value = true;
  try {
    // TODO: 替换为实际 API 调用
    // const res = await getDictionaryList({ page: currentPage.value, size: pageSize.value });
    // tableData.value = res.data.list;
    // total.value = res.data.total;
    
    // 模拟数据
    await new Promise((resolve) => setTimeout(resolve, 300));
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  ElMessage.info('新增字典功能开发中...');
}

function handleEdit(row: DictionaryItem) {
  ElMessage.info(`编辑字典: ${row.name}`);
}

async function handleDelete(row: DictionaryItem) {
  try {
    await ElMessageBox.confirm(`确定要删除字典"${row.name}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    // TODO: 调用删除 API
    ElMessage.success('删除成功');
    fetchData();
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="scss">
.dictionary-container {
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
