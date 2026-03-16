<template>
  <div class="live-console" ref="consoleEl">
    <div v-if="logs.length === 0" class="empty-hint">等待测试开始...</div>
    <div v-for="(line, i) in logs" :key="i" class="console-line" :class="{ error: isErrorLine(line) }">
      {{ line }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{ logs: string[] }>();
const consoleEl = ref<HTMLElement | null>(null);

function isErrorLine(line: string): boolean {
  return /error|fail|✘|×/i.test(line);
}

watch(() => props.logs.length, () => {
  nextTick(() => {
    if (consoleEl.value) {
      consoleEl.value.scrollTop = consoleEl.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.live-console {
  background: #0c0c0c;
  color: #cccccc;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  border-radius: 4px;
  max-height: 450px;
  min-height: 200px;
  overflow-y: auto;
}
.empty-hint {
  color: #555;
  font-style: italic;
}
.console-line {
  white-space: pre-wrap;
  word-break: break-all;
}
.console-line.error {
  color: #f56c6c;
}
</style>
