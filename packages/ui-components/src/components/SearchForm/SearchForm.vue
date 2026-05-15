<template>
  <el-form
    ref="formRef"
    :model="modelValue"
    :label-width="labelWidth"
    :label-position="labelPosition"
    @submit.prevent="handleSearch"
  >
    <el-row :gutter="16">
      <el-col
        v-for="(field, index) in fields"
        :key="field.prop"
        :span="field.span || 6"
      >
        <!-- 输入框 -->
        <el-form-item
          v-if="field.type === 'input' || !field.type"
          :label="field.label"
          :prop="field.prop"
          :rules="field.rules"
        >
          <el-input
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            :clearable="field.clearable !== false"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <!-- 选择器 -->
        <el-form-item
          v-else-if="field.type === 'select'"
          :label="field.label"
          :prop="field.prop"
          :rules="field.rules"
        >
          <el-select
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            :clearable="field.clearable !== false"
            :multiple="field.multiple"
            style="width: 100%"
          >
            <el-option
              v-for="option in field.options || []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <!-- 日期选择器 -->
        <el-form-item
          v-else-if="field.type === 'date'"
          :label="field.label"
          :prop="field.prop"
          :rules="field.rules"
        >
          <el-date-picker
            v-model="modelValue[field.prop]"
            :type="field.dateType || 'date'"
            :placeholder="field.placeholder || `请选择${field.label}`"
            :value-format="field.valueFormat || 'YYYY-MM-DD'"
            style="width: 100%"
          />
        </el-form-item>

        <!-- 日期范围选择器 -->
        <el-form-item
          v-else-if="field.type === 'daterange'"
          :label="field.label"
          :prop="field.prop"
          :rules="field.rules"
        >
          <el-date-picker
            v-model="modelValue[field.prop]"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :value-format="field.valueFormat || 'YYYY-MM-DD'"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>

      <!-- 操作按钮列 -->
      <el-col :span="buttonSpan" class="search-form-actions">
        <el-button type="primary" :icon="Search" @click="handleSearch">
          搜索
        </el-button>
        <el-button :icon="RefreshRight" @click="handleReset">
          重置
        </el-button>
        <!-- 插槽：额外按钮 -->
        <slot name="extra-buttons" />
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Search, RefreshRight } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'

// 定义 Props
interface SearchFormField {
  prop: string
  label: string
  type?: 'input' | 'select' | 'date' | 'daterange'
  placeholder?: string
  span?: number
  clearable?: boolean
  rules?: any[]
  options?: Array<{ label: string; value: any }>
  multiple?: boolean
  dateType?: string
  valueFormat?: string
}

interface Props {
  fields: SearchFormField[]
  modelValue: Record<string, any>
  labelWidth?: string | number
  labelPosition?: 'left' | 'right' | 'top'
  buttonSpan?: number
}

const props = withDefaults(defineProps<Props>(), {
  labelWidth: 'auto',
  labelPosition: 'right',
  buttonSpan: 6,
})

// 定义 Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'search', params: Record<string, any>): void
  (e: 'reset'): void
}>()

// 表单引用
const formRef = ref<FormInstance>()

/**
 * 处理搜索事件
 */
const handleSearch = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      emit('search', { ...props.modelValue })
    }
  })
}

/**
 * 处理重置事件
 */
const handleReset = () => {
  formRef.value?.resetFields()
  // 重置 modelValue 为空对象
  const resetValues: Record<string, any> = {}
  Object.keys(props.modelValue).forEach((key) => {
    resetValues[key] = undefined
  })
  emit('update:modelValue', resetValues)
  emit('reset')
}
</script>

<style scoped lang="scss">
.search-form-actions {
  display: flex;
  align-items: flex-end;
  padding-bottom: 4px; // 与表单项对齐
}
</style>