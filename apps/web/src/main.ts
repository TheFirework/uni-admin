import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import { menuCacheManager } from '@/utils/cache/MenuCacheManager';
import { routerConfig } from '@/config/router.config';
import { useAppStore } from '@/stores/app.store';
import type { PageLoadType } from '@/stores/app.store';

import App from './App.vue';
import router from './router/index.js';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// 检测页面加载类型并初始化 App Store
const appStore = useAppStore();
const loadType = detectPageLoadType();
appStore.setPageLoadType(loadType);

console.log(`[Main] 页面加载类型: ${loadType}`);

menuCacheManager
  .initialize()
  .then(() => console.log('[Main] 缓存系统就绪'))
  .catch((err) => console.warn('[Main] 缓存初始化失败:', err));

if (import.meta.env.DEV) {
  console.log(`[Main] 路由模式: ${routerConfig.mode}`);
  console.log(`[Main] 缓存启用: ${routerConfig.cacheEnabled}`);

  // 临时诊断工具
  import('@/utils/debug-menu-data.ts');
  import('@/utils/workbench-diagnosis.ts');
  import('@/utils/check-component-map.ts');

  router.onError((error, to) => {
    console.error('💥 [Router Error] 路由导航错误:', {
      targetPath: to.path,
      targetName: to.name,
      error: error.message,
      stack: error.stack,
    });
  });

  app.config.errorHandler = (err, instance, info) => {
    console.error('💥 [Global Error] Vue 错误:', {
      error: err,
      info,
      component: instance?.$options?.name || 'Unknown',
    });
  };
}

app.mount('#app');

/**
 * 检测页面加载类型
 *
 * 策略：
 *   1. 优先使用 performance.navigation.type（type=1 表示刷新）
 *   2. 降级使用 sessionStorage 标志位检测
 *   3. 首次访问时写入 sessionStorage 标志，供后续刷新检测使用
 *
 * @returns 页面加载类型：'initial'（首次访问）或 'refresh'（刷新）
 */
function detectPageLoadType(): PageLoadType {
  // 策略1: 尝试使用 Performance Navigation API
  try {
    const navType = performance?.navigation?.type;
    // type=1 表示刷新，type=0 表示首次访问
    if (navType === 1) {
      return 'refresh';
    }
  } catch {
    // Performance API 不可用时降级到策略2
    console.warn('[Main] Performance Navigation API 不可用，降级使用 sessionStorage 检测');
  }

  // 策略2: 使用 sessionStorage 标志位检测
  const SESSION_KEY = '__uni_admin_init__';
  const hasInitFlag = sessionStorage.getItem(SESSION_KEY);

  if (hasInitFlag) {
    // 存在标志位，说明是刷新操作
    return 'refresh';
  }

  // 首次访问：写入标志位供后续刷新检测使用
  sessionStorage.setItem(SESSION_KEY, '1');
  return 'initial';
}

