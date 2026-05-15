import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import App from './App.vue';
import router from './router/index.js';
import { env } from './utils/env.config';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

if (env.enableMock) {
  import('./mocks/browser.js').then(({ worker }) => {
    worker.start({ onUnhandledRequest: 'bypass' });
  }).catch(() => { });
}

app.mount('#app');
