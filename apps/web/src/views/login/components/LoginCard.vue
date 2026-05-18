<template>
  <div class="login-card">
    <!-- 标题区域 -->
    <header class="card-header">
      <h1 class="card-title">{{ title }}</h1>
      <p class="card-subtitle">{{ subtitle }}</p>
    </header>

    <!-- 登录表单（Element Plus 原生验证） -->
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      class="login-form"
      @submit.prevent="handleSubmit"
    >
      <!-- 用户名输入框 -->
      <el-form-item prop="username" class="form-item">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          size="large"
          clearable
          :autocomplete="autocompleteUsername"
        >
          <template #prefix>
            <Icon icon="mdi:account-outline" class="input-icon" />
          </template>
        </el-input>
      </el-form-item>

      <!-- 密码输入框 -->
      <el-form-item prop="password" class="form-item">
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          show-password
          clearable
          :autocomplete="autocompletePassword"
        >
          <template #prefix>
            <Icon icon="mdi:lock-outline" class="input-icon" />
          </template>
        </el-input>
      </el-form-item>

      <!-- 验证码输入框（条件显示） -->
      <Transition name="fade">
        <div v-if="showCaptcha" class="captcha-section">
          <label class="captcha-label">验证码</label>
          <CaptchaInput
            v-model="formData.captcha"
            :captcha-image="captchaImage"
            :loading="captchaLoading"
            @refresh="$emit('captcha-refresh')"
          />
        </div>
      </Transition>

      <!-- 选项行：记住我 + 忘记密码 -->
      <div class="options-row">
        <RememberMe v-model="rememberMe" />

        <a
          href="#"
          class="forgot-link"
          role="button"
          aria-label="忘记密码，点击获取重置密码帮助"
          @click.prevent="$emit('forgot-password')"
        >
          忘记密码？
        </a>
      </div>

      <!-- 登录按钮 -->
      <el-button
        type="primary"
        size="large"
        class="login-button"
        :loading="loading"
        :disabled="loading"
        :aria-busy="loading"
        native-type="submit"
      >
        {{ loading ? '登录中...' : '登录' }}
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { Icon } from '@iconify/vue';
import { ElButton, ElFormItem, ElForm } from 'element-plus';
import CaptchaInput from './CaptchaInput.vue';
import RememberMe from './RememberMe.vue';

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

// 表单引用（用于手动触发验证）
const formRef = ref<FormInstance>();

// 记住登录状态
const rememberMe = ref(false);

// 表单数据（双向绑定）
const formData = reactive({
  username: '',
  password: '',
  captcha: '',
});

// 自动补全属性计算
const autocompleteUsername = computed(() => (rememberMe.value ? 'username' : 'off'));
const autocompletePassword = computed(() => (rememberMe.value ? 'current-password' : 'new-password'));

/**
 * 表单验证规则（Element Plus 原生格式）
 */
const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度在 6 到 30 个字符', trigger: 'blur' },
  ],
};

/**
 * 处理表单提交
 */
async function handleSubmit(): Promise<void> {
  if (!formRef.value) return;

  try {
    // 手动触发表单验证
    await formRef.value.validate();

    // 验证通过，提交数据
    emit('submit', {
      username: formData.username.trim(),
      password: formData.password,
      captcha: formData.captcha?.trim(),
      rememberMe: rememberMe.value,
    });
  } catch (error) {
    // 验证失败（Element Plus 会自动显示错误提示）
    console.warn('[LoginCard] 表单验证失败:', error);
  }
}
</script>

<style lang="scss" scoped>
.login-card {
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;

  // 响应式：平板及以下设备
  @media (max-width: 768px) {
    padding: 32px 24px;
    border-radius: 12px;
  }

  // 响应式：手机设备
  @media (max-width: 576px) {
    padding: 24px 16px;
    border-radius: 8px;
  }
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

  // 输入框图标样式（确保 prefix 插槽中的图标正确显示）
  .input-icon {
    font-size: 18px;
    color: #9CA3AF; // 灰色图标
    transition: color 0.2s ease;
  }

  // 聚焦时图标变为主色调
  :deep(.el-input__wrapper:focus-within) {
    .input-icon {
      color: #5B9BD5; // 主色调蓝色
    }
  }

  // 输入框聚焦效果增强
  :deep(.el-input__wrapper) {
    transition: all 0.2s ease;

    &:focus-within {
      border-color: #5B9BD5;
      box-shadow: 0 0 0 3px rgba(91, 155, 213, 0.15);
      transform: translateY(-1px);
    }
  }

  // 密码切换按钮样式优化
  :deep(.el-input__password) {
    font-size: 16px;
    color: #9CA3AF;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: #5B9BD5;
    }
  }

  // 输入框高度响应式调整
  :deep(.el-input__inner) {
    height: 48px;

    @media (max-width: 576px) {
      height: 52px;
    }
  }

  // 错误提示样式优化
  :deep(.el-form-item__error) {
    padding-top: 4px;
    font-size: 13px;
    color: #EF4444;
  }
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
