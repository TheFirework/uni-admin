/** 
 * 错误通知抽象接口
 * 支持不同的 UI 框架实现（Element Plus / Naive UI / Ant Design Vue / 自定义 Toast 等）
 * 
 * 通过依赖注入的方式，在 InstanceConfig 中传入具体的实现，
 * 使请求层与 UI 框架完全解耦。
 * 
 * @example
 * ```typescript
 * // Element Plus 实现
 * const elPlusNotifier: ErrorNotifier = {
 *   success: (msg) => ElMessage.success(msg),
 *   error: (msg) => ElMessage.error(msg),
 *   warning: (msg) => ElMessage.warning(msg),
 *   info: (msg) => ElMessage.info(msg),
 * };
 * 
 * // Naive UI 实现
 * const naiveNotifier: ErrorNotifier = {
 *   success: (msg) => message.success(msg),
 *   error: (msg) => message.error(msg),
 *   warning: (msg) => message.warning(msg),
 *   info: (msg) => message.info(msg),
 * };
 * 
 * // 使用
 * createRequestInstance({
 *   ...config,
 *   errorNotifier: elPlusNotifier,
 * });
 * ```
 */
export interface ErrorNotifier {
  /** 展示成功提示（如 Token 刷新成功、操作成功等） */
  success(message: string): void;
  
  /** 展示错误提示（业务错误、网络错误等，最常用） */
  error(message: string): void;
  
  /** 展示警告提示（如即将过期提醒等） */
  warning(message: string): void;
  
  /** 展示信息提示（中性消息） */
  info(message: string): void;
}
