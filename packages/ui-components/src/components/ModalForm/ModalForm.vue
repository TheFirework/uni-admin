<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    :width="width"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="true"
    :destroy-on-close="destroyOnClose"
    @update:model-value="handleVisibleChange"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-width="labelWidth"
      :label-position="labelPosition"
      class="modal-form"
    >
      <el-form-item
        v-for="field in formFields"
        :key="field.prop"
        :label="field.label"
        :prop="field.prop"
      >
        <!-- 输入框 -->
        <el-input
          v-if="field.type === 'input' || !field.type"
          v-model="formData[field.prop]"
          :type="field.inputType || 'text'"
          :placeholder="field.placeholder || `请输入${field.label}`"
          :disabled="field.disabled"
          :maxlength="field.maxlength"
          :show-word-limit="field.showWordLimit"
          :rows="field.rows"
          :autosize="field.autosize"
        />

        <!-- 文本域 -->
        <el-input
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.prop]"
          type="textarea"
          :placeholder="field.placeholder || `请输入${field.label}`"
          :disabled="field.disabled"
          :maxlength="field.maxlength"
          :show-word-limit="field.showWordLimit !== false"
          :rows="field.rows || 4"
          :autosize="field.autosize"
        />

        <!-- 数字输入 -->
        <el-input-number
          v-else-if="field.type === 'number'"
          v-model="formData[field.prop]"
          :min="field.min"
          :max="field.max"
          :step="field.step || 1"
          :precision="field.precision"
          :disabled="field.disabled"
          style="width: 100%"
        />

        <!-- 选择器 -->
        <el-select
          v-else-if="field.type === 'select'"
          v-model="formData[field.prop]"
          :placeholder="field.placeholder || `请选择${field.label}`"
          :disabled="field.disabled"
          :multiple="field.multiple"
          :clearable="field.clearable !== false"
          style="width: 100%"
        >
          <el-option
            v-for="option in field.options || []"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <!-- 单选框组 -->
        <el-radio-group
          v-else-if="field.type === 'radio'"
          v-model="formData[field.prop]"
          :disabled="field.disabled"
        >
          <el-radio
            v-for="option in field.options || []"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </el-radio>
        </el-radio-group>

        <!-- 开关 -->
        <el-switch
          v-else-if="field.type === 'switch'"
          v-model="formData[field.prop]"
          :disabled="field.disabled"
          :active-text="field.activeText"
          :inactive-text="field.inactiveText"
        />

        <!-- 日期选择器 -->
        <el-date-picker
          v-else-if="field.type === 'date'"
          v-model="formData[field.prop]"
          :type="field.dateType || 'date'"
          :placeholder="field.placeholder || `请选择${field.label}`"
          :value-format="field.valueFormat || 'YYYY-MM-DD'"
          :disabled="field.disabled"
          style="width: 100%"
        />

        <!-- 插槽：自定义字段渲染 -->
        <slot
          :name="`field-${field.prop}`"
          :field="field"
          :value="formData[field.prop]"
          :update-value="(val: any) => (formData[field.prop] = val)"
        />
      </el-form-item>
    </el-form>

    <!-- 底部按钮区域 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取 消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          确 定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormItemRule } from 'element-plus'

// 定义字段配置类型
interface ModalFormField {
  prop: string
  label: string
  type?: 'input' | 'textarea' | 'number' | 'select' | 'radio' | 'switch' | 'date'
  placeholder?: string
  disabled?: boolean
  rules?: FormItemRule[]

  // 输入框相关
  inputType?: string
  maxlength?: number
  showWordLimit?: boolean
  rows?: number
  autosize?: { minRows?: number; maxRows?: number }

  // 数字输入相关
  min?: number
  max?: number
  step?: number
  precision?: number

  // 选择器相关
  options?: Array<{ label: string; value: any }>
  multiple?: boolean
  clearable?: boolean

  // 开关相关
  activeText?: string
  inactiveText?: string

  // 日期选择器相关
  dateType?: string
  valueFormat?: string
}

interface Props {
  visible: boolean
  title: string
  formFields: ModalFormField[]
  modelValue?: Record<string, any>
  width?: string | number
  labelWidth?: string | number
  labelPosition?: 'left' | 'right' | 'top'
  loading?: boolean
  closeOnClickModal?: boolean
  destroyOnClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '520px',
  labelWidth: '100px',
  labelPosition: 'right',
  loading: false,
  closeOnClickModal: false,
  destroyOnClose: true,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'submit', data: Record<string, any>): void
  (e: 'cancel'): void
}>()

// 表单引用和表单数据
const formRef = ref<FormInstance>()
const formData = reactive<Record<string, any>>({})

// 从 fields 中提取校验规则
const formRules = computed(() => {
  const rules: Record<string, FormItemRule[]> = {}
  props.formFields.forEach((field) => {
    if (field.rules && field.rules.length > 0) {
      rules[field.prop] = field.rules
    }
  })
  return rules
})

/**
 * 监听外部传入的 modelValue，用于编辑场景的数据回填
 */
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      Object.keys(formData).forEach((key) => delete formData[key])
      Object.assign(formData, newVal)
    }
  },
  { immediate: true, deep: true }
)

/**
 * 监听 dialog 打开状态，重置表单数据
 */
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 初始化表单数据（使用空值或默认值）
      props.formFields.forEach((field) => {
        if (!(field.prop in formData)) {
          formData[field.prop] = undefined
        }
      })
      // 如果有初始值则回填
      if (props.modelValue) {
        Object.assign(formData, props.modelValue)
      }
    }
  }
)

/**
 * 处理 dialog 可见性变化
 */
const handleVisibleChange = (value: boolean) => {
  emit('update:visible', value)
}

/**
 * 处理提交事件
 */
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (valid) {
    emit('submit', { ...formData })
  }
}

/**
 * 处理取消事件
 */
const handleCancel = () => {
  emit('update:visible', false)
  emit('cancel')
}
</script>

<style scoped lang="scss">
.modal-form {
  .el-select,
  .el-date-editor {
    width: 100%;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>