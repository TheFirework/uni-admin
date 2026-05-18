<template>
  <div class="button-permission-backend">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>按钮权限（后台）</span>
        </div>
      </template>

      <div class="content">
        <el-alert
          title="基于后端的按钮权限控制"
          type="error"
          description="通过后端接口返回的按钮权限码控制按钮的可用状态"
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />

        <el-empty description="后台按钮权限功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 后台权限-按钮权限
</script>

<style lang="scss" scoped>
.button-permission-backend {
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
