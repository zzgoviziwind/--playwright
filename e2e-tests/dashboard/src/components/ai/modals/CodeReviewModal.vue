<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="代码审查"
    fullscreen
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="code-review">
      <el-row :gutter="16" style="height: 70vh">
        <!-- 左侧：Diff 视图 -->
        <el-col :span="12">
          <h4>后处理对比</h4>
          <el-tabs v-model="diffTab">
            <el-tab-pane label="原始代码" name="raw">
              <div class="code-block raw">{{ data?.rawCode }}</div>
            </el-tab-pane>
            <el-tab-pane label="处理后代码" name="processed">
              <div class="code-block processed">{{ data?.processedCode }}</div>
            </el-tab-pane>
          </el-tabs>
        </el-col>

        <!-- 右侧：可编辑代码 -->
        <el-col :span="12">
          <h4>
            最终代码
            <el-tag v-if="data?.warnings?.length" type="warning" size="small" style="margin-left: 8px">
              {{ data.warnings.length }} 条警告
            </el-tag>
          </h4>
          <Codemirror
            v-model="editedCode"
            :options="cmOptions"
            class="code-editor"
          />
          <div v-if="data?.warnings?.length" class="warnings-panel">
            <h5>警告</h5>
            <ul>
              <li v-for="(warning, idx) in data.warnings" :key="idx">{{ warning }}</li>
            </ul>
          </div>
        </el-col>
      </el-row>
    </div>

    <template #footer>
      <el-button type="danger" @click="$emit('abort')">中止</el-button>
      <el-button @click="handleAccept">接受</el-button>
      <el-button type="primary" @click="handleEditAccept">编辑后接受</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';

const props = defineProps<{
  visible: boolean;
  data: {
    rawCode: string;
    processedCode: string;
    warnings: string[];
  };
}>();

const emit = defineEmits<{
  accept: [code: string];
  abort: [];
  'update:visible': [value: boolean];
}>();

const diffTab = ref('processed');
const editedCode = ref('');
const cmOptions = {
  mode: 'text/typescript',
  lineNumbers: true,
  readOnly: false,
  theme: 'one-dark',
};

watch(
  () => props.data?.processedCode,
  (val) => {
    if (val) editedCode.value = val;
  },
  { immediate: true }
);

function handleAccept() {
  emit('accept', editedCode.value);
}

function handleEditAccept() {
  emit('accept', editedCode.value);
}
</script>

<style scoped>
.code-review { max-height: 75vh; overflow-y: auto; }
h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
h5 { margin: 12px 0 8px; font-size: 13px; color: #E6A23C; }
.code-block {
  height: 550px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
}
.code-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  height: 550px;
}
.warnings-panel {
  margin-top: 12px;
  padding: 12px;
  background: #fdf6ec;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
}
.warnings-panel ul { margin: 0; padding-left: 20px; }
.warnings-panel li { color: #E6A23C; font-size: 13px; margin-bottom: 4px; }
</style>
