<template>
  <el-table :data="tableData" size="small" stripe max-height="200">
    <el-table-column type="index" label="#" width="50" />
    <el-table-column prop="name" label="用例名称" />
  </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ testNames: string[] }>();

const tableData = computed(() =>
  props.testNames.map((name) => ({ name }))
);
</script>
