import { ref, unref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

/**
 * 表单组合式函数
 * 封装表单校验与提交逻辑
 */
export function useForm<T extends Record<string, unknown> = Record<string, unknown>>(
  initialValues?: Partial<T>
) {
  const formRef = ref<FormInstance | null>(null);
  const model = ref<Partial<T>>({ ...initialValues } || {});
  const loading = ref(false);

  /**
   * 校验表单
   */
  const validate = async (): Promise<boolean> => {
    if (!formRef.value) return false;
    try {
      await formRef.value.validate();
      return true;
    } catch {
      return false;
    }
  };

  /**
   * 重置表单
   */
  const resetFields = () => {
    formRef.value?.resetFields();
    model.value = { ...initialValues } || {};
  };

  /**
   * 清除校验状态
   */
  const clearValidate = () => {
    formRef.value?.clearValidate();
  };

  /**
   * 提交表单
   * @param submitFn - 提交回调函数
   */
  const submit = async (submitFn: (values: Partial<T>) => Promise<void>): Promise<boolean> => {
    const valid = await validate();
    if (!valid) return false;

    loading.value = true;
    try {
      await submitFn(unref(model));
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    formRef,
    model,
    loading,
    validate,
    resetFields,
    clearValidate,
    submit,
  };
}
