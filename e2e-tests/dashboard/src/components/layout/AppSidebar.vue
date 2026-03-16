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
        <el-menu-item index="/recorder">
          <el-icon><VideoCamera /></el-icon>
          <span>测试录制</span>
        </el-menu-item>
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

    <!-- Agent 状态指示器 -->
    <div class="sidebar-agent-status">
      <div class="agent-status-title">Agent 状态</div>
      <div class="agent-status-list">
        <div
          v-for="agent in agentPipeline.agents"
          :key="agent.id"
          :class="['agent-status-item', `status-${agent.status}`]"
          :title="agent.name"
        >
          <el-icon :size="16">
            <component :is="getAgentIcon(agent.id)" />
          </el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAiStore } from '../../stores/ai.store';
import {
  Document,
  MagicStick,
  VideoPlay,
  Search,
  RefreshRight,
  VideoCamera,
  Edit,
} from '@element-plus/icons-vue';
import type { AgentId } from '../../types/agent.types';

const route = useRoute();
const aiStore = useAiStore();
const agentPipeline = computed(() => aiStore.agentPipeline);

const currentPath = computed(() => route.path);

function getAgentIcon(agentId: AgentId): any {
  const icons: Record<AgentId, any> = {
    'test-planner': Document,
    'test-generator': MagicStick,
    'test-executor': VideoPlay,
    'failure-analysis': Search,
    'self-healing': RefreshRight,
  };
  return icons[agentId];
}
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
  flex: 1;
}

/* Agent 状态区域 */
.sidebar-agent-status {
  padding: 12px;
  border-top: 1px solid #333;
  background: rgba(0, 0, 0, 0.2);
}

.agent-status-title {
  color: #8b9bb4;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.agent-status-list {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.agent-status-item {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: #8b9bb4;
  transition: all 0.2s ease;
}

.agent-status-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.agent-status-item.status-running {
  background: rgba(64, 158, 255, 0.3);
  color: #409EFF;
  animation: pulse 1.5s ease-in-out infinite;
}

.agent-status-item.status-completed {
  background: rgba(103, 194, 58, 0.3);
  color: #67C23A;
}

.agent-status-item.status-failed {
  background: rgba(245, 108, 108, 0.3);
  color: #F56C6C;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
