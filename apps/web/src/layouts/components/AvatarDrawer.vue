<template>
  <el-drawer
    v-model="visible"
    title="个人中心"
    direction="rtl"
    :size="320"
    :with-header="true"
    :modal="true"
    :close-on-click-modal="true"
    class="avatar-drawer"
  >
    <!-- 用户信息展示区域 -->
    <div class="user-info-section">
      <!-- 头像 -->
      <div class="avatar-wrapper">
        <el-avatar
          :size="80"
          :src="userAvatar"
          class="user-avatar"
        >
          {{ avatarText }}
        </el-avatar>
      </div>

      <!-- 用户名和角色信息 -->
      <div class="info-content">
        <h3 class="username">
          {{ username }}
        </h3>
        <p class="email">
          邮箱：{{ email }}
        </p>
        <div class="roles-list">
          <el-tag
            v-for="role in roles"
            :key="role"
            size="small"
            type="success"
            effect="plain"
            class="role-tag"
          >
            {{ role }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <el-divider />

    <!-- 操作项列表 -->
    <div class="action-section">
      <!-- 个人设置按钮（预留跳转） -->
      <div
        class="action-item"
        @click="goToSettings"
      >
        <el-icon :size="20">
          <Setting />
        </el-icon>
        <span>个人设置</span>
        <el-icon class="arrow-icon">
          <ArrowRight />
        </el-icon>
      </div>

      <!-- 退出登录按钮 -->
      <div
        class="action-item logout"
        @click="handleLogout"
      >
        <el-icon :size="20">
          <SwitchButton />
        </el-icon>
        <span>退出登录</span>
        <el-icon class="arrow-icon">
          <ArrowRight />
        </el-icon>
      </div>
    </div>

    <!-- 版本信息 -->
    <div class="version-info">
      <span>UniAdmin v{{ version }}</span>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Setting, SwitchButton, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/stores/auth.store';

// 定义 props
const props = defineProps<{
  /** 控制抽屉显示/隐藏 */
  modelValue: boolean;
}>();

// 定义 emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

// 路由实例
const router = useRouter();

// Auth Store
const authStore = useAuthStore();

// 版本号（从环境变量读取）
const version = computed((): string => {
  return import.meta.env.VITE_BUILD_VERSION || '1.0.0';
});

// 抽屉可见性（双向绑定）
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// ====== 用户信息计算属性 ======

/** 用户头像 URL */
const userAvatar = computed((): string => {
  // 后续可从用户信息中读取真实头像 URL
  return '';
});

/** 头像文字（无图片时显示） */
const avatarText = computed((): string => {
  const name = authStore.username || 'U';
  return name.charAt(0).toUpperCase();
});

/** 用户名 */
const username = computed((): string => authStore.username || '管理员');

/** 邮箱 */
const email = computed((): string =>
  (authStore.user as any)?.email || '未设置邮箱'
);

/** 角色列表 */
const roles = computed((): number[] => authStore.roles || []);

// ====== 方法 ======

/**
 * 跳转到个人设置页面
 */
function goToSettings(): void {
  visible.value = false; // 关闭抽屉

  // 预留：跳转到个人设置页面
  router.push('/profile');
}

/**
 * 执行退出登录操作
 */
async function handleLogout(): Promise<void> {
  try {
    // 弹出确认对话框
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    // 关闭抽屉
    visible.value = false;

    // 调用 Auth Store 的 logout 方法
    await authStore.logout();

    // 跳转到登录页
    router.push('/login');

    ElMessage.success('已成功退出登录');
  } catch (error: any) {
    // 用户取消操作或退出失败
    if (error !== 'cancel') {
      console.error('[AvatarDrawer] 退出登录失败:', error);
      ElMessage.error('退出登录失败，请重试');
    }
  }
}
</script>

<style lang="scss" scoped>
.avatar-drawer {
  .user-info-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px;
    background-color: #f5f7fa;
    border-radius: 8px;
    margin-bottom: 16px;

    .avatar-wrapper {
      margin-bottom: 16px;

      .user-avatar {
        border: 3px solid #fff;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        font-size: 32px;
        font-weight: 600;
        color: #409eff;
        background-color: #ecf5ff;
      }
    }

    .info-content {
      text-align: center;

      .username {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 8px;
      }

      .email {
        font-size: 13px;
        color: #909399;
        margin-bottom: 12px;
      }

      .roles-list {
        display: flex;
        justify-content: center;
        gap: 6px;
        flex-wrap: wrap;

        .role-tag {
          font-size: 11px;
        }
      }
    }
  }

  .action-section {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .action-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #606266;
      font-size: 14px;

      &:hover {
        background-color: #f5f7fa;
        color: #409eff;
      }

      &.logout {
        color: #f56c6c;

        &:hover {
          background-color: #fef0f0;
          color: #f56c6c;
        }
      }

      .arrow-icon {
        margin-left: auto;
        font-size: 14px;
        color: #c0c4cc;
      }
    }
  }

  .version-info {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    text-align: center;

    span {
      font-size: 12px;
      color: #c0c4cc;
    }
  }
}
</style>
