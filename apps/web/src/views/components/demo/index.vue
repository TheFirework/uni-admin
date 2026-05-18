<template>
  <div class="component-demo">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>组件说明</span>
        </div>
      </template>

      <el-empty description="组件演示功能开发中..." />
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 组件说明页面 - 待实现
</script>

<style lang="scss" scoped>
.component-demo {
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
