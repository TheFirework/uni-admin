<template>
  <el-tag v-if="matched" :type="tagType || 'info'">{{ label }}</el-tag>
  <span v-else>{{ value }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { getDictItems } from '@/api/modules/system.api';
import type { DictItem } from '@/api/modules/system.api';

interface Props {
  dictCode: string;
  value: string | number;
}

const props = defineProps<Props>();

const label = ref('');
const tagType = ref('');
const matched = ref(false);

async function resolveLabel() {
  if (!props.dictCode) {
    matched.value = false;
    return;
  }

  const items = await getDictItems(props.dictCode);
  const found = items.find((item) => item.dictValue === String(props.value));

  if (found) {
    label.value = found.dictLabel;
    tagType.value = found.tagType || 'info';
    matched.value = true;
  } else {
    label.value = String(props.value);
    matched.value = false;
  }
}

watch(() => [props.dictCode, props.value], resolveLabel, { immediate: true });
onMounted(resolveLabel);
</script>
