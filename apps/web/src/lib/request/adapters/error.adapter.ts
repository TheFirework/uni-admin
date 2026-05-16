import { ElMessage, ElNotification } from 'element-plus';
import type { ErrorNotifier } from '@uni-admin/request';

export class ElementPlusErrorNotifier implements ErrorNotifier {
  success(message: string): void {
    ElMessage.success({ message, duration: 3000 });
  }

  error(message: string): void {
    ElMessage.error({ message, duration: 5000 });
  }

  warning(message: string): void {
    ElMessage.warning({ message, duration: 4000 });
  }

  info(message: string): void {
    ElMessage.info({ message, duration: 3000 });
  }
}

export const elementPlusNotifier = new ElementPlusErrorNotifier();
