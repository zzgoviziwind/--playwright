<template>
  <div class="element-detail-tabs">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 表单 Tab -->
      <el-tab-pane :label="`表单 (${analysis.forms.length})`" name="forms">
        <div v-if="analysis.forms.length === 0" class="empty-tip">未发现表单元素</div>
        <div v-for="(form, fi) in analysis.forms" :key="fi" class="form-block">
          <div class="form-header">表单 {{ fi + 1 }} <el-tag size="small" type="info">{{ form.fields.length }} 个字段</el-tag></div>
          <el-table :data="form.fields" size="small" stripe border>
            <el-table-column prop="label" label="标签" width="120" />
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="name" label="Name" width="120" />
            <el-table-column prop="placeholder" label="占位符" />
            <el-table-column prop="selector" label="选择器" />
            <el-table-column label="必填" width="60">
              <template #default="{ row }">
                <el-tag v-if="row.required" size="small" type="danger">是</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="form.submitButton" class="submit-info">
            提交按钮: "{{ form.submitButton.text }}" — <code>{{ form.submitButton.selector }}</code>
          </div>
        </div>
      </el-tab-pane>

      <!-- 按钮 Tab -->
      <el-tab-pane :label="`按钮 (${analysis.buttons.length})`" name="buttons">
        <div v-if="analysis.buttons.length === 0" class="empty-tip">未发现按钮元素</div>
        <el-table v-else :data="analysis.buttons" size="small" stripe border>
          <el-table-column prop="text" label="文本" width="200" />
          <el-table-column prop="type" label="类型" width="100" />
          <el-table-column prop="selector" label="选择器" />
        </el-table>
      </el-tab-pane>

      <!-- 导航 Tab -->
      <el-tab-pane :label="`导航 (${analysis.navigation.length})`" name="nav">
        <div v-if="analysis.navigation.length === 0" class="empty-tip">未发现导航链接</div>
        <el-table v-else :data="analysis.navigation" size="small" stripe border>
          <el-table-column prop="text" label="文本" width="200" />
          <el-table-column prop="href" label="链接" />
          <el-table-column prop="selector" label="选择器" width="250" />
        </el-table>
      </el-tab-pane>

      <!-- 表格 Tab -->
      <el-tab-pane :label="`表格 (${analysis.tables.length})`" name="tables">
        <div v-if="analysis.tables.length === 0" class="empty-tip">未发现表格元素</div>
        <div v-for="(table, ti) in analysis.tables" :key="ti" class="table-block">
          <div class="table-header">
            表格 {{ ti + 1 }}
            <el-tag size="small">{{ table.rowCount }} 行</el-tag>
          </div>
          <div class="table-meta">
            <span>选择器: <code>{{ table.selector }}</code></span>
          </div>
          <div v-if="table.headers.length > 0" class="table-headers">
            表头:
            <el-tag v-for="h in table.headers" :key="h" size="small" type="info" style="margin: 2px">{{ h }}</el-tag>
          </div>
        </div>
      </el-tab-pane>

      <!-- 输入框 Tab -->
      <el-tab-pane :label="`输入框 (${analysis.inputs.length})`" name="inputs">
        <div v-if="analysis.inputs.length === 0" class="empty-tip">未发现独立输入框</div>
        <el-table v-else :data="analysis.inputs" size="small" stripe border>
          <el-table-column prop="label" label="标签" width="150" />
          <el-table-column prop="type" label="类型" width="100" />
          <el-table-column prop="placeholder" label="占位符" />
          <el-table-column prop="selector" label="选择器" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PageAnalysis } from '../../types/analyzer.types';

defineProps<{ analysis: PageAnalysis }>();

const activeTab = ref('forms');
</script>

<style scoped>
.empty-tip {
  color: #909399;
  text-align: center;
  padding: 20px;
}
.form-block, .table-block {
  margin-bottom: 16px;
}
.form-header, .table-header {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.submit-info {
  margin-top: 8px;
  color: #606266;
  font-size: 13px;
}
.table-meta {
  color: #606266;
  font-size: 13px;
  margin-bottom: 4px;
}
.table-headers {
  margin-top: 4px;
}
code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
