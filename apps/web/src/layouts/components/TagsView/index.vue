<template>
  <div class="tags-view-container">
    <!-- 标签滚动容器 -->
    <el-scrollbar
      ref="scrollbarRef"
      class="tags-scroll-container"
      :always="false"
      @scroll="handleScroll"
      @wheel="handleWheelScroll"
    >
      <div ref="tagsWrapperRef" class="tags-wrapper">
        <router-link
          v-for="tag in tags"
          :key="tag.path"
          :ref="(el) => setTagRef(el, tag)"
          :to="{ path: tag.path, query: tag.query }"
          class="tags-view-item"
          :class="{ 'is-active': isActive(tag) }"
          @contextmenu.prevent="openContextMenu($event, tag)"
        >
          <span class="tag-title">{{ tag.title }}</span>

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

    <!-- 右侧操作区：下拉菜单按钮 -->
    <div class="tags-action">
      <el-dropdown
        trigger="click"
        placement="bottom-end"
        @command="handleDropdownCommand"
      >
        <span class="tags-dropdown-trigger">
          <el-icon :size="14"><ArrowDown /></el-icon>
          <span class="tags-count">{{ tags.length }}</span>
        </span>

        <template #dropdown>
          <el-dropdown-menu class="tags-dropdown-menu">
            <el-dropdown-item
              v-for="tag in tags"
              :key="tag.name"
              :command="{ action: 'navigate', tag }"
              :class="{ 'is-active': isActive(tag) }"
            >
              <span class="dropdown-tag-title">{{ tag.title }}</span>
              <el-icon
                v-if="!tag.affix"
                class="dropdown-tag-close"
                @click.stop.prevent="handleClose(tag)"
              >
                <Close />
              </el-icon>
            </el-dropdown-item>

            <el-dropdown-item divided command="closeOther">
              <el-icon><CircleClose /></el-icon>关闭其他
            </el-dropdown-item>
            <el-dropdown-item command="closeAll">
              <el-icon><Remove /></el-icon>关闭全部
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 右键上下文菜单 -->
    <teleport to="body">
      <div
        v-show="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
        @click.stop
      >
        <div class="context-menu-item" @click="refreshSelectedTag">
          <el-icon><Refresh /></el-icon>刷新
        </div>
        <div
          v-if="selectedTag && !selectedTag.affix"
          class="context-menu-item"
          @click="closeSelectedTag"
        >
          <el-icon><Close /></el-icon>关闭
        </div>
        <div class="context-menu-item" @click="closeOtherTags">
          <el-icon><CircleClose /></el-icon>关闭其他
        </div>
        <div class="context-menu-item" @click="closeAllTags">
          <el-icon><Remove /></el-icon>关闭全部
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Close, Refresh, CircleClose, Remove, ArrowDown } from '@element-plus/icons-vue';
import { useTagsStore } from '@/stores/tags.store';
import type { TagView } from '@/stores/tags.store';

const route = useRoute();
const router = useRouter();
const tagsStore = useTagsStore();

const scrollbarRef = ref();
const tagsWrapperRef = ref<HTMLElement>();

const tagRefsMap = new Map<string, HTMLElement>();

const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const selectedTag = ref<TagView | null>(null);

const dropdownVisible = ref(false);

/** 标签列表（解包 ref） */
const tags = computed(() => tagsStore.tags);

function setTagRef(el: any, tag: TagView) {
  if (el) {
    tagRefsMap.set(tag.name, el.$el || el);
  }
}

function isActive(tag: TagView): boolean {
  return tag.name === tagsStore.activeTag;
}

function handleClose(tag: TagView): void {
  tagsStore.removeTag(tag.name);

  if (isActive(tag)) {
    const newActiveTag = tagsStore.currentActiveTag;
    if (newActiveTag) {
      router.push({ path: newActiveTag.path, query: newActiveTag.query });
    }
  }

  nextTick(() => scrollToActiveTag());
}

function openContextMenu(event: MouseEvent, tag: TagView): void {
  event.preventDefault();

  selectedTag.value = tag;
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuVisible.value = true;
}

function closeContextMenu(): void {
  contextMenuVisible.value = false;
  selectedTag.value = null;
}

function refreshSelectedTag(): void {
  if (!selectedTag.value) return;

  const { path, query } = selectedTag.value;
  closeContextMenu();

  router.replace({
    path: '/redirect' + path,
    query,
  });
}

function closeSelectedTag(): void {
  if (selectedTag.value) {
    handleClose(selectedTag.value);
  }
  closeContextMenu();
}

function closeOtherTags(): void {
  tagsStore.closeOtherTags();
  closeContextMenu();

  const activeTag = tagsStore.currentActiveTag;
  if (activeTag && activeTag.name !== route.name) {
    router.push({ path: activeTag.path, query: activeTag.query });
  }

  nextTick(() => scrollToActiveTag());
}

function closeAllTags(): void {
  tagsStore.closeAllTags();
  closeContextMenu();

  const firstAffixTag = tagsStore.tags.find((tag) => tag.affix);
  if (firstAffixTag) {
    router.push({ path: firstAffixTag.path });
  } else {
    router.push('/');
  }
}

