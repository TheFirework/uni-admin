<template>
  <div class="profile-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>个人中心</h2>
      <p>管理您的个人信息和账户设置</p>
    </div>

    <!-- 个人信息卡片 -->
    <el-card
      class="info-card"
      shadow="hover"
    >
      <template #header>
        <div class="card-title">
          <el-icon><User /></el-icon>
          <span>基本信息</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="right"
        size="large"
      >
        <!-- 头像上传区域 -->
        <el-form-item label="头像">
          <div class="avatar-upload-wrapper">
            <el-upload
              action="#"
              :show-file-list="false"
              :auto-upload="false"
              :on-change="handleAvatarChange"
              accept="image/*"
            >
              <el-avatar
                :size="80"
                :src="formData.avatar || ''"
              >
                {{ avatarText }}
              </el-avatar>
            </el-upload>
            <p class="upload-tip">
              点击更换头像
            </p>
          </div>
        </el-form-item>

        <!-- 用户名 -->
        <el-form-item
          label="用户名"
          prop="username"
        >
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            disabled
          />
        </el-form-item>

        <!-- 昵称 -->
        <el-form-item
          label="昵称"
          prop="nickname"
        >
          <el-input
            v-model="formData.nickname"
            placeholder="请输入昵称"
          />
        </el-form-item>

        <!-- 邮箱 -->
        <el-form-item
          label="邮箱"
          prop="email"
        >
          <el-input
            v-model="formData.email"
            placeholder="请输入邮箱"
          />
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleSubmit"
          >
            保存修改
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules, UploadFile } from 'element-plus';
import { useAuthStore } from '@/stores/auth.store';

// Auth Store
const authStore = useAuthStore();

// 表单引用
const formRef = ref<FormInstance>();

// 加载状态
const loading = ref(false);

// ====== 表单数据 ======

/** 表单数据结构 */
interface ProfileFormData {
  avatar: string;
  username: string;
  nickname: string;
  email: string;
}

/** 初始化表单数据 */
const formData = reactive<ProfileFormData>({
  avatar: '',
  username: authStore.username || '',
  nickname: (authStore.user as any)?.nickname || '',
  email: (authStore.user as any)?.email || '',
});

// ====== 计算属性 ======

/** 头像文字（无图片时显示） */
const avatarText = computed((): string => {
  const name = formData.username || 'U';
  return name.charAt(0).toUpperCase();
});

// ====== 表单校验规则 ======

/** 表单校验规则 */
const formRules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 20, message: '昵称长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] },
  ],
};

// ====== 方法 ======

/**
 * 处理头像文件选择
 * @param file 上传的文件对象
 */
function handleAvatarChange(file: UploadFile): void {
  // 预览本地图片
  if (file.raw) {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      formData.avatar = e.target?.result as string;
    };
    reader.readAsDataURL(file.raw);
  }

  console.log('[Profile] 选择头像文件:', file.name);
}

/**
 * 提交表单保存修改
 */
async function handleSubmit(): Promise<void> {
  if (!formRef.value) return;

  try {
    // 校验表单
    await formRef.value.validate();

    loading.value = true;

    // TODO: 调用 API 保存用户信息
    console.log('[Profile] 提交表单数据:', formData);

    // 模拟 API 调用延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    ElMessage.success('个人资料更新成功');
  } catch (error: any) {
    // 表单校验失败或 API 调用失败
    if (error !== false) {
      console.error('[Profile] 保存失败:', error);
      ElMessage.error('保存失败，请重试');
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 重置表单到初始状态
 */
function handleReset(): void {
  if (!formRef.value) return;

  // 重置表单数据和校验状态
  formRef.value.resetFields();

  // 重新从 Store 加载数据
  formData.username = authStore.username || '';
  formData.nickname = (authStore.user as any)?.nickname || '';
  formData.email = (authStore.user as any)?.email || '';
  formData.avatar = '';

  ElMessage.info('已重置表单');
}
</script>

<style lang="scss" scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;

  .page-header {
    margin-bottom: 24px;

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 8px;
    }

    p {
      font-size: 14px;
      color: #909399;
    }
  }

  .info-card {
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #303133;

      .el-icon {
        font-size: 18px;
        color: #409eff;
      }
    }

    .avatar-upload-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;

      .el-avatar {
        cursor: pointer;
        border: 3px dashed #dcdfe6;
        border-radius: 50%;
        transition: all 0.3s ease;

        &:hover {
          border-color: #409eff;
          transform: scale(1.05);
        }
      }

      .upload-tip {
        margin-top: 8px;
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
