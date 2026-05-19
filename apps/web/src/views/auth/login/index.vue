<template>
  <div class="login-page">
    <!-- 左侧品牌展示区 -->
    <BrandSection />

    <!-- 右侧登录表单区 -->
    <main class="login-form-section">
      <div class="login-container">
        <!-- 登录卡片（核心组件） -->
        <LoginCard
          :show-captcha="showCaptcha"
          :loading="loading"
          :captcha-image="captchaImage"
          :captcha-loading="captchaLoading"
          @submit="handleSubmit"
          @captcha-refresh="handleRefreshCaptcha"
          @forgot-password="handleForgotPassword"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

// 子组件
import BrandSection from './components/BrandSection.vue';
import LoginCard from './components/LoginCard.vue';

// API 和 Store
import { useAuthStore } from '@/stores/auth.store';
import * as authApi from '@/api/modules/auth.api';

/**
 * 登录页面主组件
 *
 * 职责：
 * - 组合 BrandSection + LoginCard 子组件
 * - 管理业务状态（验证码、错误处理）
 * - 协调 API 调用和路由跳转
 */
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// ========== 响应式状态 ==========

/** 是否显示验证码区域 */
const showCaptcha = ref(false);

/** 验证码图片 URL */
const captchaImage = ref('');

/** 验证码唯一标识 */
const captchaKey = ref('');

/** 验证码加载状态 */
const captchaLoading = ref(false);

/** 表单提交 loading 状态 */
const loading = ref(false);

/** 登录失败计数（用于触发验证码显示） */
const failCount = ref(0);

// ========== 业务方法 ==========

/**
 * 加载验证码图片
 */
const loadCaptcha = async () => {
  captchaLoading.value = true;
  try {
    const result = await authApi.getCaptcha();
    captchaImage.value = result.captchaImage;
    captchaKey.value = result.captchaKey;
  } catch (error) {
    console.error('[Login] 加载验证码失败:', error);
    ElMessage.warning('验证码加载失败，请稍后重试');
  } finally {
    captchaLoading.value = false;
  }
};

/**
 * 点击刷新验证码
 */
const handleRefreshCaptcha = () => {
  loadCaptcha();
};

/**
 * 忘记密码点击处理
 */
const handleForgotPassword = () => {
  ElMessage.info({
    message: '请联系管理员重置您的密码。',
    duration: 3000,
    showClose: true,
  });
};

/**
 * 处理登录表单提交（由 LoginCard 触发）
 */
const handleSubmit = async (data: {
  username: string;
  password: string;
  captcha?: string;
  rememberMe: boolean;
}) => {
  // 防止重复提交
  if (loading.value) return;

  loading.value = true;

  try {
    // 调用 AuthStore 的 login 方法
    const result = await authStore.login({
      username: data.username,
      password: data.password,
      captcha: data.captcha,
      captchaKey: captchaKey.value || undefined,
    });

    // 登录成功提示
    ElMessage.success('登录成功');

    // 跳转到目标页面或首页
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (error: any) {
    // 增加失败计数
    failCount.value++;

    // 根据错误类型显示友好提示
    let needRefreshCaptcha = false;

    if (error.response?.status === 401) {
      ElMessage.error('用户名或密码错误');
      needRefreshCaptcha = true;
    } else if (error.response?.status === 422) {
      // 可能是验证码错误或字段验证失败
      const msg = error.response?.data?.message || '';
      if (
        msg.toLowerCase().includes('captcha') ||
        msg.includes('验证码')
      ) {
        ElMessage.error('验证码错误，请重新输入');
      } else {
        ElMessage.error(msg || '输入数据格式错误');
      }
      needRefreshCaptcha = true;
    } else if (error.code === 'ERR_NETWORK') {
      ElMessage.error('网络连接失败，请检查网络后重试');
    } else if (error.message?.includes('timeout')) {
      ElMessage.error('请求超时，请检查网络后重试');
    } else {
      // 显示后端返回的具体错误信息
      const serverMsg = error.response?.data?.message;
      ElMessage.error(serverMsg || '登录失败，请稍后重试');
    }

    // 首次失败后显示验证码并加载
    if (failCount.value >= 1 && !showCaptcha.value) {
      showCaptcha.value = true;
      needRefreshCaptcha = true; // 首次显示时必须加载验证码
    }

    // 统一处理验证码刷新（避免重复调用）
    if (showCaptcha.value && needRefreshCaptcha) {
      await loadCaptcha();
    }
  } finally {
    loading.value = false;
  }
};

// ========== 生命周期 ==========

onMounted(() => {
  console.log('[Login] 页面已挂载');
});
</script>

<style lang="scss" scoped>
.login-page {
  display: flex;
  min-height: 100vh;
}

.login-form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1; // 占据剩余空间
  padding: 40px;
  background-color: #F9FAFB;

  @media (max-width: 991px) {
    padding: 24px 16px;
  }
}

.login-container {
  width: 100%;
  max-width: 420px;
}
</style>
