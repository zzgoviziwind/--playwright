<template>
  <div class="json-editor">
    <div style="margin-bottom: 8px; color: #909399; font-size: 13px">{{ title }} ({{ fileName }})</div>
    <textarea
      class="json-textarea"
      :value="content"
      @input="content = ($event.target as HTMLTextAreaElement).value"
      spellcheck="false"
    />
    <div style="margin-top: 12px; text-align: right">
      <el-button size="small" @click="loadData">重置</el-button>
      <el-button type="primary" size="small" @click="handleSave">保存</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../../composables/useApi';

const props = defineProps<{ fileName: string; title: string }>();
const api = useApi();
const content = ref('');

async function loadData() {
  const { data } = await api.get(`/config/data/${props.fileName}`);
  content.value = JSON.stringify(data, null, 2);
}

async function handleSave() {
  try {
    const parsed = JSON.parse(content.value);
    await api.put(`/config/data/${props.fileName}`, parsed);
    ElMessage.success(`${props.title} 已保存`);
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      ElMessage.error('JSON 格式错误: ' + e.message);
    }
  }
}

onMounted(loadData);
</script>

<style scoped>
.json-textarea {
  width: 100%;
  min-height: 350px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  border: 1px solid #333;
  border-radius: 4px;
  resize: vertical;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
  box-sizing: border-box;
}
.json-textarea:focus {
  outline: 1px solid #409eff;
  border-color: #409eff;
}
</style>
