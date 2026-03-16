<template>
  <div class="test-file-tree">
    <el-tree
      :data="treeData"
      :props="{ label: 'label', children: 'children' }"
      highlight-current
      default-expand-all
      @node-click="handleNodeClick"
    >
      <template #default="{ data }">
        <span class="tree-node">
          <el-icon v-if="data.isFolder"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span class="node-label">{{ data.label }}</span>
          <el-tag v-if="data.testCount" size="small" type="info" style="margin-left: 4px">
            {{ data.testCount }}
          </el-tag>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TestFileMeta } from '../../types/api.types';

const props = defineProps<{ files: TestFileMeta[] }>();
const emit = defineEmits<{ select: [filePath: string] }>();

const treeData = computed(() => {
  const smoke = props.files.filter((f) => f.category === 'smoke');
  const regression = props.files.filter((f) => f.category === 'regression');

  return [
    {
      label: `smoke (${smoke.length})`,
      isFolder: true,
      children: smoke.map((f) => ({
        label: f.fileName,
        filePath: f.filePath,
        testCount: f.testCount,
        isFolder: false,
      })),
    },
    {
      label: `regression (${regression.length})`,
      isFolder: true,
      children: regression.map((f) => ({
        label: f.fileName,
        filePath: f.filePath,
        testCount: f.testCount,
        isFolder: false,
      })),
    },
  ];
});

function handleNodeClick(data: any) {
  if (data.filePath) {
    emit('select', data.filePath);
  }
}
</script>

<style scoped>
.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
