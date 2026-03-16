<template>
  <div class="sidebar">
    <div class="sidebar-logo">
      <el-icon :size="22"><Monitor /></el-icon>
      <span class="sidebar-title">E2E 测试平台</span>
    </div>
    <el-menu
      :default-active="currentPath"
      :router="true"
      background-color="#1d1e1f"
      text-color="#bfcbd9"
      active-text-color="#409eff"
    >
      <el-menu-item-group title="AI 智能">
        <el-menu-item index="/ai/generate">
          <el-icon><MagicStick /></el-icon>
          <span>AI 生成</span>
        </el-menu-item>
        <el-menu-item index="/ai/modify">
          <el-icon><EditPen /></el-icon>
          <span>AI 修改</span>
        </el-menu-item>
        <el-menu-item index="/ai/url-analyze">
          <el-icon><Link /></el-icon>
          <span>URL 智能分析</span>
        </el-menu-item>
      </el-menu-item-group>
      <el-menu-item-group title="测试管理">
        <el-menu-item index="/visual/builder">
          <el-icon><Edit /></el-icon>
          <span>可视化构建</span>
        </el-menu-item>
        <el-menu-item index="/tests">
          <el-icon><Document /></el-icon>
          <span>用例管理</span>
        </el-menu-item>
        <el-menu-item index="/tests/explorer">
          <el-icon><Search /></el-icon>
          <span>用例浏览器</span>
        </el-menu-item>
        <el-menu-item index="/runner">
          <el-icon><VideoPlay /></el-icon>
          <span>执行控制台</span>
        </el-menu-item>
      </el-menu-item-group>
      <el-menu-item-group title="系统">
        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <span>配置管理</span>
        </el-menu-item>
      </el-menu-item-group>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const currentPath = computed(() => route.path);
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid #333;
}
.sidebar-title {
  white-space: nowrap;
}
.el-menu {
  border-right: none;
}
</style>
