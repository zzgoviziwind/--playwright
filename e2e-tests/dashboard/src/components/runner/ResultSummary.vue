<template>
  <div class="result-summary">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-statistic title="执行状态">
          <template #default>
            <el-tag :type="exitCode === 0 ? 'success' : 'danger'" size="large" effect="dark">
              {{ exitCode === 0 ? '通过' : '失败' }}
            </el-tag>
          </template>
        </el-statistic>
      </el-col>
      <el-col :span="8">
        <el-statistic title="退出码" :value="exitCode" />
      </el-col>
      <el-col :span="8">
        <el-statistic title="日志行数" :value="logCount" />
      </el-col>
    </el-row>
    <div style="margin-top: 16px">
      <el-button type="primary" size="small" @click="openReport">
        <el-icon><View /></el-icon> 查看 HTML 报告
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ exitCode: number; logCount: number }>();

function openReport() {
  window.open('/report/index.html', '_blank');
}
</script>

<style scoped>
.result-summary {
  padding: 8px 0;
}
</style>
