<template>
  <div class="captcha-input">
    <!-- 验证码文本输入框 -->
    <el-input
      :model-value="modelValue"
      placeholder="请输入验证码"
      size="large"
      maxlength="6"
      @update:model-value="$emit('update:modelValue', $event)"
      @keyup.enter="$emit('enter')"
    />

    <!-- 验证码图片区域 -->
    <div class="captcha-image-wrapper" @click="handleRefresh">
      <!-- 加载中状态 -->
      <div v-if="loading" class="captcha-loading">
        <Icon icon="mdi:loading" class="spin-icon" />
        <span>加载中...</span>
      </div>

      <!-- 图片显示 -->
      <img
        v-else-if="captchaImage"
        :src="captchaImage"
        alt="验证码"
        class="captcha-img"
        title="点击刷新验证码"
        @error="handleError"
      />

      <!-- 错误/占位状态 -->
      <div v-else class="captcha-placeholder">
        <Icon icon="mdi:refresh" class="refresh-icon" />
        <span>点击刷新</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

/**
 * CaptchaInput 组件 Props
 */
interface Props {
  /** 验证码文本值（v-model） */
  modelValue?: string;
  /** Base64 编码的验证码图片（完整 data URI 格式） */
  captchaImage?: string;
  /** 是否正在加载 */
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  captchaImage: '',
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'refresh'): void;
  (e: 'error'): void;
  (e: 'enter'): void;
}>();

/** 点击刷新验证码 */
const handleRefresh = () => {
  if (!props.loading) {
    emit('refresh');
  }
};

/** 图片加载失败 */
const handleError = () => {
  emit('error');
};
</script>

<style lang="scss" scoped>
.captcha-input {
  display: flex;
  gap: 12px;
  align-items: stretch;

  // 输入框占据剩余空间
  :deep(.el-input) {
    flex: 1;
  }
}

.captcha-image-wrapper {
  width: 120px;
  height: var(--el-component-size-large); // 与 el-input large 尺寸一致
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F9FAFB;
  transition: all 0.2s ease;

  &:hover {
    border-color: #5B9BD5;
    background-color: #fff;

    .refresh-icon {
      transform: rotate(180deg);
    }
  }

  &:active {
    transform: scale(0.98);
  }
}

.captcha-loading,
.captcha-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #9CA3AF;
  font-size: 12px;

  .spin-icon {
    font-size: 20px;
    animation: spin 1s linear infinite;
  }

  .refresh-icon {
    font-size: 20px;
    transition: transform 0.3s ease;
  }
}

.captcha-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
