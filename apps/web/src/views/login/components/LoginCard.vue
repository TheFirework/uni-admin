<template>
  <div class="login-card">
    <!-- 标题区域 -->
    <header class="card-header">
      <h1 class="card-title">{{ title }}</h1>
      <p class="card-subtitle">{{ subtitle }}</p>
    </header>

    <!-- 登录表单 -->
    <Form v-slot="{ errors }" class="login-form" @submit="handleSubmit">
      <!-- 用户名输入框 -->
      <Field name="username" v-slot="{ field, errorMessage }">
        <el-form-item :error="errorMessage" class="form-item">
          <el-input v-bind="field" :placeholder="'请输入用户名'" size="large" :autocomplete="autocompleteUsername">
            <template #prefix>
              <Icon icon="mdi:account-outline" />
            </template>
          </el-input>
        </el-form-item>
      </Field>

      <!-- 密码输入框 -->
      <Field name="password" v-slot="{ field, errorMessage }">
        <el-form-item :error="errorMessage" class="form-item">
          <el-input v-bind="field" type="password" :placeholder="'请输入密码'" size="large" show-password
            :autocomplete="autocompletePassword">
            <template #prefix>
              <Icon icon="mdi:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
      </Field>

      <!-- 验证码输入框（条件显示） -->
      <Transition name="fade">
        <div v-if="showCaptcha" class="captcha-section">
          <label class="captcha-label">验证码</label>
          <Field name="captcha" v-slot="{ field }">
            <CaptchaInput :model-value="field.value" @update:model-value="field.onChange" :captcha-image="captchaImage"
              :loading="captchaLoading" @refresh="$emit('captcha-refresh')" />
          </Field>
        </div>
      </Transition>

      <!-- 选项行：记住我 + 忘记密码 -->
      <div class="options-row">
        <RememberMe v-model="rememberMe" />

        <a href="#" class="forgot-link" role="button" aria-label="忘记密码，点击获取重置密码帮助"
          @click.prevent="$emit('forgot-password')">
          忘记密码？
        </a>
      </div>

      <!-- 登录按钮 -->
      <el-button type="primary" size="large" class="login-button" :loading="loading" :disabled="loading"
        :aria-busy="loading" native-type="submit">
        {{ loading ? '登录中...' : '登录' }}
      </el-button>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Form, Field } from 'vee-validate';
import { Icon } from '@iconify/vue';
import { ElButton, ElFormItem, ElMessage } from 'element-plus';
import { z } from 'zod';
import CaptchaInput from './CaptchaInput.vue';
import RememberMe from './RememberMe.vue';

/**
 * LoginSchema 定义（符合 Zod 规范）
 */
const LoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').trim(),
  password: z.string().min(1, '密码不能为空'),
  captcha: z.string().optional(),
});

/**
 * LoginCard 组件 Props
 */
interface Props {
  title?: string;
  subtitle?: string;
  showCaptcha?: boolean;
  loading?: boolean;
  captchaImage?: string;
  captchaLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '欢迎回来',
  subtitle: '请输入您的账号信息以登录系统',
  showCaptcha: false,
  loading: false,
  captchaImage: '',
  captchaLoading: false,
});

const emit = defineEmits<{
  submit: [data: { username: string; password: string; captcha?: string; rememberMe: boolean }];
  'captcha-refresh': [];
  'forgot-password': [];
}>();

const rememberMe = ref(false);

const autocompleteUsername = computed(() => (rememberMe.value ? 'username' : 'off'));
const autocompletePassword = computed(() => (rememberMe.value ? 'current-password' : 'new-password'));

/**
 * 处理表单提交 - vee-validate 自动传入已验证的值
 */
const handleSubmit = (values: Record<string, any>) => {
  const result = LoginSchema.safeParse({
    username: values.username,
    password: values.password,
    captcha: values.captcha || undefined,
  });

  if (!result.success) {
    const firstError = result.error.issues[0];
    ElMessage.warning(firstError.message);
    return;
  }

  emit('submit', {
    username: result.data.username.trim(),
    password: result.data.password,
    captcha: result.data.captcha?.trim(),
    rememberMe: rememberMe.value,
  });
};
</script>

<style lang="scss" scoped>
.login-card {
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.card-title {
  font-size: 28px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.card-subtitle {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  margin-bottom: 0; // 覆盖 Element Plus 默认底部间距
}

.captcha-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .captcha-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }
}

.options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-size: 14px;
  color: #5B9BD5;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #4A8BC4;
    text-decoration: underline;
  }
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 10px;
  border: none;

  &.is-loading {
    opacity: 0.85;
  }
}

// 验证码淡入动画
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
