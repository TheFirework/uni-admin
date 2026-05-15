<template>
  <div class="user-management">
    <h1>用户管理</h1>
    <p>用户管理功能开发中...</p>

    <!-- 使用 Element Plus 原生表格组件（后续替换为 ui-components DataTable） -->
    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="email" label="邮箱" width="200" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" />
    </el-table>

    <!-- 分页器 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const loading = ref(false);

interface UserItem {
  username: string;
  email: string;
  nickname: string;
  status: string;
  createdAt: string;
}

const tableData = ref<UserItem[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

onMounted(() => {
  fetchUsers();
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    // TODO: 调用用户列表 API
    await new Promise((resolve) => setTimeout(resolve, 500));
    tableData.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  pagination.current = page;
  fetchUsers();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  fetchUsers();
};
</script>

<style scoped>
.user-management {
  padding: 24px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
