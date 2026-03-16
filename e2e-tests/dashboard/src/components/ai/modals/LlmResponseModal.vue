<template>
  <el-dialog
    v-model="localVisible"
    title="LLM 响应"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="llm-response">
      <div class="response-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模型">{{ data?.model || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="响应长度">
            {{ data?.rawResponse?.length || 0 }} 字符
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="response-content">
        <h4>LLM 原始响应</h4>
        <Codemirror
          v-model="rawResponse"
          :options="cmOptions"
          class="response-editor"
          :readonly="true"
        />
      </div>
    </div>

    <template #footer>
      <el-button type="danger" @click="$emit('abort')">中止</el-button>
      <el-button @click="$emit('retry')">重新生成</el-button>
      <el-button type="primary" @click="$emit('confirm')">确认，继续后处理</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Codemirror } from 'vue-codemirror';

const props = defineProps<{
  visible: boolean;
  data: {
    rawResponse: string;
    model: string;
  };
}>();

const emit = defineEmits<{
  confirm: [];
  retry: [];
  abort: [];
  'update:visible': [value: boolean];
}>();

const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const rawResponse = ref('');
const cmOptions = {
  mode: 'text/javascript',
  lineNumbers: true,
  readOnly: true,
  theme: 'one-dark',
};

watch(
  () => props.data?.rawResponse,
  (val) => {
    if (val) rawResponse.value = val;
  },
  { immediate: true }
);
</script>

<style scoped>
.llm-response { max-height: 70vh; overflow-y: auto; }
.response-info { margin-bottom: 16px; }
.response-content h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
.response-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  height: 500px;
}
</style>
