import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TestFileMeta } from '../types/api.types';

export const useTestsStore = defineStore('tests', () => {
  const files = ref<TestFileMeta[]>([]);
  const selectedFile = ref<string | null>(null);
  const fileContent = ref('');
  const loading = ref(false);

  function setFiles(data: TestFileMeta[]) {
    files.value = data;
  }

  function selectFile(filePath: string | null) {
    selectedFile.value = filePath;
  }

  function setFileContent(content: string) {
    fileContent.value = content;
  }

  return { files, selectedFile, fileContent, loading, setFiles, selectFile, setFileContent };
});
