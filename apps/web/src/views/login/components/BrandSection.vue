<template>
  <aside class="brand-section">
    <div class="brand-content">
      <!-- 图标插槽（默认使用 Iconify） -->
      <slot name="icon">
        <Icon
          :icon="icon"
          class="brand-icon"
        />
      </slot>

      <!-- 产品名称 -->
      <h1 class="brand-title">
        {{ title }}
      </h1>

      <!-- Slogan 副标题 -->
      <p class="brand-slogan">
        {{ slogan }}
      </p>

      <!-- 默认插槽（自定义内容） -->
      <slot />

      <!-- 底部版权信息 -->
      <slot name="footer">
        <p class="copyright">
          © {{ currentYear }} {{ title }}. All rights reserved.
        </p>
      </slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

/**
 * BrandSection 组件 Props
 */
interface Props {
  /** Iconify 图标标识符，如 'mdi:office-building-outline' */
  icon?: string;
  /** 产品名称 */
  title?: string;
  /** 标语/副标题 */
  slogan?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'mdi:office-building-coutline',
  title: 'Uni-Admin',
  slogan: '统一企业管理平台',
});

// 当前年份（用于版权信息）
const currentYear = computed(() => new Date().getFullYear());
</script>

<style lang="scss" scoped>
.brand-section {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8F4FD 0%, #F0E6FA 100%);
  padding: 40px;
  min-height: 100vh;

  @media (max-width: 991px) {
    display: none; // 移动端隐藏
  }
}

.brand-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 360px;
}

.brand-icon {
  font-size: 64px;
  color: #5B9BD5;
  margin-bottom: 20px;
}

.brand-title {
  font-size: 32px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.brand-slogan {
  font-size: 16px;
  color: #6B7280;
  margin: 0 0 auto;
  line-height: 1.6;
}

.copyright {
  margin-top: auto;
  padding-top: 32px;
  font-size: 12px;
  color: #9CA3AF;
}
</style>
