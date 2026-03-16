<template>
  <div class="step-toolbox">
    <el-card shadow="never">
      <template #header>
        <span>操作工具箱</span>
      </template>
      <div class="tool-group">
        <div class="group-title">导航</div>
        <el-button
          v-for="step in navigationSteps"
          :key="step.type"
          size="small"
          @click="$emit('add-step', step)"
          style="width: 100%; margin-bottom: 6px; margin-left: 0"
        >
          {{ step.label }}
        </el-button>
      </div>
      <el-divider />
      <div class="tool-group">
        <div class="group-title">交互</div>
        <el-button
          v-for="step in interactionSteps"
          :key="step.type"
          size="small"
          type="primary"
          plain
          @click="$emit('add-step', step)"
          style="width: 100%; margin-bottom: 6px; margin-left: 0"
        >
          {{ step.label }}
        </el-button>
      </div>
      <el-divider />
      <div class="tool-group">
        <div class="group-title">断言</div>
        <el-button
          v-for="step in assertionSteps"
          :key="step.type"
          size="small"
          type="success"
          plain
          @click="$emit('add-step', step)"
          style="width: 100%; margin-bottom: 6px; margin-left: 0"
        >
          {{ step.label }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { STEP_TYPES } from '../../types/analyzer.types';
import type { StepTypeInfo } from '../../types/analyzer.types';

defineEmits<{ 'add-step': [step: StepTypeInfo] }>();

const navigationSteps = computed(() => STEP_TYPES.filter((s) => s.group === 'navigation'));
const interactionSteps = computed(() => STEP_TYPES.filter((s) => s.group === 'interaction'));
const assertionSteps = computed(() => STEP_TYPES.filter((s) => s.group === 'assertion'));
</script>

<style scoped>
.group-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
  font-weight: 600;
}
</style>
