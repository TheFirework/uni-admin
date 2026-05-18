<template>
  <div class="header-wrapper">
    <!-- 第一行：Navbar 导航栏 -->
    <el-header class="navbar">
      <!-- 左侧区域：折叠按钮 + 面包屑 -->
      <div class="navbar-left">
        <!-- 折叠/展开按钮 -->
        <div class="hamburger-container" @click="toggleSidebar">
          <el-icon :size="20">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>

        <!-- 面包屑导航 -->
        <Breadcrumb />
      </div>

      <!-- 右侧操作区 -->
      <div class="navbar-right">
        <!-- 头像按钮（点击打开抽屉） -->
        <div class="avatar-wrapper" @click="drawerVisible = true">
          <el-avatar :size="32" :src="userAvatar" />
          <span class="username">{{ username }}</span>
        </div>

        <!-- 头像抽屉 -->
        <AvatarDrawer v-model="drawerVisible" />
      </div>
    </el-header>

    <!-- 第二行：Tabbar 标签栏 -->
    <div class="tabbar">
      <TagsView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Fold, Expand } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';
import Breadcrumb from '../Breadcrumb.vue';
import TagsView from '../TagsView/index.vue';
import AvatarDrawer from '../AvatarDrawer.vue';

// Auth Store
const authStore = useAuthStore();

// Menu Store（用于侧边栏折叠控制）
const menuStore = useMenuStore();

// 头像抽屉显示状态
const drawerVisible = ref(false);

// ====== 计算属性 ======

// 当前用户名
const username = computed((): string => authStore.username || '管理员');

// 用户头像（默认使用 Element Plus 的默认头像）
const userAvatar = computed((): string => {
  // 后续可从用户信息中读取真实头像 URL
  return '';
});

// 侧边栏折叠状态
const isCollapsed = computed((): boolean => menuStore.isCollapsed);

// ====== 方法 ======

/**
 * 切换侧边栏折叠状态
 */
function toggleSidebar(): void {
  menuStore.toggleCollapse();
}
</script>

<style lang="scss" scoped>
.header-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px; // 导航栏高度
    padding: 0 20px;
    width: 100%; // 确保填满容器宽度
    position: sticky;
    top: 0;
    z-index: 1000;
    flex-shrink: 0; // 防止被压缩
    background-color: #fff; // 确保背景色
    border-bottom: 1px solid #e6e8eb; // 底部分隔线
    box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04); // 轻微阴影增强分层感

    .navbar-left {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;

      .hamburger-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        cursor: pointer;
        transition: color 0.3s ease;
        color: #5a5e66;

        &:hover {
          color: #409eff;
        }

        .el-icon {
          font-size: 20px;
        }
      }
    }

    .navbar-right {
      display: flex;
      align-items: center;
      gap: 16px;

      .avatar-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.3s ease;

        &:hover {
          background-color: #f5f7fa;
        }

        .username {
          font-size: 14px;
          color: #303133;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .tabbar {
    width: 100%; // 确保填满容器宽度
    flex-shrink: 0; // 防止被压缩
    background-color: #fafafa; // 浅灰色背景，与 navbar 形成对比
    border-bottom: 1px solid #e6e8eb; // 底部边框
    position: relative; // 为可能的额外装饰定位
  }
}
</style>
