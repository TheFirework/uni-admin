<template>
  <div class="tags-view-container">
    <!-- 标签滚动容器 -->
    <el-scrollbar
      ref="scrollbarRef"
      class="tags-scroll-container"
    >
      <div class="tags-wrapper">
        <!-- 标签项列表 -->
        <router-link
          v-for="tag in tags"
          :key="tag.path"
          :to="{ path: tag.path, query: tag.query }"
          class="tags-view-item"
          :class="{ 'is-active': isActive(tag) }"
          @contextmenu.prevent="openContextMenu($event, tag)"
        >
          <!-- 标签标题 -->
          <span class="tag-title">{{ tag.title }}</span>

          <!-- 关闭按钮（固定标签不显示） -->
          <el-icon
            v-if="!tag.affix"
            class="tag-close"
            @click.prevent.stop="handleClose(tag)"
          >
            <Close />
          </el-icon>
        </router-link>
      </div>
    </el-scrollbar>

    <!-- 右键上下文菜单 -->
    <teleport to="body">
      <div
        v-show="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
        @click.stop
      >
        <div
          class="context-menu-item"
          @click="refreshSelectedTag"
        >
          <el-icon><Refresh /></el-icon>刷新
        </div>
        <div
          v-if="selectedTag && !selectedTag.affix"
          class="context-menu-item"
          @click="closeSelectedTag"
        >
          <el-icon><Close /></el-icon>关闭
        </div>
        <div
          class="context-menu-item"
          @click="closeOtherTags"
        >
          <el-icon><CircleClose /></el-icon>关闭其他
        </div>
        <div
          class="context-menu-item"
          @click="closeAllTags"
        >
          <el-icon><Remove /></el-icon>关闭全部
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Close, Refresh, CircleClose, Remove } from '@element-plus/icons-vue';
import { useTagsStore } from '@/stores/tags.store';
import type { TagView } from '@/stores/tags.store';

// 路由实例
const route = useRoute();
const router = useRouter();

// Tags Store
const tagsStore = useTagsStore();

// 滚动条组件引用（用于自动滚动到激活标签）
const scrollbarRef = ref();

// ====== 计算属性 ======

/** 标签列表 */
const tags = computed(() => tagsStore.tags);

// ====== 右键上下文菜单状态 ======

const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const selectedTag = ref<TagView | null>(null);

// ====== 方法 ======

/**
 * 判断标签是否为当前激活状态
 */
function isActive(tag: TagView): boolean {
  return tag.name === tagsStore.activeTag;
}

/**
 * 关闭标签
 */
function handleClose(tag: TagView): void {
  tagsStore.removeTag(tag.name);

  // 如果关闭的是当前标签，需要导航到新激活的标签
  if (isActive(tag)) {
    const newActiveTag = tagsStore.currentActiveTag;
    if (newActiveTag) {
      router.push({ path: newActiveTag.path, query: newActiveTag.query });
    }
  }
}

/**
 * 打开右键上下文菜单
 */
function openContextMenu(event: MouseEvent, tag: TagView): void {
  // 阻止默认右键菜单
  event.preventDefault();

  // 设置选中的标签和菜单位置
  selectedTag.value = tag;
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuVisible.value = true;
}

/**
 * 关闭上下文菜单
 */
function closeContextMenu(): void {
  contextMenuVisible.value = false;
  selectedTag.value = null;
}

/**
 * 刷新当前选中标签（清除 keep-alive 缓存后重新导航）
 */
function refreshSelectedTag(): void {
  if (!selectedTag.value) return;

  const { path, query } = selectedTag.value;
  closeContextMenu();

  // 通过 /redirect 实现刷新（清除缓存）
  router.replace({
    path: '/redirect' + path,
    query,
  });
}

/**
 * 关闭当前选中标签
 */
function closeSelectedTag(): void {
  if (selectedTag.value) {
    handleClose(selectedTag.value);
  }
  closeContextMenu();
}

/**
 * 关闭其他标签
 */
function closeOtherTags(): void {
  tagsStore.closeOtherTags();
  closeContextMenu();

  // 导航到当前激活的标签
  const activeTag = tagsStore.currentActiveTag;
  if (activeTag && activeTag.name !== route.name) {
    router.push({ path: activeTag.path, query: activeTag.query });
  }
}

/**
 * 关闭所有标签
 */
function closeAllTags(): void {
  tagsStore.closeAllTags();
  closeContextMenu();

  // 导航到第一个固定标签或首页
  const firstAffixTag = tagsStore.tags.find((tag) => tag.affix);
  if (firstAffixTag) {
    router.push({ path: firstAffixTag.path });
  } else {
    router.push('/');
  }
}

/**
 * 点击页面其他区域时关闭上下文菜单
 */
function handleGlobalClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  // 如果点击的不是上下文菜单本身，则关闭
  if (!target.closest('.context-menu')) {
    closeContextMenu();
  }
}

// ====== 监听器 ======

// 监听路由变化，自动添加标签
watch(
  () => route.fullPath,
  () => {
    tagsStore.addTag(route);
  },
  { immediate: true }
);

// 监听标签变化，自动滚动到激活标签
watch(
  () => tagsStore.activeTag,
  () => {
    scrollToActiveTag();
  }
);

/**
 * 将激活的标签滚动到可视区域
 */
function scrollToActiveTag(): void {
  // TODO: 实现 scrollIntoView 逻辑
  // 需要获取当前激活标签的 DOM 元素并调用 scrollIntoView
}

// ====== 生命周期 ======

onMounted(() => {
  // 监听全局点击事件，用于关闭上下文菜单
  document.addEventListener('click', handleGlobalClick);
});

onBeforeUnmount(() => {
  // 移除监听器
  document.removeEventListener('click', handleGlobalClick);
});
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 34px; // 固定高度
  width: 100%;
  background-color: #fff;
  border-bottom: 1px solid #d8dce5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .tags-scroll-container {
    height: 100%;
    :deep(.el-scrollbar__wrap) {
      overflow-x: auto;
      overflow-y: hidden;
    }

    :deep(.el-scrollbar__view) {
      display: flex;
      align-items: center;
      height: 100%;
    }
  }

  .tags-wrapper {
    display: flex;
    align-items: center;
    padding: 0 10px;
    height: 100%;

    .tags-view-item {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 10px;
      margin-right: 6px;
      height: 26px;
      line-height: 26px;
      font-size: 12px;
      color: #495060;
      background-color: #fff;
      border: 1px solid #d8dce5;
      border-radius: 3px; // 增加圆角
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        color: #409eff;
        border-color: #409eff;

        .tag-close {
          opacity: 1;
        }
      }

      &.is-active {
        background-color: #ecf5ff; // 浅蓝色背景
        color: #409eff; // 蓝色文字
        border-color: #409eff; // 蓝色边框

        &:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: #409eff; // 蓝色顶部指示条
          border-radius: 3px 3px 0 0;
        }

        .tag-close {
          opacity: 1;
          color: #409eff;
        }
      }

      .tag-title {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tag-close {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        opacity: 0;
        transition: all 0.3s ease;

        &:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}

/* 右键上下文菜单样式 */
.context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 120px;
  padding: 4px 0;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
    color: #303133;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #f5f7fa;
      color: #409eff;
    }

    .el-icon {
      font-size: 14px;
    }
  }
}
</style>
