import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PageAnalysis } from '../types/analyzer.types';

export const useAnalyzerStore = defineStore('analyzer', () => {
  const isAnalyzing = ref(false);
  const taskId = ref<string | null>(null);
  const progressLogs = ref<string[]>([]);
  const pageAnalysis = ref<PageAnalysis | null>(null);
  const previewCode = ref('');
  const screenshot = ref('');

  function setAnalyzing(val: boolean, id?: string) {
    isAnalyzing.value = val;
    taskId.value = id || null;
    if (val) {
      progressLogs.value = [];
      previewCode.value = '';
    }
  }

  function appendLog(message: string) {
    progressLogs.value.push(message);
    if (progressLogs.value.length > 500) {
      progressLogs.value = progressLogs.value.slice(-400);
    }
  }

  function setPageAnalysis(analysis: PageAnalysis) {
    pageAnalysis.value = analysis;
  }

  function setScreenshot(data: string) {
    screenshot.value = data;
  }

  function setPreviewCode(code: string) {
    previewCode.value = code;
  }

  function reset() {
    isAnalyzing.value = false;
    taskId.value = null;
    progressLogs.value = [];
    pageAnalysis.value = null;
    previewCode.value = '';
    screenshot.value = '';
  }

  return {
    isAnalyzing,
    taskId,
    progressLogs,
    pageAnalysis,
    previewCode,
    screenshot,
    setAnalyzing,
    appendLog,
    setPageAnalysis,
    setScreenshot,
    setPreviewCode,
    reset,
  };
});
