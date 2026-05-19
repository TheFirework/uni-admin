<template>
  <div class="remember-me">
    <!-- 复选框 -->
    <el-checkbox
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      {{ label }}
    </el-checkbox>

    <!-- 帮助提示 Tooltip -->
    <el-tooltip
      :content="tooltipContent"
      placement="top"
      :show-after="300"
      :hide-after="2000"
    >
      <Icon
        icon="mdi:information-outline"
        class="help-icon"
      />
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

/**
 * RememberMe 组件 Props
 */
interface Props {
  /** 是否勾选（v-model） */
  modelValue?: boolean;
  /** 复选框标签文字 */
  label?: string;
  /** Tooltip 帮助文本内容 */
  tooltipContent?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: '记住登录状态',
  tooltipContent:
    '勾选后，浏览器将记住您的登录状态，下次访问时自动填充用户名',
});

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<style lang="scss" scoped>
.remember-me {
  display: flex;
  align-items: center;
  gap: 4px;

  // 调整复选框样式
  :deep(.el-checkbox__label) {
    font-size: 14px;
    color: #6B7280;
  }
}

.help-icon {
  font-size: 16px;
  color: #9CA3AF;
  cursor: help;

  &:hover {
    color: #5B9BD5;
  }
}
</style>
