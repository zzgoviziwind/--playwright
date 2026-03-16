<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="确认 Prompt"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="prompt-review">
      <p class="intro">以下是将要发送给 LLM 的完整 Prompt，你可以编辑它：</p>

      <div class="prompt-section">
        <h4>System Prompt</h4>
        <div class="prompt-block system-prompt">{{ systemPrompt }}</div>
      </div>

      <div class="prompt-section">
        <h4>User Prompt <span class="char-count">({{ userPrompt.length }} 字符)</span></h4>
        <Codemirror
          v-model="editedPrompt"
          :options="cmOptions"
          class="prompt-editor"
        />
      </div>
    </div>

    <template #footer>
      <el-button type="danger" @click="$emit('abort')">中止</el-button>
      <el-button type="primary" @click="handleSend">发送到 LLM</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';

const props = defineProps<{
  visible: boolean;
  data: {
    systemPrompt: string;
    userPrompt: string;
  };
}>();

const emit = defineEmits<{
  send: [editedData: { userPrompt: string }];
  abort: [];
  'update:visible': [value: boolean];
}>();

const editedPrompt = ref('');
const cmOptions = {
  mode: 'text/markdown',
  lineNumbers: true,
  readOnly: false,
  theme: 'one-dark',
};

const systemPrompt = computed(() => props.data?.systemPrompt || '');

watch(
  () => props.data?.userPrompt,
  (val) => {
    if (val) editedPrompt.value = val;
  },
  { immediate: true }
);

function handleSend() {
  emit('send', { userPrompt: editedPrompt.value });
}
</script>

<style scoped>
.prompt-review { max-height: 70vh; overflow-y: auto; }
.intro { margin-bottom: 16px; color: #606266; }
.prompt-section { margin-bottom: 20px; }
.prompt-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}
.char-count { color: #909399; font-size: 12px; font-weight: normal; }
.prompt-block {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
.system-prompt { color: #606266; }
.prompt-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  height: 400px;
}
</style>
