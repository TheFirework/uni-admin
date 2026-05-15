<template>
  <div class="dashboard-container">
    <h1>仪表盘</h1>
    <p>欢迎来到 Uni-Admin 管理后台！</p>

    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6" v-for="(item, index) in stats" :key="index">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 模拟统计数据（后续从 API 获取）
const stats = ref([
  { label: '总用户数', value: '1,234' },
  { label: '今日访问', value: '567' },
  { label: '活跃角色', value: '12' },
  { label: '系统运行时间', value: '99.9%' },
]);
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
}

.stat-cards {
  margin-top: 24px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}
</style>
