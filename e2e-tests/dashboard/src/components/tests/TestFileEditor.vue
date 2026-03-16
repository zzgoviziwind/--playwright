<template>
  <div class="file-editor">
    <textarea
      class="editor-textarea"
      :value="modelValue"
      @input="handleInput"
      spellcheck="false"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

function handleInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
}
</script>

<style scoped>
.file-editor {
  width: 100%;
}
.editor-textarea {
  width: 100%;
  min-height: 400px;
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
.editor-textarea:focus {
  outline: 1px solid #409eff;
  border-color: #409eff;
}
</style>
