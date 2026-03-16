<template>
  <div class="test-card">
    <el-card shadow="hover" class="card-body">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <span class="file-name">{{ file.fileName }}</span>
            <el-tag size="small" :type="file.category === 'smoke' ? 'warning' : 'primary'">
              {{ file.category === 'smoke' ? '冒烟' : '回归' }}
            </el-tag>
            <el-tag size="small" type="info">{{ file.testCount }} 个用例</el-tag>
          </div>
          <div class="card-actions">
            <el-button size="small" text type="primary" @click="$emit('edit', file)">编辑</el-button>
            <el-button size="small" text type="success" @click="$emit('run', file)">运行</el-button>
            <el-button size="small" text type="warning" @click="$emit('ai-modify', file)">AI 修改</el-button>
            <el-popconfirm title="确定要删除此测试文件吗？" @confirm="$emit('delete', file)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </template>
      <div class="card-content">
        <div class="file-path">{{ file.filePath }}</div>
        <div v-if="file.testNames && file.testNames.length > 0" class="test-names">
          <div
            v-for="(name, i) in displayedNames"
            :key="i"
            class="test-name-item"
          >
            <el-icon size="12" color="#67c23a"><Check /></el-icon>
            {{ name }}
          </div>
          <el-button
            v-if="file.testNames.length > 3 && !showAll"
            size="small"
            text
            @click="showAll = true"
          >
            展开全部 ({{ file.testNames.length }})
          </el-button>
          <el-button
            v-if="showAll && file.testNames.length > 3"
            size="small"
            text
            @click="showAll = false"
          >
            收起
          </el-button>
        </div>
        <div v-if="file.modifiedTime" class="file-meta">
          <span>修改: {{ formatTime(file.modifiedTime) }}</span>
          <span v-if="file.size">大小: {{ formatSize(file.size) }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check } from '@element-plus/icons-vue';

interface TestFileInfo {
  fileName: string;
  filePath: string;
  category: 'smoke' | 'regression';
  testCount: number;
  testNames?: string[];
  modifiedTime?: string;
  size?: number;
}

const props = defineProps<{ file: TestFileInfo }>();
defineEmits<{
  edit: [file: TestFileInfo];
  run: [file: TestFileInfo];
  'ai-modify': [file: TestFileInfo];
  delete: [file: TestFileInfo];
}>();

const showAll = ref(false);

const displayedNames = computed(() => {
  if (!props.file.testNames) return [];
  if (showAll.value) return props.file.testNames;
  return props.file.testNames.slice(0, 3);
});

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.file-name {
  font-weight: 600;
  font-size: 14px;
}
.card-actions {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}
.card-content {
  font-size: 13px;
}
.file-path {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}
.test-names {
  margin-bottom: 8px;
}
.test-name-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  padding: 2px 0;
}
.file-meta {
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 12px;
}
</style>
