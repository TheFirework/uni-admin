import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRoute, type RouteLocationNormalized } from 'vue-router';

// ====== 类型定义 ======

/** 标签项数据结构 */
export interface TagView {
  name: string;                  // 路由名称（作为 keep-alive 的 key）
  path: string;                  // 路由路径
  title: string;                 // 显示标题（来自 meta.title）
  query?: Record<string, any>;   // 查询参数
  affix?: boolean;               // 是否固定（不可关闭）
  noCache?: boolean;             // 是否不缓存
}

// ====== Store 定义 ======

export const useTagsStore = defineStore('tags', {
  state: () => ({
    /** 标签列表（存储在内存中，后续可持久化到 sessionStorage） */
    tags: ref<TagView[]>([]),

    /** 当前激活的标签名称 */
    activeTag: ref<string>(''),
  }),

  getters: {
    /**
     * 缓存的视图名称列表（用于 keep-alive :include）
     * 过滤掉 noCache=true 的标签
     */
    cachedViews: (state): string[] => {
      return state.tags
        .filter((tag) => !tag.noCache)
        .map((tag) => tag.name);
    },

    /** 当前激活的标签对象 */
    currentActiveTag: (state): TagView | undefined => {
      return state.tags.find((tag) => tag.name === state.activeTag);
    },
  },

  actions: {
    /**
     * 添加新标签
     * 如果已存在则不重复添加，仅切换激活状态
     */
    addTag(route: RouteLocationNormalized): void {
      // 检查是否为隐藏路由（不在标签栏显示）
      if (route.meta?.hidden) return;

      // 构建标签数据
      const tag: TagView = {
        name: route.name as string,
        path: route.path,
        title: (route.meta?.title as string) || route.name as string,
        query: { ...route.query },
        affix: route.meta?.affix as boolean || false,
        noCache: route.meta?.noCache as boolean || false,
      };

      // 检查是否已存在
      const exists = this.tags.some((t) => t.name === tag.name);

      if (!exists) {
        // 新标签添加到列表末尾
        this.tags.push(tag);

        console.log(`[Tags] 新增标签: ${tag.title} (${tag.name})`);
      }

      // 设置当前激活标签
      this.setActiveTag(tag.name);
    },

    /**
     * 移除指定标签
     * @param name 要移除的标签名称
     */
    removeTag(name: string): void {
      // 不允许移除固定标签
      const tag = this.tags.find((t) => t.name === name);
      if (tag?.affix) {
        console.warn(`[Tags] 无法移除固定标签: ${tag.title}`);
        return;
      }

      // 找到要移除的标签索引
      const index = this.tags.findIndex((t) => t.name === name);
      if (index === -1) return;

      // 移除标签
      this.tags.splice(index, 1);

      console.log(`[Tags] 移除标签: ${name}`);

      // 如果移除的是当前激活标签，需要切换到相邻标签
      if (this.activeTag === name) {
        this.activateAdjacentTag(index);
      }
    },

    /**
     * 关闭其他标签（保留当前标签和固定标签）
     */
    closeOtherTags(): void {
      const currentName = this.activeTag;

      // 过滤出需要保留的标签：固定标签 + 当前激活标签
      this.tags = this.tags.filter(
        (tag) => tag.affix || tag.name === currentName
      );

      console.log('[Tags] 关闭其他标签');
    },

    /**
     * 关闭所有非固定标签
     */
    closeAllTags(): void {
      // 仅保留固定标签
      this.tags = this.tags.filter((tag) => tag.affix);

      // 如果有固定标签，激活第一个固定标签
      if (this.tags.length > 0) {
        this.setActiveTag(this.tags[0].name);
      } else {
        this.activeTag = '';
      }

      console.log('[Tags] 关闭所有标签');
    },

    /**
     * 设置当前激活的标签
     * @param name 标签名称
     */
    setActiveTag(name: string): void {
      this.activeTag = name;
    },

    /**
     * 激活相邻标签（用于关闭当前标签后自动切换）
     * @param removedIndex 被移除标签的原索引
     */
    activateAdjacentTag(removedIndex: number): void {
      // 优先激活右边的标签
      if (removedIndex < this.tags.length) {
        this.activeTag = this.tags[removedIndex].name;
      }
      // 否则激活左边的标签
      else if (removedIndex > 0) {
        this.activeTag = this.tags[removedIndex - 1].name;
      }
      // 如果没有其他标签了
      else {
        this.activeTag = '';
      }
    },
  },
});
