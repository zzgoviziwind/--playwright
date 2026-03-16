<template>
  <el-dialog
    v-model="localVisible"
    :title="`步骤失败：${data?.stepName || '未知步骤'}`"
    width="60%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="step-error">
      <el-alert
        title="步骤执行失败"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />

      <div class="error-details">
        <h4>错误信息</h4>
        <div class="error-message">
          <el-icon class="error-icon"><CircleClose /></el-icon>
          <span>{{ data?.error || '未知错误' }}</span>
        </div>
      </div>

      <div v-if="data?.stack" class="error-stack">
        <h4>堆栈跟踪</h4>
        <pre>{{ data.stack }}</pre>
      </div>
    </div>

    <template #footer>
      <el-button
        v-if="data?.retryable !== false"
        type="warning"
        @click="$emit('retry')"
      >
        重试
      </el-button>
      <el-button @click="$emit('skip')">跳过此步</el-button>
      <el-button type="danger" @click="$emit('abort')">中止流程</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CircleClose } from '@element-plus/icons-vue';

const props = defineProps<{
  visible: boolean;
  data: {
    stepName: string;
    error: string;
    retryable?: boolean;
    stack?: string;
  };
}>();

const emit = defineEmits<{
  retry: [];
  skip: [];
  abort: [];
  'update:visible': [value: boolean];
}>();

const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});
</script>

<style scoped>
.step-error { max-height: 60vh; overflow-y: auto; }
.error-details { margin-bottom: 16px; }
h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  color: #F56C6C;
  font-size: 14px;
}
.error-icon { font-size: 20px; }
.error-stack {
  margin-top: 16px;
}
.error-stack pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
