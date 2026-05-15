<template>
  <div class="demo-draggable">
    <div class="demo-header">
      <h2>VueDraggable 拖拽排序示例</h2>
      <p class="demo-desc">拖拽卡片调整顺序，验证 vuedraggable 安装成功</p>
    </div>

    <!-- 拖拽列表容器 -->
    <draggable
      v-model="list"
      item-key="id"
      handle=".drag-handle"
      animation="200"
      ghost-class="ghost-card"
      class="drag-list"
    >
      <template #item="{ element, index }">
        <div class="drag-item">
          <!-- 拖拽手柄（只有通过手柄才能拖动） -->
          <div class="drag-handle">
            <Icon icon="ep:rank" class="handle-icon" />
          </div>

          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="card-header">
              <span class="card-title">{{ element.title }}</span>
              <el-tag :type="element.status === 'active' ? 'success' : 'info'" size="small">
                {{ element.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </div>
            <p class="card-desc">{{ element.description }}</p>
            <div class="card-meta">
              <span>排序: {{ index + 1 }}</span>
              <span>ID: {{ element.id }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="card-actions">
            <el-button
              type="danger"
              size="small"
              text
              @click="removeItem(index)"
            >
              删除
            </el-button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- 操作栏 -->
    <div class="demo-actions">
      <el-button type="primary" @click="addItem">
        <Icon icon="ep:plus" style="margin-right: 4px;" />
        添加项
      </el-button>
      <el-button @click="resetList">
        <Icon icon="ep:refresh-left" style="margin-right: 4px;" />
        重置列表
      </el-button>
      <el-button type="success" @click="logOrder">
        <Icon icon="ep:document" style="margin-right: 4px;" />
        打印当前顺序
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * VueDraggable 拖拽排序列表示例组件
 *
 * 功能演示：
 * - 基础拖拽排序（v-model 双向绑定）
 * - 手柄拖动（handle 配置）
 * - 动态添加/删除项
 * - 拖拽动画效果
 *
 * 使用说明：
 * 1. 确保已安装 vuedraggable：pnpm add vuedraggable
 * 2. 在页面中引入此组件即可查看效果
 */

import { ref } from 'vue';
import draggable from 'vuedraggable';
import { Icon } from '@iconify/vue';

// 定义列表项的数据结构
interface DragItem {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'inactive';
}

// 初始示例数据（模拟任务列表）
const initialList: DragItem[] = [
  {
    id: 1,
    title: '项目初始化',
    description: '完成项目基础架构搭建和依赖安装',
    status: 'active',
  },
  {
    id: 2,
    title: '数据库设计',
    description: '设计并创建数据库表结构和索引',
    status: 'active',
  },
  {
    id: 3,
    title: 'API 接口开发',
    description: '实现 RESTful API 和业务逻辑',
    status: 'active',
  },
  {
    id: 4,
    title: '前端界面开发',
    description: '开发管理后台前端页面和交互',
    status: 'inactive',
  },
  {
    id: 5,
    title: '测试与部署',
    description: '进行单元测试和生产环境部署',
    status: 'inactive',
  },
];

// 响应式列表数据（v-model 绑定）
const list = ref<DragItem[]>([...initialList]);

/**
 * 添加新项目到列表末尾
 */
function addItem() {
  const newItem: DragItem = {
    id: Date.now(),  // 使用时间戳作为临时 ID
    title: `新任务 ${list.value.length + 1}`,
    description: '这是一条新添加的任务，可以拖拽调整顺序',
    status: 'active',
  };
  list.value.push(newItem);
}

/**
 * 删除指定位置的项目
 * @param index - 要删除的项目索引
 */
function removeItem(index: number) {
  list.value.splice(index, 1);
}

/**
 * 重置列表到初始状态
 */
function resetList() {
  list.value = [...initialList];
}

/**
 * 打印当前列表顺序（用于调试）
 */
function logOrder() {
  console.log('当前列表顺序:', list.value.map(item => item.id));
  alert(`当前顺序: ${list.value.map(item => item.title).join(' → ')}`);
}
</script>

<style scoped>
.demo-draggable {
  max-width: 800px;
  margin: 20px auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.demo-header {
  margin-bottom: 24px;
}

.demo-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 20px;
}

.demo-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 拖拽列表容器样式 */
.drag-list {
  min-height: 200px;
}

/* 单个拖拽项样式 */
.drag-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.3s ease;
  cursor: move;
}

.drag-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #409eff;
}

/* 拖拽中的占位符样式（ghost） */
.ghost-card {
  opacity: 0.5;
  background: #ecf5ff;
  border: 2px dashed #409eff;
}

/* 拖拽手柄样式 */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: grab;
  color: #909399;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.handle-icon {
  font-size: 18px;
}

/* 卡片内容区域 */
.card-content {
  flex: 1;
  min-width: 0;  // 防止内容溢出
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-desc {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

/* 操作按钮区域 */
.card-actions {
  flex-shrink: 0;
}

/* 底部操作栏 */
.demo-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}
</style>
