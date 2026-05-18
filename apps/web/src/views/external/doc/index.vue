<template>
  <div class="project-docs">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>项目文档</span>
        </div>
      </template>

      <div class="content">
        <el-alert
          title="外部链接页面"
          type="info"
          description="此页面将跳转到外部文档系统或在新窗口中打开项目文档"
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />

        <el-empty description="项目文档功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 项目文档页面 - 外部链接示例
</script>

<style lang="scss" scoped>
.project-docs {
  padding: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .content {
    padding: 20px 0;
  }
}
</style>
