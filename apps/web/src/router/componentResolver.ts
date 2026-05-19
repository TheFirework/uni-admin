/**
 * 共享组件解析器
 *
 * 统一管理 Vite glob 动态导入逻辑
 * 供 generateRoutes.ts 和 staticMenus.ts 复用
 *
 * 核心问题：
 *   Vite 的 import.meta.glob() 只支持静态字符串模式
 *   不支持运行时变量拼接路径（如 import(`@/${var}.vue`)）
 *
 * 解决方案：
 *   编译时使用静态 glob 模式预加载所有组件
 *   构建路径映射表（Map），运行时通过 Map.get() 查找
 */

// ====== 类型定义 ======

type ComponentImporter = () => Promise<unknown>;

// ====== 特殊组件映射 ======

const SPECIAL_COMPONENTS: Record<string, ComponentImporter> = {
  Layout: () => import('@/layouts/BasicLayout.vue'),
};

// ====== Vite Glob 静态导入 ======

/**
 * 静态导入所有 views 目录下的 index.vue 文件
 *
 * 使用 Vite 的 import.meta.glob API 进行编译时静态分析
 * eager: false 表示懒加载，访问时才加载
 */
const viewModules = import.meta.glob('@/views/**/index.vue', { eager: false });

// ====== 映射表构建 ======

/**
 * 组件路径映射表
 * key: 规范化后的组件路径（如 'system/user'）
 * value: 组件导入函数
 */
export const componentMap: Map<string, ComponentImporter> = (function buildMap() {
  const map = new Map<string, ComponentImporter>();

  for (const [fullPath, importer] of Object.entries(viewModules)) {
    // fullPath 示例: /src/views/system/user/index.vue
    // 提取相对路径: system/user

    const relativePath = fullPath
      .replace(/^\/src\/views\//, '')   // 去掉 /src/views/ 前缀
      .replace(/\.vue$/, '');           // 去掉 .vue 后缀

    // 注册原始路径
    map.set(relativePath, importer as ComponentImporter);

    // 去掉 /index 后缀再注册一次（兼容不同输入格式）
    const withoutIndexSuffix = relativePath.replace(/\/index$/, '');
    if (withoutIndexSuffix !== relativePath) {
      map.set(withoutIndexSuffix, importer as ComponentImporter);
    }

    // 去掉 views/ 前缀再注册一次（兼容后端返回带 views/ 前缀的情况）
    const withoutViewsPrefix = relativePath.replace(/^views\//, '');
    if (withoutViewsPrefix !== relativePath) {
      map.set(withoutViewsPrefix, importer as ComponentImporter);
      // 同时注册去掉 /index 后缀的版本
      const withoutBoth = withoutViewsPrefix.replace(/\/index$/, '');
      if (withoutBoth !== withoutViewsPrefix) {
        map.set(withoutBoth, importer as ComponentImporter);
      }
    }
  }

  return map;
})();

// ====== 公共 API ======

/**
 * 解析组件路径字符串为实际的组件导入函数
 *
 * 支持的输入格式：
 *   - 特殊值: 'Layout'
 *   - 完整路径: 'views/workbench/index'
 *   - 相对路径: 'system/user', 'system/role/index'
 *   - 绝对路径: '/system/user'
 *
 * @param componentStr 组件路径字符串
 * @returns 组件导入函数，如果找不到返回 null
 */
export function resolveComponent(componentStr: string | undefined): ComponentImporter | null {
  if (!componentStr) {
    console.warn(`[ComponentResolver] 组件路径为空`);
    return null;
  }

  // 1. 检查特殊组件
  if (SPECIAL_COMPONENTS[componentStr]) {
    return SPECIAL_COMPONENTS[componentStr];
  }

  // 2. 规范化路径
  const normalized = normalizeComponentPath(componentStr);

  // 3. 从映射表查找
  const importer = componentMap.get(normalized);
  if (importer) {
    console.log(`[ComponentResolver] ✓ 成功解析: "${componentStr}" → "${normalized}"`);
    return importer;
  }

  // 4. 尝试添加 /index 后缀查找
  const withIndex = `${normalized}/index`;
  const indexerImporter = componentMap.get(withIndex);
  if (indexerImporter) {
    console.log(`[ComponentResolver] ✓ 成功解析（带 /index）: "${componentStr}" → "${withIndex}"`);
    return indexerImporter;
  }

  // 5. 未找到，输出详细调试信息
  console.warn(
    `[ComponentResolver] ❌ 无法解析组件: "${componentStr}" (规范化后: "${normalized}")`,
    `\n可用的组件路径（共 ${componentMap.size} 个）:`,
    Array.from(componentMap.keys()).slice(0, 15).join(', '),
    componentMap.size > 15 ? `\n... 还有 ${componentMap.size - 15} 个` : ''
  );

  return null;
}

/**
 * 获取所有已注册的组件路径列表（用于调试）
 */
export function getRegisteredComponentPaths(): string[] {
  return Array.from(componentMap.keys());
}

/**
 * 规范化组件路径
 * 去除各种可能的前缀和后缀
 */
function normalizeComponentPath(path: string): string {
  return path
    .trim()
    .replace(/^\.+\//, '')          // 去掉 ../ 或 ./ 前缀
    .replace(/^\/+/, '')             // 去掉开头的 /
    .replace(/\/+$/, '')             // 去掉结尾的 /
    .replace(/^views\//, '')         // 去掉 views/ 前缀
    .replace(/\.vue$/, '');          // 去掉 .vue 后缀
}
