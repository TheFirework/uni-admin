<template>
  <!-- 有子菜单的情况：渲染为 el-sub-menu -->
  <el-sub-menu
    v-if="hasChildren"
    :index="menu.path"
  >
    <template #title>
      <!-- 图标 -->
      <el-icon v-if="menu.meta?.icon">
        <Icon :icon="menu.meta.icon" />
      </el-icon>

      <!-- 标题文字 -->
      <span>{{ menu.meta.title }}</span>
    </template>

    <!-- 递归渲染子菜单 -->
    <MenuItem
      v-for="child in visibleChildren"
      :key="child.path"
      :menu="child"
      :base-path="resolvedPath"
    />
  </el-sub-menu>

  <!-- 无子菜单的叶子节点：渲染为 el-menu-item -->
  <el-menu-item
    v-else
    :index="resolvedPath"
    @click="handleMenuClick"
  >
    <!-- 图标 -->
    <el-icon v-if="menu.meta?.icon">
      <Icon :icon="menu.meta.icon" />
    </el-icon>

    <!-- 标题文字（template #title 用于折叠时 tooltip 显示） -->
    <template #title>
      <span>{{ menu.meta.title }}</span>
    </template>
  </el-menu-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MenuDTO } from '@/api/modules/system.api';
import { Icon } from '@iconify/vue';

// 定义 props
const props = defineProps<{
  menu: MenuDTO;           // 当前菜单项数据
  basePath?: string;       // 基础路径（父级路径）
}>();

/**
 * 判断是否有可见的子菜单
 */
const hasChildren = computed((): boolean => {
  return (
    props.menu.children &&
    props.menu.children.length > 0 &&
    // 过滤掉隐藏的子菜单后仍有内容
    props.menu.children.some((child) => !child.meta?.hidden)
  );
});

/**
 * 过滤后的可见子菜单列表
 */
const visibleChildren = computed((): MenuDTO[] => {
  if (!props.menu.children) return [];

  return props.menu.children.filter((child) => !child.meta?.hidden);
});

/**
 * 解析完整路径
 * 将相对路径转换为绝对路径
 * @param path 相对路径
 * @returns 绝对路径
 */
function resolvePath(path: string): string {
  const base = props.basePath || '';

  // 如果已经是绝对路径（以 / 开头），直接返回
  if (path.startsWith('/')) {
    return path;
  }

  // 拼接基础路径和当前路径
  return `${base}/${path}`.replace(/\/+/g, '/');
}

/**
 * 当前菜单项的完整解析路径
 */
const resolvedPath = computed((): string => {
  return resolvePath(props.menu.path);
});

/**
 * 处理菜单点击事件
 */
function handleMenuClick(): void {
  // 检查是否为外链类型
  const externalLink = props.menu.meta?.externalLink;

  if (externalLink) {
    // 外部链接：在新窗口打开
    window.open(externalLink, '_blank');
    return;
  }

  // 内部路由：由 el-menu 的 router 属性自动处理导航
  console.log(`[MenuItem] 点击菜单: ${props.menu.meta.title} (${resolvedPath.value})`);
}
</script>

<script lang="ts">
// 必须显式声明组件名称，以便递归调用
export default {
  name: 'MenuItem',
};
</script>
