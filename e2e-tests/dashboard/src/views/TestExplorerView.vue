<template>
  <div class="test-explorer">
    <!-- 搜索筛选栏 -->
    <el-card shadow="never" class="filter-bar">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-input
            v-model="searchText"
            placeholder="搜索文件名或测试名称"
            clearable
            prefix-icon="Search"
          />
        </el-col>
        <el-col :span="8">
          <el-radio-group v-model="categoryFilter">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="smoke">冒烟测试</el-radio-button>
            <el-radio-button value="regression">回归测试</el-radio-button>
          </el-radio-group>
        </el-col>
        <el-col :span="4">
          <el-select v-model="sortBy" style="width: 100%">
            <el-option label="按名称" value="name" />
            <el-option label="按修改时间" value="time" />
            <el-option label="按用例数" value="count" />
          </el-select>
        </el-col>
        <el-col :span="4" style="text-align: right">
          <el-tag type="info">{{ filteredFiles.length }} 个文件</el-tag>
        </el-col>
      </el-row>
    </el-card>

    <!-- 卡片网格 -->
    <div class="card-grid">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      <div v-else-if="filteredFiles.length === 0" class="empty-container">
        <el-empty description="未找到匹配的测试文件" />
      </div>
      <div v-else class="grid-container">
        <TestCard
          v-for="file in filteredFiles"
          :key="file.filePath"
          :file="file"
          @edit="handleEdit"
          @run="handleRun"
          @ai-modify="handleAiModify"
          @delete="handleDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import TestCard from '../components/explorer/TestCard.vue';

const api = useApi();
const router = useRouter();

const loading = ref(false);
const searchText = ref('');
const categoryFilter = ref('all');
const sortBy = ref('name');

interface TestFileInfo {
  fileName: string;
  filePath: string;
  category: 'smoke' | 'regression';
  testCount: number;
  testNames?: string[];
  modifiedTime?: string;
  size?: number;
}

const files = ref<TestFileInfo[]>([]);

const filteredFiles = computed(() => {
  let result = [...files.value];

  // 分类筛选
  if (categoryFilter.value !== 'all') {
    result = result.filter((f) => f.category === categoryFilter.value);
  }

  // 搜索
  if (searchText.value) {
    const query = searchText.value.toLowerCase();
    result = result.filter(
      (f) =>
        f.fileName.toLowerCase().includes(query) ||
        (f.testNames && f.testNames.some((n) => n.toLowerCase().includes(query)))
    );
  }

  // 排序
  result.sort((a, b) => {
    if (sortBy.value === 'name') return a.fileName.localeCompare(b.fileName);
    if (sortBy.value === 'count') return (b.testCount || 0) - (a.testCount || 0);
    if (sortBy.value === 'time') {
      return (b.modifiedTime || '').localeCompare(a.modifiedTime || '');
    }
    return 0;
  });

  return result;
});

async function loadFiles() {
  loading.value = true;
  try {
    const { data } = await api.get('/tests/files');
    files.value = data;
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false;
  }
}

function handleEdit(file: TestFileInfo) {
  router.push(`/tests?file=${encodeURIComponent(file.filePath)}`);
}

function handleRun(file: TestFileInfo) {
  router.push(`/runner?file=${encodeURIComponent(file.filePath)}`);
}

function handleAiModify(file: TestFileInfo) {
  router.push(`/ai/modify?file=${encodeURIComponent(file.filePath)}`);
}

async function handleDelete(file: TestFileInfo) {
  try {
    await api.delete(`/tests/files/${file.filePath}`);
    ElMessage.success(`已删除: ${file.fileName}`);
    await loadFiles();
  } catch {
    // handled by interceptor
  }
}

onMounted(() => {
  loadFiles();
});
</script>

<style scoped>
.test-explorer {
  height: 100%;
}
.filter-bar {
  margin-bottom: 16px;
}
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}
.loading-container, .empty-container {
  padding: 40px 0;
}
</style>
