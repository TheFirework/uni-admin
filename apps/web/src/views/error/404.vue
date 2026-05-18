<template>
  <div class="error-page error-404">
    <div class="error-content">
      <!-- 大号 404 数字 -->
      <div class="error-code">
        404
      </div>

      <!-- 提示文字 -->
      <h1 class="error-title">
        抱歉，您访问的页面不存在
      </h1>
      <p class="error-description">
        请检查您输入的网址是否正确，或者点击下方按钮返回首页
      </p>

      <!-- 操作按钮 -->
      <div class="error-actions">
        <el-button
          type="primary"
          @click="goHome"
        >
          <el-icon><HomeFilled /></el-icon>返回首页
        </el-button>
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>返回上一步
        </el-button>
      </div>
    </div>

    <!-- 装饰性插图（可选） -->
    <div class="error-illustration">
      <img
        src="@/assets/images/error-404.svg"
        alt="404"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { HomeFilled, Back } from '@element-plus/icons-vue';

// 路由实例
const router = useRouter();

/**
 * 返回首页
 */
function goHome(): void {
  router.push('/');
}

/**
 * 返回上一步
 */
function goBack(): void {
  // 如果有历史记录则返回上一页，否则跳转首页
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
}
</script>

<style lang="scss" scoped>
.error-404 {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 180px); // 减去 header 和 padding 高度
  background-color: #f0f2f5;
  gap: 60px;

  .error-content {
    text-align: center;

    .error-code {
      font-size: 120px;
      font-weight: 700;
      color: #1890ff;
      line-height: 1.2;
      margin-bottom: 16px;
      text-shadow: 2px 2px 8px rgba(24, 144, 255, 0.15);
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
  .error-404 {
    flex-direction: column;
    gap: 30px;
    padding: 20px;

    .error-content {
      .error-code {
        font-size: 80px;
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
