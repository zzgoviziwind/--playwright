<template>
  <div class="page-analysis-panel">
    <!-- 基本信息 -->
    <div class="analysis-header">
      <div class="info-row">
        <el-tag type="success">{{ analysis.title || '(无标题)' }}</el-tag>
        <el-tag type="info">加载耗时: {{ analysis.meta.loadTime }}ms</el-tag>
      </div>
      <div class="stats-row">
        <el-tag size="small">{{ analysis.forms.length }} 表单</el-tag>
        <el-tag size="small">{{ analysis.buttons.length }} 按钮</el-tag>
        <el-tag size="small">{{ analysis.navigation.length }} 导航</el-tag>
        <el-tag size="small">{{ analysis.tables.length }} 表格</el-tag>
        <el-tag size="small">{{ analysis.inputs.length }} 输入框</el-tag>
      </div>
    </div>

    <!-- 截图 -->
    <div v-if="screenshot" class="screenshot-section">
      <div class="section-title">页面截图</div>
      <el-image
        :src="`data:image/png;base64,${screenshot}`"
        :preview-src-list="[`data:image/png;base64,${screenshot}`]"
        fit="contain"
        class="screenshot-img"
      />
    </div>

    <!-- 元素详情 -->
    <div class="elements-section">
      <div class="section-title">交互元素详情</div>
      <ElementDetailTabs :analysis="analysis" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PageAnalysis } from '../../types/analyzer.types';
import ElementDetailTabs from './ElementDetailTabs.vue';

defineProps<{
  analysis: PageAnalysis;
  screenshot: string;
}>();
</script>

<style scoped>
.analysis-header {
  margin-bottom: 16px;
}
.info-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.stats-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.screenshot-section {
  margin-bottom: 16px;
}
.screenshot-img {
  max-height: 300px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}
.elements-section {
  margin-top: 12px;
}
</style>
