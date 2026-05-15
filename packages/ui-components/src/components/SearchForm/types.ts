import type { FormItemRule } from 'element-plus'

export interface SearchFormField {
  /** 字段属性名（对应 modelValue 的 key） */
  prop: string
  /** 字段标签文本 */
  label: string
  /** 字段类型 */
  type?: 'input' | 'select' | 'date' | 'daterange'
  /** 占位符文本 */
  placeholder?: string
  /** 栅格占位格数（默认 6，总共 24 格） */
  span?: number
  /** 是否可清除（默认 true） */
  clearable?: boolean
  /** 校验规则 */
  rules?: FormItemRule[]
  /** 下拉选项（type=select 时使用） */
  options?: Array<{ label: string; value: any }>
  /** 是否多选（仅 type=select 时有效） */
  multiple?: boolean
  /** 日期类型（仅 type=date 时有效） */
  dateType?: string
  /** 日期格式化格式 */
  valueFormat?: string
}