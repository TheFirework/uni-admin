<template>
  <div class="page-permission-backend">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>页面权限（后台）</span>
        </div>
      </template>

      <div class="content">
        <el-alert
          title="基于后端的页面权限控制"
          type="success"
          description="通过后端接口返回的权限数据动态生成可访问的路由和菜单"
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />

        <el-empty description="后台页面权限功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 后台权限-页面权限
</script>

<style lang="scss" scoped>
.page-permission-backend {
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
