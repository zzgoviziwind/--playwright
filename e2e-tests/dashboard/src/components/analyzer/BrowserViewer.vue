<template>
  <div class="browser-viewer">
    <!-- 状态指示器 -->
    <div class="status-indicator">
      <el-badge :is-dot="browserStore.isRunning">
        <el-tag :type="browserStore.isRunning ? 'success' : 'info'">
          {{ browserStore.isRunning ? '浏览器运行中' : '浏览器未启动' }}
        </el-tag>
      </el-badge>
      <span v-if="browserStore.isRecording" class="recording-badge">
        <el-tag type="danger" effect="dark">
          <el-icon class="is-pulse"><VideoCamera /></el-icon>
          录制中
        </el-tag>
      </span>
    </div>

    <!-- 截图展示区 -->
    <div v-if="browserStore.screenshots.length > 0" class="screenshot-area">
      <h4>实时截图</h4>
      <el-image
        :src="latestScreenshot"
        fit="contain"
        class="screenshot-image"
      >
        <template #placeholder>
          <div class="image-loading">加载中...</div>
        </template>
      </el-image>
    </div>

    <!-- 录制控制 -->
    <div class="record-controls">
      <h4>录制控制</h4>
      <el-button
        v-if="!browserStore.isRecording"
        type="danger"
        :disabled="!browserStore.isRunning"
        @click="$emit('start-recording')"
      >
        <el-icon><VideoCamera /></el-icon>
        开始录制
      </el-button>
      <el-button
        v-else
        type="success"
        @click="$emit('stop-recording')"
      >
        <el-icon><VideoPause /></el-icon>
        停止录制
      </el-button>
    </div>

    <!-- 已录制操作列表 -->
    <div v-if="browserStore.recordedActions.length > 0" class="actions-list">
      <h4>已录制的操作 ({{ browserStore.recordedActions.length }})</h4>
      <el-timeline>
        <el-timeline-item
          v-for="(action, idx) in browserStore.recordedActions.slice(0, 20)"
          :key="idx"
          :timestamp="formatTime(action.timestamp)"
          placement="top"
        >
          <el-card>
            <div class="action-item">
              <el-tag size="small">{{ action.action }}</el-tag>
              <code class="action-selector">{{ action.selector }}</code>
              <span v-if="action.value" class="action-value">"{{ action.value }}"</span>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <div v-if="browserStore.recordedActions.length > 20" class="more-actions">
        还有 {{ browserStore.recordedActions.length - 20 }} 条操作...
      </div>

      <el-button type="primary" @click="$emit('import-actions')">
        导入到可视化构建器
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VideoCamera, VideoPause } from '@element-plus/icons-vue';
import { useBrowserViewerStore } from '../../stores/browser-viewer.store';

const browserStore = useBrowserViewerStore();

const emit = defineEmits<{
  'start-recording': [];
  'stop-recording': [];
  'import-actions': [];
}>();

const latestScreenshot = computed(() => {
  if (browserStore.screenshots.length === 0) return '';
  const latest = browserStore.screenshots[browserStore.screenshots.length - 1];
  return `data:image/png;base64,${latest.data}`;
});

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
</script>

<style scoped>
.browser-viewer { padding: 12px 0; }
.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.recording-badge { animation: pulse-red 1.5s ease-in-out infinite; }
@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.screenshot-area { margin-bottom: 16px; }
.screenshot-area h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
.screenshot-image {
  width: 100%;
  max-height: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.image-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #909399;
}
.record-controls { margin-bottom: 16px; }
.record-controls h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
.actions-list h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
.action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.action-selector {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
  color: #606266;
}
.action-value { color: #67C23A; font-size: 13px; }
.more-actions {
  text-align: center;
  color: #909399;
  font-size: 13px;
  margin: 8px 0;
}
</style>
