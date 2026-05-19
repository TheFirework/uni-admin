import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRoute, type RouteLocationNormalized } from 'vue-router';

// ====== 类型定义 ======

export interface TagView {
  name: string;
  path: string;
  title: string;
  query?: Record<string, any>;
  affix?: boolean;
  noCache?: boolean;
}

/**
 * 不应在标签栏显示的路由路径
 * 包括：错误页面、登录页、重定向页等
 */
const EXCLUDED_PATHS = new Set([
  '/404',
  '/403',
  '/login',
  '/redirect',
]);

// ====== Store 定义 ======

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: ref<TagView[]>([]),
    activeTag: ref<string>(''),
  }),

  getters: {
    cachedViews: (state): string[] => {
      return state.tags
        .filter((tag) => !tag.noCache)
        .map((tag) => tag.name);
    },

    currentActiveTag: (state): TagView | undefined => {
      return state.tags.find((tag) => tag.name === state.activeTag);
    },
  },

  actions: {
    /**
     * 判断路由是否应该被排除（不在标签栏显示）
     */
    shouldExclude(route: RouteLocationNormalized): boolean {
      if (!route.name) return true;

      if (route.meta?.hidden) return true;

      if (EXCLUDED_PATHS.has(route.path)) return true;

      if (route.path.startsWith('/redirect')) return true;

      return false;
    },

    addTag(route: RouteLocationNormalized): void {
      if (this.shouldExclude(route)) return;

      const title = (route.meta?.title as string) || (route.name as string) || '未命名页面';

      const tag: TagView = {
        name: route.name as string,
        path: route.path,
        title,
        query: { ...route.query },
        affix: route.meta?.affix as boolean || false,
        noCache: route.meta?.noCache as boolean || false,
      };

      const exists = this.tags.some((t) => t.name === tag.name);

      if (!exists) {
        this.tags.push(tag);
      }

      this.setActiveTag(tag.name);
    },

    removeTag(name: string): void {
      const tag = this.tags.find((t) => t.name === name);
      if (tag?.affix) return;

      const index = this.tags.findIndex((t) => t.name === name);
      if (index === -1) return;

      this.tags.splice(index, 1);

      if (this.activeTag === name) {
        this.activateAdjacentTag(index);
      }
    },

    closeOtherTags(): void {
      const currentName = this.activeTag;

      this.tags = this.tags.filter(
        (tag) => tag.affix || tag.name === currentName
      );
    },

    closeAllTags(): void {
      this.tags = this.tags.filter((tag) => tag.affix);

      if (this.tags.length > 0) {
        this.setActiveTag(this.tags[0].name);
      } else {
        this.activeTag = '';
      }
    },

    setActiveTag(name: string): void {
      this.activeTag = name;
    },

    activateAdjacentTag(removedIndex: number): void {
      if (removedIndex < this.tags.length) {
        this.activeTag = this.tags[removedIndex].name;
      } else if (removedIndex > 0) {
        this.activeTag = this.tags[removedIndex - 1].name;
      } else {
        this.activeTag = '';
      }
    },
  },
});
