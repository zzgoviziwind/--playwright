<template>
  <el-form :model="form" label-position="top">
    <el-form-item label="功能描述">
      <el-input v-model="form.feature" type="textarea" :rows="2" />
    </el-form-item>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="Temperature">
          <el-slider v-model="form.temperature" :min="0" :max="1" :step="0.1" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="Max Tokens">
          <el-input-number v-model="form.maxTokens" :min="1024" :max="16384" :step="1024" size="small" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="测试类型">
          <el-radio-group v-model="form.type" size="small">
            <el-radio-button value="smoke">冒烟</el-radio-button>
            <el-radio-button value="regression">回归</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const form = reactive({
  feature: '',
  type: 'smoke',
  temperature: 0.3,
  maxTokens: 8192,
});

defineExpose({ form });
</script>
