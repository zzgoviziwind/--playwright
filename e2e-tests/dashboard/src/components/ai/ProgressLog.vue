<template>
  <div class="progress-log" ref="logContainer">
    <div v-if="logs.length === 0" class="empty-hint">等待任务开始...</div>
    <div v-for="(line, i) in logs" :key="i" class="log-line">{{ line }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{ logs: string[] }>();
const logContainer = ref<HTMLElement | null>(null);

watch(() => props.logs.length, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.progress-log {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  min-height: 120px;
}
.empty-hint {
  color: #666;
  font-style: italic;
}
.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
