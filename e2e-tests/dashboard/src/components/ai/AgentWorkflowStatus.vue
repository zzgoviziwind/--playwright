<template>
  <div class="agent-workflow">
    <!-- 头部标题 -->
    <div class="workflow-header">
      <h3 class="workflow-title">
        <el-icon class="title-icon"><Connection /></el-icon>
        AI Agent 工作流
      </h3>
      <el-tag v-if="overallStatus" :type="getOverallStatusType(overallStatus)" size="small">
        {{ getOverallStatusText(overallStatus) }}
      </el-tag>
    </div>

    <!-- Agent 流程可视化 -->
    <div class="workflow-canvas">
      <!-- 连接线背景 -->
      <svg class="workflow-connectors" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#409EFF" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#67C23A" stop-opacity="0.3" />
          </linearGradient>
        </defs>
        <line x1="60" y1="50" x2="140" y2="50" class="connector-line" />
        <line x1="200" y1="50" x2="280" y2="50" class="connector-line" />
        <line x1="340" y1="50" x2="420" y2="50" class="connector-line" />
        <line x1="480" y1="50" x2="560" y2="50" class="connector-line" />

        <!-- 激活动画 -->
        <circle v-if="activeAgentIndex >= 0" :cx="getActiveLineCx()" cy="50" r="3" class="active-dot">
          <animate attributeName="cx" :from="getActiveLineFrom()" :to="getActiveLineTo()" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>

      <!-- Agent 节点 -->
      <div class="agents-row">
        <div
          v-for="(agent, index) in agents"
          :key="agent.id"
          :class="['agent-node', `status-${agent.status}`, { active: currentAgent === agent.id }]"
          @click="$emit('agentClick', agent)"
        >
          <!-- 状态指示器 -->
          <div class="status-indicator">
            <div v-if="agent.status === 'running'" class="running-ring">
              <svg viewBox="0 0 36 36" class="circular-progress">
                <path
                  class="progress-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="progress-bar"
                  :stroke-dasharray="`${agent.progress || 75}, 100`"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
            <div v-else-if="agent.status === 'completed'" class="success-mark">
              <el-icon :size="20"><Check /></el-icon>
            </div>
            <div v-else-if="agent.status === 'failed'" class="error-mark">
              <el-icon :size="20"><Close /></el-icon>
            </div>
          </div>

          <!-- 图标 -->
          <div :class="['agent-icon', `icon-${agent.id}`]">
            <el-icon :size="28">
              <component :is="getAgentIcon(agent.id)" />
            </el-icon>
          </div>

          <!-- 名称 -->
          <div class="agent-name">{{ agent.name }}</div>

          <!-- 进度条 -->
          <div v-if="agent.status === 'running' && agent.progress" class="agent-progress">
            <el-progress :percentage="agent.progress" :stroke-width="2" :show-text="false" status="success" />
          </div>

          <!-- 耗时 -->
          <div v-if="agent.duration" class="agent-duration">
            {{ formatDuration(agent.duration) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 当前 Agent 详情 -->
    <div v-if="currentAgentNode" class="current-agent-detail">
      <div class="detail-header">
        <el-icon :size="18"><component :is="getAgentIcon(currentAgentNode.id)" /></el-icon>
        <span>{{ currentAgentNode.name }}</span>
      </div>
      <p class="detail-description">{{ currentAgentNode.description }}</p>
      <div v-if="currentAgentNode.error" class="detail-error">
        <el-icon><Warning /></el-icon>
        <span>{{ currentAgentNode.error }}</span>
      </div>
    </div>

    <!-- 整体进度 -->
    <div class="overall-progress">
      <div class="progress-label">
        <span>整体进度</span>
        <span class="progress-percent">{{ Math.round(overallProgress) }}%</span>
      </div>
      <el-progress
        :percentage="Math.round(overallProgress)"
        :stroke-width="4"
        :show-text="false"
        :status="overallProgress >= 100 ? 'success' : undefined"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Connection,
  Document,
  VideoPlay,
  Warning,
  Check,
  Close,
  Timer,
  MagicStick,
  Search,
  RefreshRight,
} from '@element-plus/icons-vue';
import type { AgentId, AgentNode, AgentStatus } from '../../types/agent.types';

const props = defineProps<{
  agents: AgentNode[];
  currentAgent: AgentId | null;
  overallProgress: number;
  overallStatus?: AgentStatus;
}>();

const emit = defineEmits<{
  (e: 'agentClick', agent: AgentNode): void;
}>();

const currentAgentNode = computed(() => {
  if (!props.currentAgent) return null;
  return props.agents.find((a) => a.id === props.currentAgent) || null;
});

const activeAgentIndex = computed(() => {
  if (!props.currentAgent) return -1;
  return props.agents.findIndex((a) => a.id === props.currentAgent);
});

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

function getActiveLineCx(): number {
  const positions = [100, 240, 380, 520];
  const idx = activeAgentIndex.value;
  if (idx < 0 || idx >= positions.length) return 100;
  return positions[idx];
}

function getActiveLineFrom(): string {
  const positions = ['60', '200', '340', '480'];
  const idx = activeAgentIndex.value;
  if (idx < 0 || idx >= positions.length) return '60';
  return positions[idx];
}

function getActiveLineTo(): string {
  const positions = ['140', '280', '420', '560'];
  const idx = activeAgentIndex.value;
  if (idx < 0 || idx >= positions.length) return '140';
  return positions[idx];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getOverallStatusType(status: AgentStatus): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<AgentStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    idle: 'info',
    running: '',
    completed: 'success',
    failed: 'danger',
    skipped: 'info',
  };
  return map[status];
}

