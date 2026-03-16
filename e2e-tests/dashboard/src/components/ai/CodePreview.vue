<template>
  <div class="code-preview">
    <pre><code>{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
defineProps<{ code: string }>();
</script>

<style scoped>
.code-preview {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  overflow: auto;
  max-height: 500px;
}
.code-preview pre {
  margin: 0;
  padding: 12px;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
}
.code-preview code {
  font-family: inherit;
}
</style>
