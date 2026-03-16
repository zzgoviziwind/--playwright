<template>
  <div class="test-manager">
    <el-row :gutter="20">
      <!-- 左侧: 文件树 -->
      <el-col :span="7">
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>测试文件</span>
              <el-button size="small" @click="loadFiles">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <TestFileTree :files="testsStore.files" @select="handleSelect" />
        </el-card>
      </el-col>

      <!-- 右侧: 用例列表 + 编辑器 -->
      <el-col :span="17">
        <el-card v-if="selectedMeta" shadow="never" style="margin-bottom: 16px">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>{{ selectedMeta.fileName }} ({{ selectedMeta.testCount }} 个用例)</span>
              <span style="color: #909399; font-size: 12px">
                修改于 {{ new Date(selectedMeta.modifiedAt).toLocaleString() }}
              </span>
            </div>
          </template>
          <TestCaseTable :test-names="selectedMeta.testNames" />
        </el-card>

        <el-card v-if="testsStore.selectedFile" shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>代码编辑</span>
              <el-button-group>
                <el-button size="small" type="primary" @click="handleSave">保存</el-button>
              </el-button-group>
            </div>
          </template>
          <TestFileEditor v-model="testsStore.fileContent" />
        </el-card>

        <el-empty v-if="!testsStore.selectedFile" description="选择左侧文件查看内容" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import { useTestsStore } from '../stores/tests.store';
import TestFileTree from '../components/tests/TestFileTree.vue';
import TestCaseTable from '../components/tests/TestCaseTable.vue';
import TestFileEditor from '../components/tests/TestFileEditor.vue';

const api = useApi();
const testsStore = useTestsStore();

const selectedMeta = computed(() =>
  testsStore.files.find((f) => f.filePath === testsStore.selectedFile) || null
);

async function loadFiles() {
  const { data } = await api.get('/tests/files');
  testsStore.setFiles(data);
}

async function handleSelect(filePath: string) {
  testsStore.selectFile(filePath);
  const { data } = await api.get(`/tests/files/${filePath}`);
  testsStore.setFileContent(data.content);
}

async function handleSave() {
  if (!testsStore.selectedFile) return;
  await api.put(`/tests/files/${testsStore.selectedFile}`, {
    content: testsStore.fileContent,
  });
  ElMessage.success('保存成功');
  loadFiles();
}

onMounted(loadFiles);
</script>

<style scoped>
.test-manager { height: 100%; }
</style>
