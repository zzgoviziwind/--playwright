<template>
  <div class="env-editor">
    <el-table :data="envList" size="small" stripe>
      <el-table-column prop="key" label="变量名" width="200" />
      <el-table-column label="值">
        <template #default="{ row }">
          <el-input v-model="row.value" size="small" />
        </template>
      </el-table-column>
    </el-table>
    <div style="margin-top: 16px; text-align: right">
      <el-button type="primary" size="small" @click="handleSave">保存</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../../composables/useApi';

const api = useApi();

interface EnvItem {
  key: string;
  value: string;
}

const envList = ref<EnvItem[]>([]);

async function loadEnv() {
  const { data } = await api.get('/config/env');
  envList.value = Object.entries(data as Record<string, string>).map(([key, value]) => ({
    key,
    value,
  }));
}

async function handleSave() {
  const updates: Record<string, string> = {};
  for (const item of envList.value) {
    updates[item.key] = item.value;
  }
  await api.put('/config/env', updates);
  ElMessage.success('环境变量已保存');
  loadEnv();
}

onMounted(loadEnv);
</script>
