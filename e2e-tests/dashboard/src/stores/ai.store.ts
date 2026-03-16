import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  PipelineStep,
  StepId,
  StepStatus,
  ConfirmRequest,
  DebugLogEntry,
  SessionStatus,
} from '../types/interactive.types';
import type { AgentId, AgentNode, AgentStatus, AgentPipelineState } from '../types/agent.types';

export const useAiStore = defineStore('ai', () => {
  // ==================== 原有状态（保持不变） ====================
  const isGenerating = ref(false);
  const taskId = ref<string | null>(null);
  const progressLogs = ref<string[]>([]);
  const previewCode = ref('');

  // ==================== 交互模式新增状态 ====================
  const isInteractive = ref(false);
  const sessionId = ref<string | null>(null);
  const sessionStatus = ref<SessionStatus | null>(null);
  const pipelineSteps = ref<PipelineStep[]>([]);
  const currentStepId = ref<StepId | null>(null);
  const activeModal = ref<StepId | 'error' | null>(null);
  const pendingConfirm = ref<ConfirmRequest | null>(null);
  const debugLogs = ref<DebugLogEntry[]>([]);

  // ==================== Agent 流水线状态 ====================
  const agentPipeline = ref<AgentPipelineState>({
    agents: [
      {
        id: 'test-planner',
        name: '测试规划师',
        description: '分析需求，生成测试计划和场景',
        status: 'idle',
        icon: 'Document',
        progress: 0,
      },
      {
        id: 'test-generator',
        name: '代码生成师',
        description: '根据测试计划生成 Playwright 测试代码',
        status: 'idle',
        icon: 'MagicStick',
        progress: 0,
      },
      {
        id: 'test-executor',
        name: '测试执行师',
        description: '执行测试用例并收集结果',
        status: 'idle',
        icon: 'VideoPlay',
        progress: 0,
      },
      {
        id: 'failure-analysis',
        name: '失败分析师',
        description: '分析失败原因并提供修复建议',
        status: 'idle',
        icon: 'Search',
        progress: 0,
      },
      {
        id: 'self-healing',
        name: '自愈工程师',
        description: '自动修复测试代码并重新执行',
        status: 'idle',
        icon: 'RefreshRight',
        progress: 0,
      },
    ],
    currentAgent: null,
    overallProgress: 0,
    overallStatus: 'idle',
  });

  // ==================== 计算属性 ====================
  const currentStep = computed(() => {
    if (!currentStepId.value) return null;
    return pipelineSteps.value.find((s) => s.id === currentStepId.value) || null;
  });

  // ==================== 原有方法（保持不变） ====================
  function setGenerating(val: boolean, id?: string) {
    isGenerating.value = val;
    taskId.value = id || null;
    if (val) {
      progressLogs.value = [];
      previewCode.value = '';
    }
  }

  function appendLog(message: string) {
    progressLogs.value.push(message);
    if (progressLogs.value.length > 500) {
      progressLogs.value = progressLogs.value.slice(-400);
    }
  }

  function setPreviewCode(code: string) {
    previewCode.value = code;
  }

  // ==================== 交互模式方法 ====================
  function setInteractive(val: boolean) {
    isInteractive.value = val;
  }

  function setSessionId(id: string | null) {
    sessionId.value = id;
  }

  function setSessionStatus(status: SessionStatus | null) {
    sessionStatus.value = status;
  }

  function setPipelineSteps(steps: PipelineStep[]) {
    pipelineSteps.value = steps;
  }

  function updateStepStatus(
    stepId: StepId,
    status: StepStatus,
    data?: any,
    duration?: number,
  ) {
    const step = pipelineSteps.value.find((s) => s.id === stepId);
    if (step) {
      step.status = status;
      if (data !== undefined) step.data = data;
      if (duration !== undefined) step.duration = duration;
      if (status === 'running') step.startedAt = Date.now();
      if (status === 'completed' || status === 'failed') {
        step.completedAt = Date.now();
      }
    }
  }

  function setCurrentStepId(id: StepId | null) {
    currentStepId.value = id;
  }

  function setActiveModal(modal: StepId | 'error' | null) {
    activeModal.value = modal;
  }

  function setPendingConfirm(confirm: ConfirmRequest | null) {
    pendingConfirm.value = confirm;
  }

  function addDebugLog(entry: DebugLogEntry) {
    debugLogs.value.push(entry);
    if (debugLogs.value.length > 1000) {
      debugLogs.value = debugLogs.value.slice(-800);
    }
  }

  function getStepById(id: StepId): PipelineStep | undefined {
    return pipelineSteps.value.find((s) => s.id === id);
  }

  function reset() {
    isGenerating.value = false;
    taskId.value = null;
    progressLogs.value = [];
    previewCode.value = '';
    // 重置交互状态
    sessionId.value = null;
    sessionStatus.value = null;
    pipelineSteps.value = [];
    currentStepId.value = null;
    activeModal.value = null;
    pendingConfirm.value = null;
    debugLogs.value = [];
  }

  // ==================== Agent 流水线方法 ====================
  function updateAgentStatus(
    agentId: AgentId,
    status: AgentStatus,
    result?: any,
    duration?: number,
    error?: string,
  ) {
    const agent = agentPipeline.value.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.status = status;
      if (result !== undefined) agent.result = result;
      if (duration !== undefined) agent.duration = duration;
      if (error !== undefined) agent.error = error;
      updateOverallProgress();
    }
  }

  function setCurrentAgent(agentId: AgentId | null) {
    agentPipeline.value.currentAgent = agentId;
  }

  function setAgentProgress(agentId: AgentId, progress: number) {
    const agent = agentPipeline.value.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.progress = progress;
      updateOverallProgress();
    }
  }

  function setPipelineOverallStatus(status: AgentStatus) {
    agentPipeline.value.overallStatus = status;
  }

  function setPipelineOverallProgress(progress: number) {
    agentPipeline.value.overallProgress = progress;
  }

  function updateOverallProgress() {
    const agents = agentPipeline.value.agents;
    const completed = agents.filter((a) => a.status === 'completed').length;
    const running = agents.find((a) => a.status === 'running');
    const baseProgress = (completed / agents.length) * 100;
    const runningProgress = running ? (running.progress || 0) / agents.length : 0;
    agentPipeline.value.overallProgress = baseProgress + runningProgress;
  }

  function resetAgentPipeline() {
    agentPipeline.value = {
      agents: [
        {
          id: 'test-planner',
          name: '测试规划师',
          description: '分析需求，生成测试计划和场景',
          status: 'idle',
          icon: 'Document',
          progress: 0,
        },
        {
          id: 'test-generator',
          name: '代码生成师',
          description: '根据测试计划生成 Playwright 测试代码',
          status: 'idle',
          icon: 'MagicStick',
          progress: 0,
        },
        {
          id: 'test-executor',
          name: '测试执行师',
          description: '执行测试用例并收集结果',
          status: 'idle',
          icon: 'VideoPlay',
          progress: 0,
        },
        {
          id: 'failure-analysis',
          name: '失败分析师',
          description: '分析失败原因并提供修复建议',
          status: 'idle',
          icon: 'Search',
          progress: 0,
        },
        {
          id: 'self-healing',
          name: '自愈工程师',
          description: '自动修复测试代码并重新执行',
          status: 'idle',
          icon: 'RefreshRight',
          progress: 0,
        },
      ],
      currentAgent: null,
      overallProgress: 0,
      overallStatus: 'idle',
    };
  }

  return {
    // 原有
    isGenerating, taskId, progressLogs, previewCode,
    setGenerating, appendLog, setPreviewCode,
    // 交互模式
    isInteractive, sessionId, sessionStatus, pipelineSteps,
    currentStepId, currentStep, activeModal, pendingConfirm, debugLogs,
    setInteractive, setSessionId, setSessionStatus, setPipelineSteps,
    updateStepStatus, setCurrentStepId, setActiveModal,
    setPendingConfirm, addDebugLog, getStepById,
    // Agent 流水线
    agentPipeline,
    updateAgentStatus, setCurrentAgent, setAgentProgress,
    setPipelineOverallStatus, setPipelineOverallProgress, resetAgentPipeline,
    // 通用
    reset,
  };
});
