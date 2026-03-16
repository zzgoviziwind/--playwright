<template>
  <div class="test-runner">
    <!-- 顶部: 配置区 -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <el-row :gutter="20" align="middle">
        <el-col :span="8">
          <div class="form-label">测试项目</div>
          <el-checkbox-group v-model="form.projects">
            <el-checkbox value="smoke-chromium" label="Smoke (Chrome)" />
            <el-checkbox value="regression-chromium" label="Regression (Chrome)" />
            <el-checkbox value="regression-firefox" label="Regression (Firefox)" />
          </el-checkbox-group>
        </el-col>
        <el-col :span="4">
          <div class="form-label">重试次数</div>
          <el-input-number v-model="form.retries" :min="0" :max="5" size="small" />
        </el-col>
        <el-col :span="4">
          <div class="form-label">并发数</div>
          <el-input-number v-model="form.workers" :min="1" :max="8" size="small" />
        </el-col>
        <el-col :span="3">
          <div class="form-label">有头模式</div>
          <el-switch v-model="form.headed" />
        </el-col>
        <el-col :span="5">
          <el-button
            type="primary"
            :loading="runnerStore.isRunning"
            :disabled="form.projects.length === 0"
            @click="handleStart"
          >
            <el-icon><VideoPlay /></el-icon> 开始执行
          </el-button>
          <el-button
            v-if="runnerStore.isRunning"
            type="danger"
            @click="handleStop"
          >
            停止
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 中间: 实时日志 -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>执行日志</span>
          <el-tag v-if="runnerStore.isRunning" type="warning" effect="light" size="small">运行中</el-tag>
          <el-tag v-else-if="runnerStore.exitCode !== null" :type="runnerStore.exitCode === 0 ? 'success' : 'danger'" effect="light" size="small">
            退出码: {{ runnerStore.exitCode }}
          </el-tag>
        </div>
      </template>
      <LiveConsole :logs="runnerStore.logs" />
    </el-card>

    <!-- 底部: 结果摘要 -->
    <el-card v-if="runnerStore.exitCode !== null" shadow="never">
      <template #header>
        <span>测试结果</span>
      </template>
      <ResultSummary :exit-code="runnerStore.exitCode" :log-count="runnerStore.logs.length" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import { useWebSocket } from '../composables/useWebSocket';
import { useRunnerStore } from '../stores/runner.store';
import LiveConsole from '../components/runner/LiveConsole.vue';
import ResultSummary from '../components/runner/ResultSummary.vue';

const api = useApi();
const runnerStore = useRunnerStore();
const { subscribe, onEvent } = useWebSocket();

subscribe('runner');

onEvent('runner:log', (data) => {
  runnerStore.appendLog(data.line);
});

onEvent('runner:done', (data) => {
  runnerStore.setDone(data.exitCode);
  if (data.exitCode === 0) {
    ElMessage.success('测试执行完成');
  } else {
    ElMessage.warning(`测试执行完成，退出码: ${data.exitCode}`);
  }
});

const form = reactive({
  projects: ['smoke-chromium'] as string[],
  retries: 0,
  workers: 1,
  headed: false,
});

async function handleStart() {
  runnerStore.setRunning(true);
  try {
    const { data } = await api.post('/runner/start', {
      projects: form.projects,
      retries: form.retries,
      workers: form.workers,
      headed: form.headed,
    });
    runnerStore.setRunning(true, data.runId);
  } catch {
    runnerStore.setRunning(false);
  }
}

async function handleStop() {
  try {
    await api.post('/runner/stop');
    ElMessage.info('正在停止测试...');
  } catch {
    // error handled by interceptor
  }
}
</script>

<style scoped>
.test-runner { height: 100%; }
.form-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
</style>
