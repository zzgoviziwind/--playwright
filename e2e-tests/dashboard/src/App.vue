<template>
  <el-container class="app-container" :class="{ 'dark-theme': isDarkTheme }">
    <el-aside width="200px" class="app-aside">
      <AppSidebar />
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <AppHeader />
        <el-button class="theme-toggle" @click="toggleTheme" link>
          <el-icon :size="20">
            <component :is="isDarkTheme ? 'Sunny' : 'Moon'" />
          </el-icon>
        </el-button>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import AppHeader from './components/layout/AppHeader.vue';
import { Sunny, Moon } from '@element-plus/icons-vue';

const isDarkTheme = ref(false);

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value;
  if (isDarkTheme.value) {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
}
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 浅色主题（默认） */
:root {
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --text-primary: #303133;
  --text-secondary: #606266;
  --border-color: #e4e7ed;
  --aside-bg: #1d1e1f;
  --aside-text: #bfcbd9;
}

/* 深色主题 */
:root.dark-theme {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --border-color: #2d3748;
  --aside-bg: #0f0f1a;
  --aside-text: #a0aec0;
}
</style>

<style scoped>
.app-container {
  height: 100vh;
  transition: background 0.3s ease;
}

.app-aside {
  background: var(--aside-bg);
  overflow-y: auto;
}

.app-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 56px;
  transition: all 0.3s ease;
}

.app-main {
  background: var(--bg-primary);
  padding: 20px;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.theme-toggle {
  margin-left: auto;
  color: var(--text-primary);
}

.theme-toggle:hover {
  color: #409EFF;
}

/* 深色主题全局样式 */
:global(.dark-theme .el-card) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

:global(.dark-theme .el-card__header) {
  border-bottom-color: var(--border-color);
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark-theme .el-form-item__label) {
  color: var(--text-primary);
}

:global(.dark-theme .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 1px var(--border-color) inset;
}

:global(.dark-theme .el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 1px var(--border-color) inset;
}

:global(.dark-theme .el-select-dropdown__item) {
  color: var(--text-primary);
}

:global(.dark-theme .el-select-dropdown__item.hover) {
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark-theme .el-popper) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

:global(.dark-theme .el-divider) {
  background-color: var(--border-color);
}
</style>
