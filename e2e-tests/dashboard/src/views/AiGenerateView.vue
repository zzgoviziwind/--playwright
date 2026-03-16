<template>
  <div class="ai-generate">
    <el-row :gutter="20">
      <!-- 左侧：参数表单 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <span>生成配置</span>
          </template>
          <el-form :model="form" label-width="100px" label-position="top">
            <el-form-item label="功能描述" required>
              <el-input
                v-model="form.feature"
                type="textarea"
                :rows="3"
                placeholder="描述需要测试的功能，如：医生登录功能、报告审核流程"
              />
            </el-form-item>
            <el-form-item label="测试类型" required>
              <el-radio-group v-model="form.type">
                <el-radio value="smoke">冒烟测试 (2-4 个核心用例)</el-radio>
                <el-radio value="regression">回归测试 (6-12 个全面用例)</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="输出文件名">
              <el-input v-model="form.output" placeholder="留空自动生成" />
            </el-form-item>
            <el-divider>交互模式</el-divider>
            <el-form-item label-width="0">
              <el-switch
                v-model="form.interactive"
                active-text="启用交互模式（逐步确认每个生成步骤）"
              />
            </el-form-item>
            <el-divider>AI 模型参数</el-divider>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="Temperature">
                  <el-slider v-model="form.temperature" :min="0" :max="1" :step="0.1" show-input input-size="small" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Max Tokens">
                  <el-input-number v-model="form.maxTokens" :min="1024" :max="16384" :step="1024" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item>
              <el-button-group>
                <el-button type="primary" :loading="aiStore.isGenerating" @click="handlePreview">
                  预览代码
                </el-button>
                <el-button type="success" :loading="aiStore.isGenerating" @click="handleGenerate">
                  生成文件
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：进度 + 代码预览 -->
      <el-col :span="14">
        <el-card shadow="never" class="progress-card">
          <template #header>
            <span>{{ form.interactive ? '生成步骤' : '生成进度' }}</span>
          </template>
          <!-- 交互模式显示 StepTimeline，否则显示 ProgressLog -->
          <StepTimeline
            v-if="form.interactive"
            :steps="aiStore.pipelineSteps"
            :debug-logs="aiStore.debugLogs"
          />
          <ProgressLog v-else :logs="aiStore.progressLogs" />
        </el-card>
        <el-card v-if="aiStore.previewCode" shadow="never" style="margin-top: 16px">
          <template #header>
            <span>生成结果</span>
          </template>
          <CodePreview :code="aiStore.previewCode" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 交互式 Modal 编排容器 -->
    <InteractiveModals />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import { useWebSocket } from '../composables/useWebSocket';
import { useAiStore } from '../stores/ai.store';
import ProgressLog from '../components/ai/ProgressLog.vue';
import CodePreview from '../components/ai/CodePreview.vue';
import StepTimeline from '../components/ai/StepTimeline.vue';
import InteractiveModals from '../components/ai/InteractiveModals.vue';

const api = useApi();
const aiStore = useAiStore();
const { subscribe, onEvent } = useWebSocket();

subscribe('ai');

onEvent('ai:progress', (data) => {
  if (!aiStore.isInteractive) {
    aiStore.appendLog(data.message);
  }
});

onEvent('ai:complete', (data) => {
  aiStore.setGenerating(false);
  aiStore.setPreviewCode(data.code);
  ElMessage.success('AI 生成完成');
});

onEvent('ai:error', (data) => {
  aiStore.setGenerating(false);
  ElMessage.error(`AI 生成失败：${data.error}`);
});

const form = reactive({
  feature: '',
  type: 'smoke' as 'smoke' | 'regression',
  output: '',
  interactive: false,
  temperature: 0.3,
  maxTokens: 8192,
});

async function handlePreview() {
  if (!form.feature) return ElMessage.warning('请输入功能描述');
  aiStore.setGenerating(true, 'preview');
  try {
    const { data } = await api.post('/ai/generate/preview', {
      feature: form.feature,
      type: form.type,
      output: form.output || undefined,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
    });
    aiStore.setPreviewCode(data.code);
  } catch {
    // error handled by interceptor
  } finally {
    aiStore.setGenerating(false);
  }
}

async function handleGenerate() {
  if (!form.feature) return ElMessage.warning('请输入功能描述');
  aiStore.setInteractive(form.interactive);
  aiStore.setGenerating(true, 'generate');
  try {
    const { data } = await api.post('/ai/generate', {
      feature: form.feature,
      type: form.type,
      output: form.output || undefined,
      interactive: form.interactive,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
    });
    // 交互模式返回 sessionId，自动模式返回 taskId
    if (data.interactive && data.sessionId) {
      aiStore.setSessionId(data.sessionId);
      ElMessage.success('交互式会话已启动，请在左侧查看步骤');
    }
    // 进度通过 WebSocket 推送
  } catch {
    aiStore.setGenerating(false);
  }
}
</script>

<style scoped>
.ai-generate { height: 100%; }
.progress-card { min-height: 200px; }
</style>
