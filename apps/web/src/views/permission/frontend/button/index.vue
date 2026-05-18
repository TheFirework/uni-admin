<template>
  <div class="button-permission">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>按钮权限（前端）</span>
        </div>
      </template>

      <div class="content">
        <el-alert
          title="基于前端的按钮权限控制"
          type="warning"
          description="通过自定义指令 v-permission 控制按钮的显示/隐藏"
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />

        <el-empty description="按钮权限功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 前端权限-按钮权限
</script>

<style lang="scss" scoped>
.button-permission {
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
