import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useBrowserViewerStore = defineStore('browserViewer', () => {
  const isRunning = ref(false);
  const screenshots = ref<Array<{ timestamp: number; data: string }>>([]);
  const isRecording = ref(false);
  const recordedActions = ref<Array<{
    action: string;
    selector: string;
    value?: string;
    timestamp: number;
  }>>([]);

  const latestScreenshot = computed(() => {
    if (screenshots.value.length === 0) return null;
    return screenshots.value[screenshots.value.length - 1];
  });

  function addScreenshot(base64Data: string) {
    screenshots.value.push({
      timestamp: Date.now(),
      data: base64Data,
    });
    // 只保留最新 10 张截图
    if (screenshots.value.length > 10) {
      screenshots.value = screenshots.value.slice(-10);
    }
  }

  function startRecording() {
    isRecording.value = true;
  }

  function stopRecording() {
    isRecording.value = false;
  }

  function addRecordedAction(action: { action: string; selector: string; value?: string }) {
    recordedActions.value.push({
      ...action,
      timestamp: Date.now(),
    });
  }

  function reset() {
    isRunning.value = false;
    screenshots.value = [];
    isRecording.value = false;
    recordedActions.value = [];
  }

  return {
    isRunning,
    screenshots,
    latestScreenshot,
    isRecording,
    recordedActions,
    addScreenshot,
    startRecording,
    stopRecording,
    addRecordedAction,
    reset,
  };
});
