<template>
  <div class="error-page error-403">
    <div class="error-content">
      <!-- 锁形图标 -->
      <div class="error-icon">
        <el-icon
          :size="80"
          color="#e6a23c"
        >
          <Lock />
        </el-icon>
      </div>

      <!-- 提示文字 -->
      <h1 class="error-title">
        抱歉，您没有权限访问此页面
      </h1>
      <p class="error-description">
        您可能没有足够的权限访问该资源，请联系管理员获取相应权限
      </p>

      <!-- 操作按钮 -->
      <div class="error-actions">
        <el-button
          type="primary"
          @click="goHome"
        >
          <el-icon><HomeFilled /></el-icon>返回首页
        </el-button>
        <el-button @click="contactAdmin">
          <el-icon><Message /></el-icon>联系管理员
        </el-button>
      </div>
    </div>

    <!-- 装饰性插图（可选） -->
    <div class="error-illustration">
      <img
        src="@/assets/images/error-403.svg"
        alt="403"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Lock, HomeFilled, Message } from '@element-plus/icons-vue';

// 路由实例
const router = useRouter();

/**
 * 返回首页
 */
function goHome(): void {
  router.push('/');
}

/**
 * 联系管理员（预留功能）
 */
function contactAdmin(): void {
  // 预留：可以打开邮件客户端或跳转到联系页面
  window.open('mailto:admin@example.com?subject=权限申请 - UniAdmin');
}
</script>

<style lang="scss" scoped>
.error-403 {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 180px); // 减去 header 和 padding 高度
  background-color: #f0f2f5;
  gap: 60px;

  .error-content {
    text-align: center;

    .error-icon {
      margin-bottom: 24px;

      :deep(.el-icon) {
        background-color: #fdf6ec;
        border-radius: 50%;
        padding: 20px;
      }
    }

    .error-title {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
    }

    .error-description {
      font-size: 14px;
      color: #909399;
      margin-bottom: 32px;
      line-height: 1.6;
    }

    .error-actions {
      display: flex;
      justify-content: center;
      gap: 16px;

      :deep(.el-button) {
        min-width: 120px;
      }
    }
  }

  .error-illustration {
    img {
      width: 300px;
      height: auto;
      opacity: 0.9;
    }
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .error-403 {
    flex-direction: column;
    gap: 30px;
    padding: 20px;

    .error-content {
      .error-icon {
        :deep(.el-icon) {
          font-size: 60px !important;
          padding: 16px;
        }
      }

      .error-title {
        font-size: 20px;
      }

      .error-actions {
        flex-direction: column;
      }
    }

    .error-illustration {
      img {
        width: 200px;
      }
    }
  }
}
</style>
