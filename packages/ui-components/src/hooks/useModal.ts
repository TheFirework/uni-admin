import { ref } from 'vue';

/**
 * 弹窗组合式函数
 * 封装弹窗显示/隐藏控制
 */
export function useModal(initialVisible = false) {
  const visible = ref(initialVisible);

  /** 打开弹窗 */
  const open = () => {
    visible.value = true;
  };

  /** 关闭弹窗 */
  const close = () => {
    visible.value = false;
  };

  /** 切换弹窗状态 */
  const toggle = () => {
    visible.value = !visible.value;
  };

  return {
    visible,
    open,
    close,
    toggle,
  };
}
