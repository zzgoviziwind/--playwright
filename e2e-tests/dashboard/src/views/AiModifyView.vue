<template>
  <div class="ai-modify">
    <el-row :gutter="20">
      <!-- 左侧: 文件选择 + 操作 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <span>修改/扩展配置</span>
          </template>
          <el-form :model="form" label-position="top">
            <el-form-item label="操作类型">
              <el-radio-group v-model="form.action">
                <el-radio value="modify">修改已有测试</el-radio>
                <el-radio value="extend">扩展新用例</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="选择测试文件" required>
              <el-select v-model="form.file" placeholder="选择文件" style="width: 100%">
                <el-option-group label="冒烟测试">
                  <el-option
                    v-for="f in smokeFiles"
                    :key="f.filePath"
                    :label="f.fileName"
                    :value="f.filePath"
                  />
                </el-option-group>
                <el-option-group label="回归测试">
                  <el-option
                    v-for="f in regressionFiles"
                    :key="f.filePath"
                    :label="f.fileName"
                    :value="f.filePath"
                  />
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item :label="form.action === 'modify' ? '变更描述' : '新增用例描述'" required>
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                :placeholder="form.action === 'modify'
                  ? '描述需要修改的内容，如：添加空用户名登录的错误提示测试'
                  : '描述要新增的测试场景，如：添加并发审核冲突的测试场景'"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="aiStore.isGenerating" @click="handleSubmit">
                {{ form.action === 'modify' ? '执行修改' : '执行扩展' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧: 进度 + 结果 -->
      <el-col :span="14">
        <el-card shadow="never" class="progress-card">
          <template #header>
            <span>执行进度</span>
          </template>
          <ProgressLog :logs="aiStore.progressLogs" />
        </el-card>
        <el-card v-if="aiStore.previewCode" shadow="never" style="margin-top: 16px">
          <template #header>
            <span>修改结果</span>
          </template>
          <CodePreview :code="aiStore.previewCode" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import { useWebSocket } from '../composables/useWebSocket';
import { useAiStore } from '../stores/ai.store';
import { useTestsStore } from '../stores/tests.store';
import ProgressLog from '../components/ai/ProgressLog.vue';
import CodePreview from '../components/ai/CodePreview.vue';

const api = useApi();
const aiStore = useAiStore();
const testsStore = useTestsStore();
const { subscribe, onEvent } = useWebSocket();

subscribe('ai');

onEvent('ai:progress', (data) => aiStore.appendLog(data.message));
onEvent('ai:complete', (data) => {
  aiStore.setGenerating(false);
  aiStore.setPreviewCode(data.code);
  ElMessage.success('AI 操作完成');
});
onEvent('ai:error', (data) => {
  aiStore.setGenerating(false);
  ElMessage.error(`AI 操作失败: ${data.error}`);
});

const form = reactive({
  action: 'modify' as 'modify' | 'extend',
  file: '',
  description: '',
});

const smokeFiles = computed(() => testsStore.files.filter((f) => f.category === 'smoke'));
const regressionFiles = computed(() => testsStore.files.filter((f) => f.category === 'regression'));

onMounted(async () => {
  if (testsStore.files.length === 0) {
    const { data } = await api.get('/tests/files');
    testsStore.setFiles(data);
  }
});

async function handleSubmit() {
  if (!form.file) return ElMessage.warning('请选择测试文件');
  if (!form.description) return ElMessage.warning('请输入描述');

  aiStore.setGenerating(true, form.action);

  try {
    if (form.action === 'modify') {
      await api.post('/ai/modify', { file: form.file, change: form.description });
    } else {
      await api.post('/ai/extend', { file: form.file, add: form.description });
    }
  } catch {
    aiStore.setGenerating(false);
  }
}
</script>

<style scoped>
.ai-modify { height: 100%; }
.progress-card { min-height: 200px; }
</style>
