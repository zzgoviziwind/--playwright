import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConfigStore = defineStore('config', () => {
  const envVars = ref<Record<string, string>>({});
  const loading = ref(false);

  function setEnvVars(data: Record<string, string>) {
    envVars.value = data;
  }

  return { envVars, loading, setEnvVars };
});
