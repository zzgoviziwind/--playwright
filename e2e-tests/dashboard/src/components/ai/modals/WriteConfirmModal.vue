<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="确认文件写入"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="write-confirm">
      <el-alert
        v-if="data?.fileExists"
        title="文件已存在，将覆盖已有文件"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />

      <div class="file-info">
        <h4>目标文件</h4>
        <div class="file-path">
          <el-icon><Document /></el-icon>
          <span>{{ data?.fileName }}</span>
        </div>
        <div class="full-path">{{ data?.targetPath }}</div>
      </div>

      <div class="file-stats">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用例数">{{ data?.testCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="代码长度">
            {{ data?.code?.length || 0 }} 字符
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="code-preview">
        <h4>代码预览</h4>
        <Codemirror
          v-model="codePreview"
          :options="cmOptions"
          class="preview-editor"
          :readonly="true"
        />
      </div>
    </div>

    <template #footer>
      <el-button type="danger" @click="$emit('abort')">中止</el-button>
      <el-button @click="showPathInput = true">修改路径</el-button>
      <el-button type="primary" @click="$emit('confirm')">确认写入</el-button>
    </template>

    <!-- 修改路径对话框 -->
    <el-dialog 
      :model-value="showPathInput"
      @update:model-value="showPathInput = $event"
      title="修改文件路径" 
      width="50%" 
      append-to-body
    >
      <el-form label-width="100px">
        <el-form-item label="文件名">
          <el-input v-model="tempFileName" placeholder="例如：login-ai.spec.ts" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPathInput = false">取消</el-button>
        <el-button type="primary" @click="handlePathChange">确认</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Document } from '@element-plus/icons-vue';
import { Codemirror } from 'vue-codemirror';

const props = defineProps<{
  visible: boolean;
  data: {
    targetPath: string;
    fileName: string;
    testCount: number;
    fileExists: boolean;
    code: string;
  };
}>();

const emit = defineEmits<{
  confirm: [filePath?: string];
  abort: [];
  'update:visible': [value: boolean];
}>();

const showPathInput = ref(false);
const tempFileName = ref('');
const codePreview = ref('');
const cmOptions = {
  mode: 'text/typescript',
  lineNumbers: false,
  readOnly: true,
  theme: 'one-dark',
};

watch(
  () => props.data?.code,
  (val) => {
    if (val) codePreview.value = val;
  },
  { immediate: true }
);

watch(
  () => props.data?.fileName,
  (val) => {
    if (val) tempFileName.value = val;
  },
  { immediate: true }
);

function handlePathChange() {
  if (tempFileName.value) {
    emit('confirm', tempFileName.value);
    showPathInput.value = false;
  }
}
</script>

<style scoped>
.write-confirm { max-height: 70vh; overflow-y: auto; }
.file-info, .file-stats, .code-preview { margin-bottom: 16px; }
h4 { margin: 0 0 8px 0; font-size: 14px; color: #303133; }
.file-path {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.full-path { color: #909399; font-size: 12px; margin-top: 4px; font-family: monospace; }
.preview-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  height: 300px;
}
</style>
