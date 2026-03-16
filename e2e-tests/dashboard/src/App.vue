<template>
  <el-container class="app-container">
    <el-aside width="200px" class="app-aside">
      <AppSidebar />
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <AppHeader />
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import AppSidebar from './components/layout/AppSidebar.vue';
import AppHeader from './components/layout/AppHeader.vue';
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
.app-container {
  height: 100vh;
}
.app-aside {
  background: #1d1e1f;
  overflow-y: auto;
}
.app-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 56px;
}
.app-main {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}
</style>
