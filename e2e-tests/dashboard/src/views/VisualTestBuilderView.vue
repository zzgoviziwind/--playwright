<template>
  <div class="visual-builder">
    <el-row :gutter="16">
      <!-- 左栏: 步骤工具箱 -->
      <el-col :span="6">
        <StepToolbox @add-step="handleAddStep" />
      </el-col>

      <!-- 中栏: 步骤列表 -->
      <el-col :span="10">
        <StepList
          :steps="builderStore.steps"
          @remove="builderStore.removeStep"
          @move="builderStore.moveStep"
          @update="builderStore.updateStep"
          @clear="builderStore.reset"
        />
      </el-col>

      <!-- 右栏: 配置 + 代码预览 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <span>测试配置</span>
          </template>
          <el-form label-position="top" size="default">
            <el-form-item label="测试名称" required>
              <el-input
                v-model="builderStore.testName"
                placeholder="如：用户登录功能验证"
              />
            </el-form-item>
            <el-form-item label="测试描述">
              <el-input
                v-model="builderStore.testDescription"
                type="textarea"
                :rows="2"
                placeholder="测试目的和范围描述"
              />
            </el-form-item>
            <el-form-item label="测试分类">
              <el-radio-group v-model="builderStore.category">
                <el-radio value="smoke">冒烟测试</el-radio>
                <el-radio value="regression">回归测试</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="输出文件名">
              <el-input v-model="outputFileName" placeholder="留空自动生成" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 代码预览 -->
        <el-card shadow="never" style="margin-top: 16px">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>代码预览</span>
              <el-button
                type="success"
                size="small"
                :disabled="!builderStore.generatedCode || !builderStore.testName"
                :loading="saving"
                @click="handleSave"
              >
                保存为 .spec.ts
              </el-button>
            </div>
          </template>
          <div v-if="builderStore.generatedCode" class="code-preview">
            <pre><code>{{ builderStore.generatedCode }}</code></pre>
          </div>
          <div v-else class="empty-code">
            <el-empty description="添加测试步骤后自动生成代码" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../composables/useApi';
import { useVisualBuilderStore } from '../stores/visual-builder.store';
import StepToolbox from '../components/visual/StepToolbox.vue';
import StepList from '../components/visual/StepList.vue';
import type { StepTypeInfo } from '../types/analyzer.types';

const api = useApi();
const builderStore = useVisualBuilderStore();
const outputFileName = ref('');
const saving = ref(false);

function handleAddStep(stepInfo: StepTypeInfo) {
  builderStore.addStep({
    type: stepInfo.type,
    selector: '',
    value: '',
    description: '',
  });
}

function generateFileName(): string {
  if (outputFileName.value) return outputFileName.value;
  const name = builderStore.testName
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safeName = name || `visual-${Date.now()}`;
  return `${safeName}-visual.spec.ts`;
}

async function handleSave() {
  if (!builderStore.testName) {
    return ElMessage.warning('请输入测试名称');
  }
  if (builderStore.steps.length === 0) {
    return ElMessage.warning('请至少添加一个测试步骤');
  }

  saving.value = true;
  try {
    const fileName = generateFileName();
    const dir = builderStore.category === 'smoke' ? 'tests/smoke' : 'tests/regression';
    const filePath = `${dir}/${fileName}`;

    await api.put(`/tests/files/${filePath}`, {
      content: builderStore.generatedCode,
    });

    ElMessage.success(`文件已保存: ${filePath}`);
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.visual-builder { height: 100%; }
.code-preview {
  max-height: 400px;
  overflow: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
}
.code-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.empty-code {
  padding: 20px 0;
}
</style>