function getOverallStatusText(status: AgentStatus): string {
  const map: Record<AgentStatus, string> = {
    idle: '就绪',
    running: '执行中',
    completed: '完成',
    failed: '失败',
    skipped: '跳过',
  };
  return map[status];
}
</script>

<style scoped>
.agent-workflow {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.agent-workflow::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.workflow-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255,255,255,0.5)); }
  50% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.8)); }
}

.workflow-canvas {
  position: relative;
  padding: 20px 0;
}

.workflow-connectors {
  position: absolute;
  top: 30px;
  left: 0;
  width: 100%;
  height: 40px;
  pointer-events: none;
}

.connector-line {
  stroke: url(#lineGradient);
  stroke-width: 2;
  stroke-dasharray: 4 2;
  opacity: 0.6;
}

.active-dot {
  fill: #fff;
  filter: drop-shadow(0 0 6px rgba(255,255,255,0.8));
}

.agents-row {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.agent-node {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 4px;
}

.agent-node:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.agent-node.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

/* 状态样式 */
.agent-node.status-idle {
  opacity: 0.7;
}

.agent-node.status-running {
  border-color: #409EFF;
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
}

.agent-node.status-completed {
  border-color: #67C23A;
}

.agent-node.status-failed {
  border-color: #F56C6C;
}

.status-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
}

.running-ring {
  width: 100%;
  height: 100%;
}

.circular-progress {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 3;
}

.progress-bar {
  fill: none;
  stroke: #409EFF;
  stroke-width: 3;
  transition: stroke-dasharray 0.3s ease;
}

.success-mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #67C23A;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.4);
}

.error-mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #F56C6C;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.4);
}

.agent-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.agent-node:hover .agent-icon {
  background: rgba(255, 255, 255, 0.25);
}

.agent-node.active .agent-icon {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.agent-name {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

.agent-progress {
  width: 100%;
  margin-top: 8px;
}

.agent-progress :deep(.el-progress__bar) {
  background: rgba(255, 255, 255, 0.2);
}

.agent-duration {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.current-agent-detail {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  position: relative;
  z-index: 1;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.detail-description {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
}

.detail-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f56c6c;
  font-size: 12px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 4px;
}

.overall-progress {
  margin-top: 16px;
  position: relative;
  z-index: 1;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  opacity: 0.9;
}

.progress-percent {
  font-weight: 600;
}

.overall-progress :deep(.el-progress__bar) {
  background: rgba(255, 255, 255, 0.2);
}
</style>
