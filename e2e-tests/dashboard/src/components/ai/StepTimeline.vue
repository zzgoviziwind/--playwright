<template>
  <div class="step-timeline">
    <el-timeline>
      <el-timeline-item
        v-for="step in steps"
        :key="step.id"
        :color="getStepColor(step.status)"
        :hollow="step.status === 'pending'"
        :timestamp="getTimestamp(step)"
        placement="top"
      >
        <div class="step-header" @click="toggleExpand(step.id)">
          <span class="step-name">{{ step.name }}</span>
          <el-tag :type="getTagType(step.status)" size="small" class="step-tag">
            {{ getStatusText(step.status) }}
          </el-tag>
          <span v-if="step.duration" class="step-duration">{{ formatDuration(step.duration) }}</span>
          <el-icon v-if="hasDetails(step)" class="expand-icon">
            <component :is="expandedSteps.has(step.id) ? 'ArrowUp' : 'ArrowDown'" />
          </el-icon>
        </div>

        <!-- 运行中动画 -->
        <div v-if="step.status === 'running'" class="step-running">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>处理中...</span>
        </div>

        <!-- LLM 进度条 -->
        <div v-if="step.id === 'llm-call' && step.status === 'running' && llmProgress > 0" class="llm-progress">
          <el-progress :percentage="llmProgress" :stroke-width="8" :show-text="true" :text-inside="true">
            <template #default="{ percentage }">
              <span class="llm-progress-text">{{ llmProgressStage }} - {{ percentage }}%</span>
            </template>
          </el-progress>
        </div>

        <!-- 等待确认指示 -->
        <div v-if="step.status === 'wait-confirm'" class="step-waiting">
          <el-icon class="waiting-pulse"><Bell /></el-icon>
          <span>等待确认</span>
        </div>

        <!-- 展开详情 -->
        <div v-if="expandedSteps.has(step.id) && hasDetails(step)" class="step-details">
          <!-- 调试日志 -->
          <div v-if="stepLogs(step.id).length > 0" class="step-logs">
            <div
              v-for="(log, idx) in stepLogs(step.id)"
              :key="idx"
              :class="['log-entry', `log-${log.level}`]"
            >
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <el-tag :type="getLogTagType(log.level)" size="small">{{ log.level }}</el-tag>
              <span class="log-message">{{ log.message }}</span>
              <el-button
                v-if="log.data && !log.data._truncated"
                type="primary"
                link
                size="small"
                @click="showLogData(log)"
              >详情</el-button>
            </div>
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>

    <!-- 日志数据查看对话框 -->
    <el-dialog v-model="logDataVisible" title="日志详情" width="70%">
      <pre class="log-data-content">{{ logDataContent }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Loading, Bell, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import type { PipelineStep, StepStatus, DebugLogEntry } from '../../types/interactive.types';
import { useWebSocket } from '../../composables/useWebSocket';

const props = defineProps<{
  steps: PipelineStep[];
  debugLogs: DebugLogEntry[];
}>();

const { onEvent } = useWebSocket();

const expandedSteps = ref(new Set<string>());
const logDataVisible = ref(false);
const logDataContent = ref('');

// LLM 进度状态
const llmProgress = ref(0);
const llmProgressStage = ref('');

// 监听 LLM 进度事件
onMounted(() => {
  onEvent('ai:llm-progress', (data) => {
    llmProgress.value = data.progress;
    llmProgressStage.value = data.stage;
  });
});

// 组件卸载时清理（由 useWebSocket 自动处理）

function toggleExpand(stepId: string) {
  if (expandedSteps.value.has(stepId)) {
    expandedSteps.value.delete(stepId);
  } else {
    expandedSteps.value.add(stepId);
  }
}

function stepLogs(stepId: string): DebugLogEntry[] {
  return props.debugLogs.filter((l) => l.step === stepId);
}

function hasDetails(step: PipelineStep): boolean {
  return stepLogs(step.id).length > 0 || !!step.data;
}

function getStepColor(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    pending: '#909399',
    running: '#409EFF',
    'wait-confirm': '#E6A23C',
    completed: '#67C23A',
    skipped: '#C0C4CC',
    failed: '#F56C6C',
  };
  return map[status];
}

function getTagType(status: StepStatus): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<StepStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'info',
    running: '',
    'wait-confirm': 'warning',
    completed: 'success',
    skipped: 'info',
    failed: 'danger',
  };
  return map[status];
}

function getStatusText(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    pending: '待执行',
    running: '运行中',
    'wait-confirm': '等待确认',
    completed: '已完成',
    skipped: '已跳过',
    failed: '失败',
  };
  return map[status];
}

function getTimestamp(step: PipelineStep): string {
  if (step.startedAt) {
    return new Date(step.startedAt).toLocaleTimeString();
  }
  return '';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

function getLogTagType(level: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    info: 'info',
    debug: '',
    warn: 'warning',
    error: 'danger',
  };
  return map[level] || 'info';
}

function showLogData(log: DebugLogEntry) {
  logDataContent.value = JSON.stringify(log.data, null, 2);
  logDataVisible.value = true;
}
</script>

<style scoped>
.step-timeline { padding: 8px 0; }
.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.step-name { font-weight: 600; font-size: 14px; }
.step-tag { flex-shrink: 0; }
.step-duration { color: #909399; font-size: 12px; margin-left: auto; }
.expand-icon { color: #909399; font-size: 12px; }
.step-running {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #409EFF;
  font-size: 13px;
  margin-top: 4px;
}
.llm-progress {
  margin-top: 8px;
}
.llm-progress-text {
  font-size: 12px;
  font-weight: 500;
}
.step-waiting {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #E6A23C;
  font-size: 13px;
  margin-top: 4px;
}
.waiting-pulse { animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.step-details {
  margin-top: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}
.step-logs { font-size: 12px; }
.log-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  border-bottom: 1px solid #ebeef5;
}
.log-entry:last-child { border-bottom: none; }
.log-time { color: #909399; font-family: monospace; flex-shrink: 0; }
.log-message { flex: 1; word-break: break-all; }
.log-error { background: #fef0f0; }
.log-warn { background: #fdf6ec; }
.log-data-content {
  max-height: 500px;
  overflow: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
