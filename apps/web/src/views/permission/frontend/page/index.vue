<template>
  <div class="page-permission">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>页面权限（前端）</span>
        </div>
      </template>

      <div class="content">
        <el-alert
          title="基于前端的页面权限控制"
          type="info"
          description="通过路由 meta 字段控制菜单和页面的显示/隐藏"
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />

        <el-empty description="页面权限功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 前端权限-页面权限
</script>

<style lang="scss" scoped>
.page-permission {
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
  }
}
</style>
