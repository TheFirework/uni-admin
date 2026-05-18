<template>
  <!-- 条件渲染：登录页独立显示，其他页面包裹 BasicLayout -->
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <transition
        name="fade"
        mode="out-in"
      >
        <component :is="getLayout(Component, route)" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { markRaw, type Component } from 'vue';
import BasicLayout from '@/layouts/BasicLayout.vue';

/**
 * 根据路由决定使用哪种布局
 * - 登录页等公开页面：直接渲染组件
 * - 受保护页面：包裹在 BasicLayout 中
 */
function getLayout(component: Component, route: any): Component {
  // 如果是白名单中的路由（如 /login、/404），直接返回组件
  const whiteList = ['/login', '/404', '/403'];

  if (whiteList.includes(route.path)) {
    return component;
  }

  // 其他路由包裹在 Layout 中
  // 使用 markRaw 避免 Vue 将 Layout 组件变成响应式对象
  return markRaw(BasicLayout) as unknown as Component;
}
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
}

/* 页面切换过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
