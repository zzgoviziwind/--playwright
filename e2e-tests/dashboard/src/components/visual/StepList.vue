<template>
  <div class="step-list">
    <el-card shadow="never">
      <template #header>
        <div class="list-header">
          <span>测试步骤 ({{ steps.length }})</span>
          <el-button size="small" text type="danger" @click="$emit('clear')" :disabled="steps.length === 0">
            清空
          </el-button>
        </div>
      </template>

      <div v-if="steps.length === 0" class="empty-tip">
        <el-empty description="从左侧工具箱添加测试步骤" :image-size="80" />
      </div>

      <div v-else class="steps-container">
        <div
          v-for="(step, index) in steps"
          :key="step.id"
          class="step-item"
          :class="{ disabled: !step.enabled, expanded: expandedId === step.id }"
        >
          <div class="step-header" @click="toggleExpand(step.id)">
            <div class="step-left">
              <span class="step-index">{{ index + 1 }}</span>
              <el-tag
                :type="getStepTagType(step.type)"
                size="small"
              >{{ getStepLabel(step.type) }}</el-tag>
              <span class="step-desc">{{ step.description || getDefaultDesc(step) }}</span>
            </div>
            <div class="step-actions">
              <el-button size="small" text :icon="ArrowUp" :disabled="index === 0" @click.stop="$emit('move', index, index - 1)" />
              <el-button size="small" text :icon="ArrowDown" :disabled="index === steps.length - 1" @click.stop="$emit('move', index, index + 1)" />
              <el-button size="small" text type="danger" :icon="Delete" @click.stop="$emit('remove', step.id)" />
            </div>
          </div>

          <!-- 展开编辑 -->
          <div v-if="expandedId === step.id" class="step-editor">
            <el-form label-width="80px" size="small">
              <el-form-item label="描述">
                <el-input
                  :model-value="step.description"
                  placeholder="步骤描述"
                  @update:model-value="(v: string) => $emit('update', step.id, { description: v })"
                />
              </el-form-item>
              <el-form-item v-if="needsSelector(step.type)" label="选择器">
                <el-input
                  :model-value="step.selector"
                  placeholder="CSS 选择器或 Playwright 选择器"
                  @update:model-value="(v: string) => $emit('update', step.id, { selector: v })"
                />
              </el-form-item>
              <el-form-item v-if="needsValue(step.type)" label="值">
                <el-input
                  :model-value="step.value"
                  :placeholder="getValuePlaceholder(step.type)"
                  @update:model-value="(v: string) => $emit('update', step.id, { value: v })"
                />
              </el-form-item>
              <el-form-item label="启用">
                <el-switch
                  :model-value="step.enabled"
                  @update:model-value="(v: boolean) => $emit('update', step.id, { enabled: v })"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue';
import { STEP_TYPES } from '../../types/analyzer.types';
import type { TestStep } from '../../types/analyzer.types';

defineProps<{ steps: TestStep[] }>();
defineEmits<{
  remove: [id: string];
  move: [from: number, to: number];
  update: [id: string, updates: Partial<TestStep>];
  clear: [];
}>();

const expandedId = ref<string | null>(null);

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function getStepLabel(type: string): string {
  return STEP_TYPES.find((s) => s.type === type)?.label || type;
}

function getStepTagType(type: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const info = STEP_TYPES.find((s) => s.type === type);
  if (!info) return 'info';
  if (info.group === 'navigation') return 'info';
  if (info.group === 'interaction') return '';
  if (info.group === 'assertion') return 'success';
  return 'info';
}

function needsSelector(type: string): boolean {
  return STEP_TYPES.find((s) => s.type === type)?.needsSelector ?? false;
}

function needsValue(type: string): boolean {
  return STEP_TYPES.find((s) => s.type === type)?.needsValue ?? false;
}

function getValuePlaceholder(type: string): string {
  return STEP_TYPES.find((s) => s.type === type)?.valuePlaceholder || '';
}

function getDefaultDesc(step: TestStep): string {
  if (step.value && !step.selector) return step.value;
  if (step.selector && !step.value) return step.selector;
  if (step.selector && step.value) return `${step.selector} = ${step.value}`;
  return '(点击展开配置)';
}
</script>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.empty-tip {
  padding: 20px 0;
}
.steps-container {
  max-height: 500px;
  overflow-y: auto;
}
.step-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}
.step-item:hover {
  border-color: #409eff;
}
.step-item.disabled {
  opacity: 0.5;
}
.step-item.expanded {
  border-color: #409eff;
}
.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
}
.step-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.step-index {
  color: #909399;
  font-size: 12px;
  font-weight: 600;
  min-width: 18px;
}
.step-desc {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.step-actions {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}
.step-editor {
  padding: 8px 12px 4px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
</style>
