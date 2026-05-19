<template>
  <el-aside
    class="sidebar-container"
    :class="{ 'is-collapsed': isCollapsed }"
    :width="isCollapsed ? '64px' : '240px'"
  >
    <!-- Logo 区域 -->
    <div class="sidebar-logo">
      <router-link to="/">
        <img
          src="@/assets/logo.svg"
          alt="UniAdmin"
          class="logo-img"
        >
        <span
          v-show="!isCollapsed"
          class="logo-title"
        >UniAdmin</span>
      </router-link>
    </div>

    <!-- 菜单区域 -->
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="true"
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
        :unique-opened="false"
        router
      >
        <!-- 使用 MenuItem 递归组件渲染动态菜单 -->
        <MenuItem
          v-for="menu in menuList"
          :key="menu.path"
          :menu="menu"
          :base-path="menu.path"
        />
      </el-menu>
    </el-scrollbar>
  </el-aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMenuStore } from '@/stores/menu.store';
import { hoverPrefetcher } from '@/utils/prefetch/HoverPrefetcher';
import { routerConfig } from '@/config/router.config';
import MenuItem from './MenuItem.vue';

const menuStore = useMenuStore();
const route = useRoute();
const router = useRouter();

const isCollapsed = computed(() => menuStore.isCollapsed);

const activeMenu = computed((): string => {
  return route.path;
});

const menuList = computed(() => {
  return menuStore.visibleMenus;
});

function bindPrefetchEvents(): void {
  if (!routerConfig.prefetchEnabled) return;

  const menuItems = document.querySelectorAll('.el-menu-item[data-path]');

  menuItems.forEach((item) => {
    const path = item.getAttribute('data-path');
    if (!path) return;

    try {
      const resolved = router.resolve(path);
      const matched = resolved.matched;
      if (!matched || matched.length === 0) return;

      const lastRoute = matched[matched.length - 1];
      const component = lastRoute.components?.default;

      if (typeof component === 'function') {
        hoverPrefetcher.bind(item, path, component as () => Promise<unknown>);
      }
    } catch {
      // 路由解析失败时跳过
    }
  });
}

onMounted(() => {
  nextTick(() => {
    bindPrefetchEvents();
  });
});

onUnmounted(() => {
  hoverPrefetcher.destroy();
});
</script>

<style lang="scss" scoped>
.sidebar-container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 1001;
  background-color: #001529;
  transition: width 0.3s ease;
  overflow: hidden;

  .sidebar-logo {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    background-color: #002140;
    border-bottom: 1px solid #1d2f45;

    a {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;

      .logo-img {
        width: 32px;
        height: 32px;
      }

      .logo-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
      }
    }
  }

  // 覆盖 Element Plus 菜单样式
  :deep(.el-menu) {
    border-right: none;
  }

  :deep(.el-scrollbar) {
    height: calc(100vh - 64px);
  }

  &.is-collapsed {
    .sidebar-logo {
      padding: 0;
    }
  }
}
</style>
