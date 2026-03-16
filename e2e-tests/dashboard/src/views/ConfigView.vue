<template>
  <div class="config-view">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 环境变量 -->
      <el-tab-pane label="环境变量" name="env">
        <EnvEditor />
      </el-tab-pane>

      <!-- 用户账号 -->
      <el-tab-pane label="用户账号" name="users">
        <JsonEditor file-name="users.json" title="用户凭据配置" />
      </el-tab-pane>

      <!-- 测试数据 -->
      <el-tab-pane label="测试数据" name="reports">
        <JsonEditor file-name="reports.json" title="报告样本数据" />
      </el-tab-pane>

      <!-- 体检项目 -->
      <el-tab-pane label="体检项目" name="exam-items">
        <JsonEditor file-name="exam-items.json" title="体检项目定义" />
      </el-tab-pane>

      <!-- Playwright 配置 -->
      <el-tab-pane label="Playwright 配置" name="playwright">
        <div v-if="playwrightConfig" style="margin-bottom: 12px">
          <el-tag type="info" size="small">只读</el-tag>
        </div>
        <CodePreview :code="playwrightConfig" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '../composables/useApi';
import EnvEditor from '../components/config/EnvEditor.vue';
import JsonEditor from '../components/config/JsonEditor.vue';
import CodePreview from '../components/ai/CodePreview.vue';

const api = useApi();
const activeTab = ref('env');
const playwrightConfig = ref('');

onMounted(async () => {
  const { data } = await api.get('/config/playwright');
  playwrightConfig.value = data.content;
});
</script>

<style scoped>
.config-view { height: 100%; }
</style>
