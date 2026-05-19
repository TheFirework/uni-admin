import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import { menuCacheManager } from '@/utils/cache/MenuCacheManager';
import { routerConfig } from '@/config/router.config';

import App from './App.vue';
import router from './router/index.js';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

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
