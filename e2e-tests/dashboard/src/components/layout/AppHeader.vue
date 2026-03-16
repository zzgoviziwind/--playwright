<template>
  <div class="header">
    <span class="header-title">{{ pageTitle }}</span>
    <div class="header-status">
      <el-tag v-if="runnerStore.isRunning" type="warning" effect="dark" size="small">
        测试运行中
      </el-tag>
      <el-tag v-if="aiStore.isGenerating" type="primary" effect="dark" size="small">
        AI 生成中
      </el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRunnerStore } from '../../stores/runner.store';
import { useAiStore } from '../../stores/ai.store';

const route = useRoute();
const runnerStore = useRunnerStore();
const aiStore = useAiStore();

const titleMap: Record<string, string> = {
  '/ai/generate': 'AI 测试生成',
  '/ai/modify': 'AI 测试修改',
  '/tests': '回归测试用例管理',
  '/runner': '测试执行控制台',
  '/config': '全局配置管理',
};

const pageTitle = computed(() => titleMap[route.path] || 'E2E 测试管理平台');
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.header-status {
  display: flex;
  gap: 8px;
}
</style>
