<template>
  <div></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  // 从 /redirect/xxx 路径中提取目标路径（BasicLayout 子路由）
  const { path, query } = route.params;
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');
  // 将 params.query 对象转换为普通对象（Vue Router 的 params 可能是代理对象）
  const targetQuery = query ? JSON.parse(JSON.stringify(query)) : {};

  // 立即 replace 到目标路径，触发组件重建（keep-alive 缓存已因离开路由而清除）
  router.replace({
    path: '/' + targetPath,
    query: targetQuery,
  });
});
</script>
