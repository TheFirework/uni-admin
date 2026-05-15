import type { FormItemRule } from 'element-plus'

export interface ModalFormField {
  /** 字段属性名 */
  prop: string
  /** 字段标签文本 */
  label: string
  /** 字段类型 */
  type?: 'input' | 'textarea' | 'number' | 'select' | 'radio' | 'switch' | 'date'
  /** 占位符文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 校验规则 */
  rules?: FormItemRule[]

  // 输入框 / 文本域 相关
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