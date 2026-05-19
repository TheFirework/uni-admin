<template>
  <div class="page-loading">
    <!-- 品牌文字（带呼吸动画） -->
    <div class="brand-text">
      UniAdmin
    </div>

    <!-- 加载提示文案 -->
    <div class="loading-hint">
      <!-- 三点脉冲动画 -->
      <span class="pulse-dots">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </span>
      <span class="hint-text">{{ hint || defaultHint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/app.store';

/** 组件 Props */
const props = withDefaults(
  defineProps<{
    /** 自定义加载提示文案（可选） */
    hint?: string;
  }>(),
  {
    hint: '',
  }
);

const appStore = useAppStore();

/** 根据页面类型选择默认提示文案 */
const defaultHint = computed(() => {
  if (appStore.pageLoadType === 'initial') {
    return '正在初始化系统...';
  }
  return '正在加载资源...';
});
</script>

<style scoped>
.page-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #001529;
  z-index: 9999;
}

/* 品牌文字 - 呼吸动画效果 */
.brand-text {
  font-size: 48px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 4px;
  margin-bottom: 40px;
  /* 呼吸动画：透明度在 0.5-1.0 之间循环，周期 2s */
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* 加载提示区域 */
.loading-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

/* 三点脉冲动画容器 */
.pulse-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* 单个脉冲点 */
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #1890ff;
  /* 依次缩放动画：每个点延迟 0.15s */
  animation: pulse-scale 1.5s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.15s;
}

.dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes pulse-scale {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}
</style>
