<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :filterable="filterable"
    :loading="loading"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-option
      v-for="item in options"
      :key="item.dictValue"
      :label="item.dictLabel"
      :value="item.dictValue"
    />
  </el-select>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { getDictItems } from '@/api/modules/system.api';
import type { DictItem } from '@/api/modules/system.api';

interface Props {
  dictCode: string;
  modelValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  filterable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  disabled: false,
  clearable: true,
  filterable: true,
});

defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

const options = ref<DictItem[]>([]);
const loading = ref(false);

// 同一 dictCode 的请求缓存，避免重复请求
const pendingMap = new Map<string, Promise<DictItem[]>>();

async function loadOptions() {
  if (!props.dictCode) return;

  if (pendingMap.has(props.dictCode)) {
    options.value = await pendingMap.get(props.dictCode)!;
    return;
  }

  loading.value = true;
  const promise = getDictItems(props.dictCode)
    .then((data) => {
      options.value = data;
      return data;
    })
    .finally(() => {
      loading.value = false;
      pendingMap.delete(props.dictCode);
    });

  pendingMap.set(props.dictCode, promise);
  await promise;
}

watch(() => props.dictCode, loadOptions, { immediate: true });
onMounted(loadOptions);
</script>