function handleDropdownCommand(command: any): void {
  const { action, tag } = command;

  switch (action) {
    case 'navigate':
      if (tag) {
        router.push({ path: tag.path, query: tag.query });
      }
      break;
    case 'closeOther':
      closeOtherTags();
      break;
    case 'closeAll':
      closeAllTags();
      break;
  }
}

function handleGlobalClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  if (!target.closest('.context-menu') && !target.closest('.el-dropdown-menu')) {
    closeContextMenu();
  }
}

// ====== 滚动相关 ======

let scrollLeft = 0;

function handleScroll({ scrollLeft: left }: { scrollLeft: number }) {
  scrollLeft = left;
}

/**
 * 处理鼠标滚轮事件，实现水平滚动
 * 将垂直滚轮转换为水平滚动
 */
function handleWheelScroll(event: WheelEvent): void {
  // 阻止默认行为，避免页面同时滚动
  event.preventDefault();

  if (!scrollbarRef.value) return;

  const container = scrollbarRef.value.wrapRef as HTMLElement;
  if (!container) return;

  // 将滚轮的垂直滚动量转换为水平滚动
  // deltaY > 0 表示向下滚动 → 向右滚动（显示右侧标签）
  // deltaY < 0 表示向上滚动 → 向左滚动（显示左侧标签）
  const delta = event.deltaY || event.deltaX;
  const newScrollLeft = container.scrollLeft + delta;

  // 使用 Element Plus API 或原生方法设置滚动位置
  if (scrollbarRef.value.setScrollLeft) {
    scrollbarRef.value.setScrollLeft(newScrollLeft);
  } else {
    container.scrollLeft = newScrollLeft;
  }
}

/**
 * 将激活的标签滚动到可视区域中心
 */
async function scrollToActiveTag(): Promise<void> {
  await nextTick();

  const activeName = tagsStore.activeTag;
  if (!activeName || !tagsWrapperRef.value || !scrollbarRef.value) return;

  const activeEl = tagRefsMap.get(activeName);
  if (!activeEl) return;

  // 使用 Element Plus 滚动条 API
  const container = scrollbarRef.value.wrapRef as HTMLElement;
  if (!container) return;

  const containerWidth = container.clientWidth;
  const elementOffsetLeft = activeEl.offsetLeft;
  const elementWidth = activeEl.offsetWidth;

  // 计算目标滚动位置（居中显示）
  let targetScrollLeft = elementOffsetLeft - containerWidth / 2 + elementWidth / 2;

  // 边界限制
  const maxScroll = tagsWrapperRef.value.scrollWidth - containerWidth;
  targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

  // 使用 Element Plus 的 setScrollLeft 方法或原生 scroll
  if (Math.abs(targetScrollLeft - scrollLeft) > 5) {
    // 优先使用 Element Plus API
    if (scrollbarRef.value.setScrollLeft) {
      scrollbarRef.value.setScrollLeft(targetScrollLeft);
    } else {
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
  }
}

watch(
  () => route.fullPath,
  () => {
    tagsStore.addTag(route);
  },
  { immediate: true }
);

watch(
  () => tagsStore.activeTag,
  () => {
    scrollToActiveTag();
  }
);

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick);
});
</script>

<style lang="scss" scoped>
.tags-view-container {
  display: flex;
  align-items: center;
  height: 34px;
  width: 100%;
  background-color: #fff;
  border-bottom: 1px solid #d8dce5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .tags-scroll-container {
    flex: 1;
    height: 100%;

    :deep(.el-scrollbar__wrap) {
      overflow-x: auto;
      overflow-y: hidden;
      height: 100%;
    }

    :deep(.el-scrollbar__bar.is-horizontal) {
      height: 4px;
      bottom: 0;

      .el-scrollbar__thumb {
        background-color: #c0c4cc;
        border-radius: 2px;
        opacity: 0.3;
        transition: opacity 0.3s;

        &:hover {
          opacity: 0.6;
          background-color: #909399;
        }
      }
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
    flex-shrink: 0;

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
      border-radius: 3px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
      flex-shrink: 0;

      &:hover {
        color: #409eff;
        border-color: #409eff;

        .tag-close {
          opacity: 1;
        }
      }

      &.is-active {
        background-color: #ecf5ff;
        color: #409eff;
        border-color: #409eff;

        &:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: #409eff;
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

  .tags-action {
    flex-shrink: 0;
    padding: 0 12px;
    border-left: 1px solid #e6e8eb;
    height: 100%;
    display: flex;
    align-items: center;

    .tags-dropdown-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      cursor: pointer;
      color: #5a5e66;
      font-size: 12px;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        color: #409eff;
        background-color: #f5f7fa;
      }

      .tags-count {
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        background-color: #f0f2f5;
        border-radius: 8px;
        font-size: 11px;
        color: #909399;
      }
    }
  }
}

.tags-dropdown-menu {
  max-height: 300px;
  overflow-y: auto;

  .el-dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: 13px;

    &.is-active {
      color: #409eff;
      background-color: #ecf5ff;
    }

    .dropdown-tag-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }

    .dropdown-tag-close {
      opacity: 0;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }

    &:hover {
      .dropdown-tag-close {
        opacity: 1;
      }
    }
  }
}

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
