<template>
  <div class="url-analyze">
    <el-row :gutter="20">
      <!-- 左侧: 配置面板 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <span>URL 智能分析</span>
          </template>
          <el-form :model="form" label-position="top">
            <el-form-item label="目标 URL" required>
              <el-input
                v-model="form.url"
                placeholder="https://example.com"
                clearable
              >
                <template #prepend>URL</template>
              </el-input>
            </el-form-item>
            <el-form-item label="功能补充描述（可选）">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="2"
                placeholder="可选：描述页面主要功能，帮助 AI 生成更精准的测试，如：用户登录页面、订单列表页"
              />
            </el-form-item>

            <!-- 认证配置 -->
            <el-collapse v-model="authExpanded" style="margin-bottom: 16px">
              <el-collapse-item title="认证配置（可选）" name="auth">
                <el-form-item label="Cookie (JSON 数组)">
                  <el-input
                    v-model="form.authCookies"
                    type="textarea"
                    :rows="3"
                    placeholder='[{"name":"token","value":"xxx","domain":".example.com"}]'
                  />
                </el-form-item>
                <el-form-item label="localStorage (JSON 对象)">
                  <el-input
                    v-model="form.authLocalStorage"
                    type="textarea"
                    :rows="2"
                    placeholder='{"token":"xxx","user":"admin"}'
                  />
                </el-form-item>
              </el-collapse-item>
            </el-collapse>

            <el-form-item label="测试类型" required>
              <el-radio-group v-model="form.type">
                <el-radio value="smoke">冒烟测试 (2-4 个核心用例)</el-radio>
                <el-radio value="regression">回归测试 (6-12 个全面用例)</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="输出文件名">
              <el-input v-model="form.output" placeholder="留空自动生成" />
            </el-form-item>
            <el-form-item label="额外等待时间">
              <el-slider v-model="form.waitTime" :min="0" :max="10000" :step="500" :format-tooltip="(v: number) => `${v}ms`" show-input input-size="small" />
            </el-form-item>
            <el-form-item>
              <el-button-group>
                <el-button
                  type="info"
                  :loading="analyzerStore.isAnalyzing"
                  @click="handleAnalyze"
                >
                  分析页面
                </el-button>
                <el-button
                  type="primary"
                  :loading="analyzerStore.isAnalyzing"
                  @click="handlePreview"
                >
                  预览测试
                </el-button>
                <el-button
                  type="success"
                  :loading="analyzerStore.isAnalyzing"
                  @click="handleGenerate"
                >
                  生成文件
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧: 结果面板 -->
      <el-col :span="14">
        <!-- 进度日志 -->
        <el-card shadow="never" class="progress-card">
          <template #header>
            <span>执行进度</span>
          </template>
          <ProgressLog :logs="analyzerStore.progressLogs" />
        </el-card>

        <!-- 页面分析结果 -->
        <el-card v-if="analyzerStore.pageAnalysis" shadow="never" style="margin-top: 16px">
          <template #header>
            <span>页面分析结果</span>
          </template>
          <PageAnalysisPanel
            :analysis="analyzerStore.pageAnalysis"
            :screenshot="analyzerStore.screenshot"
          />
        </el-card>

        <!-- 生成代码预览 -->
        <el-card v-if="analyzerStore.previewCode" shadow="never" style="margin-top: 16px">
          <template #header>
            <span>生成结果</span>
          </template>
          <CodePreview :code="analyzerStore.previewCode" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import { useWebSocket } from '../composables/useWebSocket';
import { useAnalyzerStore } from '../stores/analyzer.store';
import ProgressLog from '../components/ai/ProgressLog.vue';
import CodePreview from '../components/ai/CodePreview.vue';
import PageAnalysisPanel from '../components/analyzer/PageAnalysisPanel.vue';

const api = useApi();
const analyzerStore = useAnalyzerStore();
const { subscribe, onEvent } = useWebSocket();

subscribe('analyzer');

onEvent('analyzer:progress', (data) => {
  analyzerStore.appendLog(data.message);
});

onEvent('analyzer:analyzed', (data) => {
  if (data.analysis) {
    analyzerStore.setPageAnalysis(data.analysis);
  }
});

onEvent('analyzer:complete', (data) => {
  analyzerStore.setAnalyzing(false);
  if (data.code) {
    analyzerStore.setPreviewCode(data.code);
  }
  if (data.screenshot) {
    analyzerStore.setScreenshot(data.screenshot);
  }
  ElMessage.success(data.filePath ? `文件已生成: ${data.filePath}` : '测试代码生成完成');
});

onEvent('analyzer:error', (data) => {
  analyzerStore.setAnalyzing(false);
  ElMessage.error(`分析失败: ${data.error}`);
});

const form = reactive({
  url: '',
  description: '',
  type: 'smoke' as 'smoke' | 'regression',
  output: '',
  waitTime: 2000,
  authCookies: '',
  authLocalStorage: '',
});

const authExpanded = ref<string[]>([]);

function parseAuth() {
  const auth: {
    cookies?: Array<{ name: string; value: string; domain: string }>;
    localStorage?: Record<string, string>;
  } = {};

  if (form.authCookies.trim()) {
    try {
      auth.cookies = JSON.parse(form.authCookies);
    } catch {
      ElMessage.warning('Cookie JSON 格式不正确');
      return null;
    }
  }
  if (form.authLocalStorage.trim()) {
    try {
      auth.localStorage = JSON.parse(form.authLocalStorage);
    } catch {
      ElMessage.warning('localStorage JSON 格式不正确');
      return null;
    }
  }

  return Object.keys(auth).length > 0 ? auth : undefined;
}

async function handleAnalyze() {
  if (!form.url) return ElMessage.warning('请输入目标 URL');
  const auth = parseAuth();
  if (auth === null) return;

  analyzerStore.setAnalyzing(true, 'analyze');
  try {
    const { data } = await api.post('/analyzer/analyze', {
      url: form.url,
      auth,
      waitTime: form.waitTime,
    });
    if (data.analysis) {
      analyzerStore.setPageAnalysis(data.analysis);
      if (data.analysis.screenshot) {
        analyzerStore.setScreenshot(data.analysis.screenshot);
      }
    }
    ElMessage.success('页面分析完成');
  } catch {
    // error handled by interceptor
  } finally {
    analyzerStore.setAnalyzing(false);
  }
}

async function handlePreview() {
  if (!form.url) return ElMessage.warning('请输入目标 URL');
  const auth = parseAuth();
  if (auth === null) return;

  analyzerStore.setAnalyzing(true, 'preview');
  try {
    const { data } = await api.post('/analyzer/generate/preview', {
      url: form.url,
      description: form.description || undefined,
      type: form.type,
      output: form.output || undefined,
      auth,
      waitTime: form.waitTime,
    });
    if (data.code) {
      analyzerStore.setPreviewCode(data.code);
    }
  } catch {
    // error handled by interceptor
  } finally {
    analyzerStore.setAnalyzing(false);
  }
}

async function handleGenerate() {
  if (!form.url) return ElMessage.warning('请输入目标 URL');
  const auth = parseAuth();
  if (auth === null) return;

  analyzerStore.setAnalyzing(true, 'generate');
  try {
    await api.post('/analyzer/generate', {
      url: form.url,
      description: form.description || undefined,
      type: form.type,
      output: form.output || undefined,
      auth,
      waitTime: form.waitTime,
    });
    // 进度通过 WebSocket 推送
  } catch {
    analyzerStore.setAnalyzing(false);
  }
}
</script>

<style scoped>
.url-analyze { height: 100%; }
.progress-card { min-height: 200px; }
</style>
