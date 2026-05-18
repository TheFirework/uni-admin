<template>
  <div
    v-if="visible"
    class="layout-skeleton"
  >
    <!-- 整体容器 -->
    <div class="skeleton-wrapper">
      <!-- 左侧：侧边栏轮廓 -->
      <div class="skeleton-sidebar">
        <el-skeleton
          :rows="0"
          animated
        >
          <template #template>
            <!-- Logo 区域轮廓 -->
            <div class="skeleton-logo">
              <el-skeleton-item
                variant="circle"
                style="width: 32px; height: 32px;"
              />
              <el-skeleton-item
                variant="text"
                style="width: 80px; height: 20px; margin-left: 12px;"
              />
            </div>

            <!-- 菜单项轮廓 -->
            <div class="skeleton-menu-items">
              <div
                v-for="i in 5"
                :key="i"
                class="menu-item"
              >
                <el-skeleton-item
                  variant="circle"
                  style="width: 16px; height: 16px;"
                />
                <el-skeleton-item
                  variant="text"
                  style="flex: 1; height: 14px; margin-left: 12px;"
                />
              </div>

              <!-- 子菜单轮廓 -->
              <div class="submenu-group">
                <div
                  v-for="j in 3"
                  :key="`sub-${j}`"
                  class="submenu-item"
                >
                  <el-skeleton-item
                    variant="circle"
                    style="width: 14px; height: 14px;"
                  />
                  <el-skeleton-item
                    variant="text"
                    style="flex: 1; height: 13px; margin-left: 10px;"
                  />
                </div>
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>

      <!-- 右侧：顶栏 + 内容区轮廓 -->
      <div class="skeleton-main">
        <!-- 顶栏轮廓 -->
        <div class="skeleton-header">
          <el-skeleton
            :rows="0"
            animated
          >
            <template #template>
              <div class="header-content">
                <!-- 面包屑轮廓 -->
                <div class="breadcrumb-area">
                  <el-skeleton-item
                    variant="text"
                    style="width: 60px; height: 14px;"
                  />
                  <el-skeleton-item
                    variant="text"
                    style="width: 40px; height: 14px; margin-left: 8px;"
                  />
                  <el-skeleton-item
                    variant="text"
                    style="width: 50px; height: 14px; margin-left: 8px;"
                  />
                </div>

                <!-- 头像区域轮廓 -->
                <div class="avatar-area">
                  <el-skeleton-item
                    variant="rect"
                    style="width: 100px; height: 24px; border-radius: 4px;"
                  />
                  <el-skeleton-item
                    variant="circle"
                    style="width: 32px; height: 32px; margin-left: 16px;"
                  />
                </div>
              </div>

              <!-- 标签栏轮廓 -->
              <div class="tags-area">
                <el-skeleton-item
                  v-for="k in 3"
                  :key="k"
                  variant="rect"
                  style="width: 80px; height: 26px; border-radius: 2px; margin-right: 8px;"
                />
              </div>
            </template>
          </el-skeleton>
        </div>

        <!-- 内容区卡片轮廓 -->
        <div class="skeleton-content">
          <el-card
            shadow="never"
            class="content-card"
          >
            <el-skeleton
              :rows="5"
              animated
            >
              <template #template>
                <!-- 卡片标题轮廓 -->
                <div class="card-header">
                  <el-skeleton-item
                    variant="h1"
                    style="width: 120px; height: 24px;"
                  />
                </div>

                <!-- 卡片内容轮廓（表格/表单） -->
                <div class="card-body">
                  <!-- 表格头部 -->
                  <div class="table-header">
                    <el-skeleton-item
                      v-for="m in 4"
                      :key="m"
                      variant="text"
                      style="flex: 1; height: 16px;"
                    />
                  </div>

                  <!-- 表格行 -->
                  <div
                    v-for="n in 3"
                    :key="`row-${n}`"
                    class="table-row"
                  >
                    <el-skeleton-item
                      v-for="m in 4"
                      :key="m"
                      variant="text"
                      style="flex: 1; height: 14px;"
                    />
                  </div>
                </div>
              </template>
            </el-skeleton>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 超时提示（加载超过 3 秒显示） -->
    <div
      v-if="isTimeout"
      class="timeout-warning"
    >
      <el-alert
        title="加载时间过长"
        type="warning"
        description="菜单数据加载超时，请检查网络连接或点击重试按钮"
        show-icon
        :closable="false"
      >
        <template #default>
          <el-button
            type="primary"
            size="small"
            @click="$emit('retry')"
          >
            重试
          </el-button>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

// 定义 props
const props = defineProps<{
  /** 是否显示骨架屏 */
  modelValue: boolean;
}>();

// 定义 emits
defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e:retry): void;
}>();

// ====== 状态 ======

/** 超时标志（超过 3 秒显示错误提示） */
const isTimeout = ref(false);

/** 超时定时器 */
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

// ====== 监听器 ======

/** 监听显示状态变化 */
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // 开始计时
      startTimeoutTimer();
    } else {
      // 重置状态
      resetTimeout();
    }
  }
);

// ====== 方法 ======

/** 启动超时计时器 */
function startTimeoutTimer(): void {
  // 清除已有定时器
  if (timeoutTimer) clearTimeout(timeoutTimer);

  // 设置 3 秒超时
  timeoutTimer = setTimeout(() => {
    isTimeout.value = true;
    console.warn('[Skeleton] 加载超时 (>3秒)');
  }, 3000);
}

/** 重置超时状态 */
function resetTimeout(): void {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
  isTimeout.value = false;
}

// ====== 生命周期 ======

onMounted(() => {
  // 如果初始状态为显示，启动计时器
  if (props.modelValue) {
    startTimeoutTimer();
  }
});

onBeforeUnmount(() => {
  // 清理定时器
  resetTimeout();
});
</script>

<style lang="scss" scoped>
.layout-skeleton {
  width: 100%;
  height: 100vh;
  background-color: #f0f2f5;

  .skeleton-wrapper {
    display: flex;
    height: 100%;

    .skeleton-sidebar {
      width: 240px;
      background-color: #001529;
      padding: 20px 16px;

      .skeleton-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-bottom: 20px;
        border-bottom: 1px solid #1d2f45;
        margin-bottom: 20px;
      }

      .skeleton-menu-items {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .menu-item {
          display: flex;
          align-items: center;
          padding: 8px 0;
        }

        .submenu-group {
          padding-left: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;

          .submenu-item {
            display: flex;
            align-items: center;
            padding: 6px 0;
          }
        }
      }
    }

    .skeleton-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .skeleton-header {
        background-color: #fff;
        padding: 16px 20px;
        box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .breadcrumb-area {
            display: flex;
            align-items: center;
          }

          .avatar-area {
            display: flex;
            align-items: center;
          }
        }

        .tags-area {
          display: flex;
          gap: 8px;
        }
      }

      .skeleton-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;

        .content-card {
          min-height: 400px;

          .card-header {
            margin-bottom: 20px;
          }

          .card-body {
            .table-header,
            .table-row {
              display: flex;
              gap: 16px;
              padding: 12px 0;
              border-bottom: 1px solid #ebeef5;
            }

            .table-header {
              background-color: #fafafa;
              padding: 12px 8px;
              border-radius: 4px;
            }
          }
        }
      }
    }
  }

  .timeout-warning {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2000;
    max-width: 360px;
  }
}
</style>
