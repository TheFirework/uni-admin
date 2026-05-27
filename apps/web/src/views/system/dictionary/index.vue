<template>
  <div class="dictionary-container">
    <el-row :gutter="12">
      <!-- 左侧：字典类型列表 -->
      <el-col :span="6">
        <div class="type-panel">
          <!-- 面板标题 -->
          <div class="panel-header">
            <span class="panel-title">类型</span>
            <div class="header-actions">
              <el-tooltip content="刷新" placement="top" :show-after="300">
                <el-button link size="small" @click="fetchTypeList">
                  <el-icon>
                    <Refresh />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>

          <!-- 搜索框 -->
          <el-input v-model="typeKeyword" placeholder="搜索关键字" clearable size="small" class="search-input"
            @input="onTypeSearch">
            <template #prefix><el-icon>
                <Search />
              </el-icon></template>
          </el-input>

          <!-- 字典类型列表 -->
          <el-scrollbar class="type-scrollbar">
            <div class="type-list">
              <div v-for="item in typeList" :key="item.id" class="type-item"
                :class="{ active: selectedTypeId === item.id, 'is-system': item.isSystem === 1 }"
                @click="selectType(item)">
                <div class="type-info">
                  <span class="type-name">{{ item.dictName }}</span>
                  <span class="type-separator">·</span>
                  <span class="type-code">{{ item.dictCode }}</span>
                </div>
                <el-icon v-if="selectedTypeId === item.id" class="type-arrow">
                  <ArrowRight />
                </el-icon>
              </div>
              <el-empty v-if="typeList.length === 0 && !typeLoading" description="暂无数据" :image-size="60" />
            </div>
          </el-scrollbar>

          <!-- 分页 -->
          <div class="type-pagination">
            <el-pagination v-model:current-page="typePage" :page-size="typePageSize" :total="typeTotal"
              layout="prev, pager, next" small @current-change="handleTypePageChange" />
          </div>
        </div>
      </el-col>

      <!-- 右侧：字典数据管理 -->
      <el-col :span="18">
        <div class="data-panel">
          <!-- 标题栏 -->
          <div class="panel-header">
            <span class="panel-title">
              字典列表（<template v-if="selectedType">{{ selectedType.dictName }}</template><template v-else>选择</template>）
            </span>
            <div class="header-actions">
              <el-tooltip content="刷新" placement="top" :show-after="300">
                <el-button link size="small" :disabled="!selectedType" @click="fetchDataList">
                  <el-icon>
                    <Refresh />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>

          <!-- 工具栏 -->
          <div class="toolbar">
            <div class="toolbar-left">
              <el-button size="small" :disabled="!selectedType" @click="fetchDataList">刷新</el-button>
              <el-button type="primary" size="small" :disabled="!selectedType" @click="openDataDialog()">新增</el-button>
              <el-button type="danger" size="small" plain :disabled="!selectedType || selectedRows.length === 0"
                @click="handleBatchDelete">删除</el-button>
            </div>
          </div>

          <!-- 表格区域 -->
          <div class="table-wrapper">
            <el-table ref="tableRef" v-loading="dataLoading" :data="dataList" border stripe height="100%"
              :header-cell-style="{ background: '#fafafa' }" @selection-change="onSelectionChange">
              <el-table-column type="selection" width="42" align="center" />
              <el-table-column prop="dictLabel" label="名称" min-width="120" show-overflow-tooltip />
              <el-table-column prop="id" label="ID" width="60" align="center" />
              <el-table-column prop="dictValue" label="值" min-width="140" show-overflow-tooltip />
              <el-table-column prop="tagType" label="标签类型" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.tagType" :type="row.tagType" size="small">{{ row.tagType }}</el-tag>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="sort" label="排序" width="60" align="center" />
              <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.remark || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="70" align="center">
                <template #default="{ row }">
                  <el-switch :model-value="row.status === 1"
                    @change="(val: string | number | boolean) => toggleDataStatus(row.id, !!val)" />
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" width="160" align="center">
                <template #default="{ row }">
                  {{ formatTime(row.createdAt) }}
                </template>
              </el-table-column>
              <el-table-column prop="updatedAt" label="更新时间" width="160" align="center">
                <template #default="{ row }">
                  {{ formatTime(row.updatedAt) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160" fixed="right" align="center" class="sticky-actions">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openDataDialog(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="handleDeleteData(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 新增/编辑字典数据对话框 -->
    <el-dialog v-model="dataDialogVisible" :title="editingData?.id ? '编辑字典项' : '新增字典项'" width="520px" destroy-on-close
      append-to-body>
      <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="90px">
        <el-form-item label="标签" prop="dictLabel">
          <el-input v-model="dataForm.dictLabel" placeholder="请输入显示标签" />
        </el-form-item>
        <el-form-item label="存储值" prop="dictValue">
          <el-input v-model="dataForm.dictValue" placeholder="请输入存储值" />
        </el-form-item>
        <el-form-item label="标签类型" prop="tagType">
          <el-select v-model="dataForm.tagType" placeholder="选择标签颜色" clearable>
            <el-option label="成功(success)" value="success" />
            <el-option label="危险(danger)" value="danger" />
            <el-option label="警告(warning)" value="warning" />
            <el-option label="信息(info)" value="info" />
            <el-option label="主要(primary)" value="primary" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="dataForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="dataForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dataSaving" @click="handleSaveData">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增字典类型对话框 -->
    <el-dialog v-model="typeDialogVisible" title="新增字典类型" width="480px" destroy-on-close append-to-body>
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="90px">
        <el-form-item label="字典编码" prop="dictCode">
          <el-input v-model="typeForm.dictCode" placeholder="如 user_status" />
        </el-form-item>
        <el-form-item label="字典名称" prop="dictName">
          <el-input v-model="typeForm.dictName" placeholder="如 用户状态" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="typeForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="typeSaving" @click="handleSaveType">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { Plus, Search, ArrowRight, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import {
  getDictTypeList, createDictType,
  getDictDataList, createDictData, updateDictData, deleteDictData,
} from '@/api/modules/system.api';
import type { DictTypeItem, DictDataType } from '@/api/modules/system.api';

// ====== 字典类型状态 ======
const typeList = ref<DictTypeItem[]>([]);
const typeKeyword = ref('');
const selectedTypeId = ref<number | null>(null);
const typeLoading = ref(false);

// 分页状态
const typePage = ref(1);
const typePageSize = ref(10);
const typeTotal = ref(0);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function onTypeSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    typePage.value = 1;
    fetchTypeList();
  }, 300);
}

