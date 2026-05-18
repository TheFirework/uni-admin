<template>
  <el-breadcrumb
    separator="/"
    class="breadcrumb-container"
  >
    <el-breadcrumb-item
      v-for="item in breadcrumbs"
      :key="item.path"
    >
      <!-- 最后一项不可点击（当前页面） -->
      <span
        v-if="item.isLast"
        class="no-link"
      >{{ item.meta?.title }}</span>

      <!-- 其他项可点击跳转 -->
      <router-link
        v-else
        :to="item.path"
      >
        {{ item.meta?.title }}
      </router-link>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, type RouteLocationMatched } from 'vue-router';

// 当前路由实例
const route = useRoute();

/**
 * 生成面包屑数据
 * 从路由的 matched 链路中提取，过滤掉没有 meta.title 的路由
 */
const breadcrumbs = computed((): Array<RouteLocationMatched & { isLast?: boolean }> => {
  // 过滤出有 title 的路由记录
  const matched = route.matched.filter(
    (item) => item.meta && item.meta.title
  );

  // 如果没有匹配的路由，返回空数组
  if (!matched.length) return [];

  // 标记最后一项为当前页面（不可点击）
  const result = matched.map((item, index) => ({
    ...item,
    isLast: index === matched.length - 1,
  }));

  return result;
});
</script>

<style lang="scss" scoped>
.breadcrumb-container {
  line-height: 64px; // 与 Header 高度一致，垂直居中

  .no-link {
    color: #303133;
    font-weight: 500;
    cursor: default;
  }

  :deep(.el-breadcrumb__inner) {
    a {
      color: #606266;
      font-weight: normal;

      &:hover {
        color: #409eff;
      }
    }
  }

  :deep(.el-breadcrumb__separator) {
    color: #c0c4cc;
    margin: 0 8px;
  }
}
</style>
