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
        <router-view v-slot="{ Component, route }">
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
import { useTagsStore } from '@/stores/tags.store';
import { useMenuStore } from '@/stores/menu.store';

// 获取 tags store 用于 keep-alive 缓存控制
const tagsStore = useTagsStore();

// 获取菜单 store 用于监听侧边栏折叠状态
const menuStore = useMenuStore();

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
onMounted(async () => {
  // 1. 更新侧边栏宽度
  updateSidebarWidth();

  // 2. 加载菜单数据（如果尚未加载）
  try {
    if (!menuStore.isLoaded) {
      await menuStore.fetchMenus();
    }
  } catch (error) {
    console.error('[BasicLayout] 菜单加载失败:', error);
  }
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
