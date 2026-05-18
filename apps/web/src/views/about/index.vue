<template>
  <div class="about-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>关于</span>
        </div>
      </template>

      <div class="about-content">
        <h2>UniAdmin</h2>
        <p>基于 Vue 3 + TypeScript + Element Plus 的企业级后台管理系统模板</p>

        <el-divider />

        <el-descriptions :column="1" border>
          <el-descriptions-item label="技术栈">Vue 3 + TypeScript</el-descriptions-item>
          <el-descriptions-item label="UI 框架">Element Plus</el-descriptions-item>
          <el-descriptions-item label="构建工具">Vite</el-descriptions-item>
          <el-descriptions-item label="状态管理">Pinia</el-descriptions-item>
          <el-descriptions-item label="路由管理">Vue Router 4</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 关于页面
</script>

<style lang="scss" scoped>
.about-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
  }

  .about-content {
    h2 {
      text-align: center;
      margin-bottom: 10px;
      color: #303133;
    }

    p {
      text-align: center;
      color: #606266;
      margin-bottom: 20px;
    }
  }
}
</style>
