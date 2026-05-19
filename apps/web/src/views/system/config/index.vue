<template>
  <div class="config-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统配置</span>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>保存配置
          </el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        size="large"
      >
        <el-divider content-position="left">基础设置</el-divider>

        <el-form-item label="系统名称" prop="siteName">
          <el-input v-model="formData.siteName" placeholder="请输入系统名称" />
        </el-form-item>

        <el-form-item label="系统Logo" prop="logo">
          <el-input v-model="formData.logo" placeholder="请输入 Logo URL">
            <template #prefix>
              <el-icon><Picture /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="系统描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入系统描述"
          />
        </el-form-item>

        <el-divider content-position="left">安全设置</el-divider>

        <el-form-item label="密码最小长度" prop="minPasswordLength">
          <el-input-number v-model="formData.minPasswordLength" :min="6" :max="20" />
        </el-form-item>

        <el-form-item label="密码复杂度要求" prop="passwordComplexity">
          <el-select v-model="formData.passwordComplexity" placeholder="请选择">
            <el-option label="仅长度校验" value="length" />
            <el-option label="包含数字" value="number" />
            <el-option label="包含大小写字母" value="case" />
            <el-option label="包含特殊字符" value="special" />
            <el-option label="混合校验（推荐）" value="mixed" />
          </el-select>
        </el-form-item>

        <el-form-item label="登录失败锁定次数" prop="lockoutThreshold">
          <el-input-number v-model="formData.lockoutThreshold" :min="3" :max="10" />
          <div class="form-tip">超过此次数后账号将被临时锁定</div>
        </el-form-item>

        <el-divider content-position="left">功能开关</el-divider>

        <el-form-item label="启用注册">
          <el-switch v-model="formData.enableRegistration" active-text="开启" inactive-text="关闭" />
        </el-form-item>

        <el-form-item label="启用验证码">
          <el-switch v-model="formData.enableCaptcha" active-text="开启" inactive-text="关闭" />
        </el-form-item>

        <el-form-item label="操作日志记录">
          <el-switch v-model="formData.enableOperationLog" active-text="开启" inactive-text="关闭" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Check, Picture } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';

const formRef = ref<FormInstance>();
const saving = ref(false);

const formData = reactive({
  siteName: 'UniAdmin',
  logo: '',
  description: '基于 Vue 3 + Element Plus 的后台管理系统',
  minPasswordLength: 8,
  passwordComplexity: 'mixed',
  lockoutThreshold: 5,
  enableRegistration: true,
  enableCaptcha: true,
  enableOperationLog: true,
});

const formRules: FormRules = {
  siteName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  minPasswordLength: [
    { required: true, message: '请输入最小长度', trigger: 'change' },
  ],
};

async function handleSave() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    saving.value = true;

    // TODO: 替换为实际 API 调用
    // await updateSystemConfig(formData);
    
    // 模拟保存延迟
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    ElMessage.success('配置保存成功');
  } catch (error) {
    console.error('表单校验失败:', error);
  } finally {
    saving.value = false;
  }
}

async function fetchConfig() {
  try {
    // TODO: 替换为实际 API 调用
    // const config = await getSystemConfig();
    // Object.assign(formData, config);
  } catch (error) {
    console.error('获取配置失败:', error);
  }
}

onMounted(() => {
  fetchConfig();
});
</script>

<style scoped lang="scss">
.config-container {
  padding: 20px;
  max-width: 800px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
  }

  :deep(.el-divider__text) {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }
}
</style>
