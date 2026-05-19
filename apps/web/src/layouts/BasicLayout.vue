<template>
  <el-container class="basic-layout">
    <!-- 左侧边栏 -->
    <Sidebar />

    <!-- 右侧区域：顶栏 + 内容区 -->
    <el-container class="main-container">
      <!-- 顶部栏 -->
      <Header />

      <!-- 内容区 -->
      <el-main class="content-main">
        <!-- 路由切换时显示骨架屏 -->
        <LayoutSkeleton
          v-if="appStore.actualIsRouteLoading"
          :model-value="true"
        />

        <!-- 正常渲染路由组件 -->
        <router-view
          v-else
          v-slot="{ Component, route }"
        >
          <transition
            name="fade-transform"
            mode="out-in"
          >
            <keep-alive :include="cachedViews">
              <component
                :is="Component"
                :key="route.name"
              />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import Sidebar from './components/Sidebar/index.vue';
import Header from './components/Header/index.vue';
import LayoutSkeleton from './components/LayoutSkeleton.vue';
import { useTagsStore } from '@/stores/tags.store';
import { useMenuStore } from '@/stores/menu.store';
import { useAppStore } from '@/stores/app.store';

// 获取 tags store 用于 keep-alive 缓存控制
const tagsStore = useTagsStore();

// 获取菜单 store 用于监听侧边栏折叠状态
const menuStore = useMenuStore();

// 获取全局应用状态 Store（用于控制骨架屏显示）
const appStore = useAppStore();

// 缓存的视图列表（用于 keep-alive include）
const cachedViews = computed(() => tagsStore.cachedViews);

/**
 * 根据侧边栏折叠状态动态设置 CSS 变量
 * 展开时：240px
 * 折叠时：64px
 */
function updateSidebarWidth(): void {
  const width = menuStore.isCollapsed ? '64px' : '240px';
  document.documentElement.style.setProperty('--sidebar-width', width);
}

// 监听侧边栏折叠状态变化
watch(
  () => menuStore.isCollapsed,
  () => {
    updateSidebarWidth();
  }
);

// 组件挂载时初始化
onMounted(() => {
  // 更新侧边栏宽度（保留此逻辑）
  updateSidebarWidth();

  // 注意：移除了原来的 menuStore.fetchMenus() 调用
  // 原因：路由守卫（dynamicRoute middleware）已成为唯一的菜单数据加载入口
  // 避免重复请求和竞态条件
});
</script>

<style lang="scss" scoped>
.basic-layout {
  height: 100vh;
  width: 100%;
  overflow: hidden;

  .main-container {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1; // 填充剩余空间
    margin-left: var(--sidebar-width); // 为侧边栏预留空间
    transition: margin-left 0.3s ease; // 折叠动画过渡

    .content-main {
      flex: 1;
      padding: 20px;
      background-color: #f0f2f5;
      overflow-y: auto;
      overflow-x: hidden;
    }
  }
}

// 页面切换过渡动画
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
