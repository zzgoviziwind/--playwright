import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRunnerStore = defineStore('runner', () => {
  const isRunning = ref(false);
  const runId = ref<string | null>(null);
  const logs = ref<string[]>([]);
  const exitCode = ref<number | null>(null);

  function setRunning(val: boolean, id?: string) {
    isRunning.value = val;
    runId.value = id || null;
    if (val) {
      logs.value = [];
      exitCode.value = null;
    }
  }

  function appendLog(line: string) {
    logs.value.push(line);
    if (logs.value.length > 5000) {
      logs.value = logs.value.slice(-4000);
    }
  }

  function setDone(code: number) {
    isRunning.value = false;
    exitCode.value = code;
  }

  return { isRunning, runId, logs, exitCode, setRunning, appendLog, setDone };
});