const selectedType = computed(() => typeList.value.find((t) => t.id === selectedTypeId.value));

// ====== 字典类型操作 ======
const typeDialogVisible = ref(false);
const typeSaving = ref(false);
const typeFormRef = ref<FormInstance>();
const typeForm = reactive({ dictCode: '', dictName: '', remark: '' });

const typeRules: FormRules = {
  dictCode: [{ required: true, message: '请输入字典编码', trigger: 'blur' }],
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
};

function resetTypeForm() {
  Object.assign(typeForm, { dictCode: '', dictName: '', remark: '' });
}

async function handleSaveType() {
  await typeFormRef.value?.validate();
  typeSaving.value = true;
  try {
    await createDictType({ ...typeForm });
    ElMessage.success('创建成功');
    typeDialogVisible.value = false;
    resetTypeForm();
    fetchTypeList();
  } finally {
    typeSaving.value = false;
  }
}

function handleTypePageChange(page: number) {
  typePage.value = page;
  fetchTypeList();
}

// ====== 数据表格状态 ======
const dataList = ref<DictDataType[]>([]);
const dataLoading = ref(false);
const tableRef = ref();
const selectedRows = ref<DictDataType[]>([]);

// 时间格式化
function formatTime(time?: string): string {
  if (!time) return '-';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ====== 数据表单 ======
const dataDialogVisible = ref(false);
const dataSaving = ref(false);
const dataFormRef = ref<FormInstance>();
const editingData = ref<DictDataType | null>(null);

const dataForm = reactive({
  dictLabel: '',
  dictValue: '',
  tagType: '',
  sort: 0,
  remark: '',
});

const dataRules: FormRules = {
  dictLabel: [{ required: true, message: '请输入标签', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入存储值', trigger: 'blur' }],
};

function resetDataForm() {
  Object.assign(dataForm, { dictLabel: '', dictValue: '', tagType: '', sort: 0, remark: '' });
  editingData.value = null;
}

function openDataDialog(row?: DictDataType) {
  resetDataForm();
  if (row) {
    editingData.value = row;
    Object.assign(dataForm, {
      dictLabel: row.dictLabel,
      dictValue: row.dictValue,
      tagType: row.tagType || '',
      sort: row.sort,
      remark: row.remark || '',
    });
  }
  dataDialogVisible.value = true;
}

async function handleSaveData() {
  await dataFormRef.value?.validate();
  dataSaving.value = true;
  try {
    if (editingData.value?.id) {
      await updateDictData(editingData.value.id, { ...dataForm });
      ElMessage.success('修改成功');
    } else {
      await createDictData({ dictCode: selectedType.value!.dictCode, ...dataForm });
      ElMessage.success('新增成功');
    }
    dataDialogVisible.value = false;
    fetchDataList();
  } finally {
    dataSaving.value = false;
  }
}

async function handleDeleteData(row: DictDataType) {
  try {
    await ElMessageBox.confirm(`确定删除字典项"${row.dictLabel}"？`, '确认删除', { type: 'warning' });
    await deleteDictData(row.id);
    ElMessage.success('删除成功');
    fetchDataList();
  } catch { /* 取消 */ }
}

async function toggleDataStatus(id: number, enabled: boolean) {
  try {
    await updateDictData(id, { status: enabled ? 1 : 0 });
    ElMessage.success(enabled ? '已启用' : '已禁用');
    fetchDataList();
  } catch { /* */ }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedRows.value.length} 条字典数据？`,
      '批量删除',
      { type: 'warning' },
    );
    for (const row of selectedRows.value) {
      await deleteDictData(row.id);
    }
    ElMessage.success(`成功删除 ${selectedRows.value.length} 条数据`);
    fetchDataList();
  } catch { /* 取消 */ }
}

function onSelectionChange(rows: DictDataType[]) {
  selectedRows.value = rows;
}

// ====== 数据加载 ======

function selectType(item: DictTypeItem) {
  selectedTypeId.value = item.id;
  fetchDataList();
}

async function fetchTypeList() {
  typeLoading.value = true;
  try {
    const res = await getDictTypeList({
      keyword: typeKeyword.value || undefined,
      page: typePage.value,
      pageSize: typePageSize.value,
    });
    typeList.value = res.list;
    typeTotal.value = res.total;

    if (res.list.length > 0 && !selectedTypeId.value) {
      selectedTypeId.value = res.list[0].id;
      fetchDataList();
    } else if (res.list.length > 0 && !res.list.find((t) => t.id === selectedTypeId.value)) {
      selectedTypeId.value = res.list[0].id;
      fetchDataList();
    }
  } finally {
    typeLoading.value = false;
  }
}

async function fetchDataList() {
  if (!selectedType.value) return;
  dataLoading.value = true;
  try {
    dataList.value = await getDictDataList({ dictCode: selectedType.value.dictCode });
  } finally {
    dataLoading.value = false;
  }
}

onMounted(() => {
  fetchTypeList();
});
</script>

<style scoped lang="scss">
.dictionary-container {
  padding: 4px;
  height: calc(100vh - 84px);

  .el-row {
    height: 100%;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .header-actions {
    display: flex;
    gap: 2px;

    .el-button {
      color: var(--el-text-color-secondary);

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  .text-muted {
    color: var(--el-text-color-placeholder);
  }

  // ========== 左侧面板 ==========
  .type-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    background: #fff;
    overflow: hidden;

    .search-input {
      padding: 8px 12px;
      flex-shrink: 0;
    }

    .type-scrollbar {
      flex: 1;
      margin: 0 8px;

      :deep(.el-scrollbar__wrap) {
        overflow-x: hidden;
      }

      :deep(.el-scrollbar__bar.is-vertical) {
        width: 4px;
      }

      :deep(.el-scrollbar__thumb) {
        background-color: var(--el-border-color-darker);
        transition: background-color 0.2s;

        &:hover {
          background-color: var(--el-text-color-secondary);
        }
      }
    }

    .type-list {
      min-height: 100%;

      .type-item {
        display: flex;
        align-items: center;
        padding: 9px 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-left: 3px solid transparent;

        &:hover {
          background-color: var(--el-fill-color-light);
        }

        &.active {
          background-color: #e8f4ff;
          border-left-color: var(--el-color-primary);

          .type-name {
            color: var(--el-color-primary-dark-2);
            font-weight: 600;
          }
        }

        &.is-system .type-name::after {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--el-color-warning);
          border-radius: 50%;
          margin-left: 4px;
          vertical-align: middle;
        }

        .type-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: baseline;
          gap: 2px;

          .type-name {
            font-size: 13px;
            color: var(--el-text-color-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .type-separator {
            color: var(--el-text-color-placeholder);
            font-size: 12px;
            flex-shrink: 0;
          }

          .type-code {
            font-size: 12px;
            color: var(--el-text-color-placeholder);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: Menlo, Monaco, Consolas, monospace;
          }
        }

        .type-arrow {
          color: var(--el-color-primary);
          margin-left: 4px;
          flex-shrink: 0;
          font-size: 13px;
        }
      }
    }

    .type-pagination {
      flex-shrink: 0;
      padding: 8px 0;
      border-top: 1px solid var(--el-border-color-extra-light);
      display: flex;
      justify-content: center;

      :deep(.el-pagination) {
        --el-pagination-button-bg-color: transparent;
      }
    }
  }

  // ========== 右侧面板 ==========
  .data-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    background: #fff;
    overflow: hidden;

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      flex-shrink: 0;

      .toolbar-left {
        display: flex;
        gap: 8px;
      }
    }

    .table-wrapper {
      flex: 1;
      padding: 0;
      overflow: hidden;

      // 操作列 sticky 效果：背景色与表头一致，避免滚动时透明穿透
      :deep(.sticky-actions) {
        .cell {
          background: inherit;
        }
      }
    }
  }
}
</style>
