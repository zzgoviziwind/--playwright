// 交互式 AI 会话 composable

import { useWebSocket } from './useWebSocket';
import { useAiStore } from '../stores/ai.store';
import type { StepId, DebugLogEntry } from '../types/interactive.types';

export function useInteractiveSession() {
  const { onEvent, sendEvent } = useWebSocket();
  const aiStore = useAiStore();

  // ==================== 事件监听 ====================

  onEvent('ai:session-created', (data) => {
    aiStore.setSessionId(data.sessionId);
    aiStore.setPipelineSteps(data.steps.map((s: any) => ({
      id: s.id,
      name: s.name,
      status: s.status || 'pending',
    })));
  });

  onEvent('ai:step-start', (data) => {
    aiStore.updateStepStatus(data.stepId, 'running');
    aiStore.setCurrentStepId(data.stepId);
  });

  onEvent('ai:step-completed', (data) => {
    aiStore.updateStepStatus(data.stepId, 'completed', data.data, data.duration);
  });

  onEvent('ai:step-confirm-required', (data) => {
    aiStore.updateStepStatus(data.stepId, 'wait-confirm', data.data);
    aiStore.setPendingConfirm({
      sessionId: data.sessionId,
      stepId: data.stepId,
      stepName: data.stepName,
      data: data.data,
      confirmOptions: data.confirmOptions || ['continue', 'edit', 'retry', 'abort'],
    });
    aiStore.setActiveModal(data.stepId);
  });

  onEvent('ai:step-error', (data) => {
    aiStore.updateStepStatus(data.stepId, 'failed');
    aiStore.setPendingConfirm({
      sessionId: data.sessionId,
      stepId: data.stepId,
      stepName: data.stepName,
      data: { error: data.error, retryable: data.retryable },
      confirmOptions: ['retry', 'abort'],
    });
    aiStore.setActiveModal('error');
  });

  onEvent('ai:debug-log', (data) => {
    aiStore.addDebugLog(data.log as DebugLogEntry);
  });

  onEvent('ai:session-completed', (data) => {
    aiStore.setGenerating(false);
    if (data.result?.code) {
      aiStore.setPreviewCode(data.result.code);
    }
    aiStore.setActiveModal(null);
    aiStore.setPendingConfirm(null);
    aiStore.setSessionStatus('completed');
  });

  onEvent('ai:session-aborted', () => {
    aiStore.setGenerating(false);
    aiStore.setActiveModal(null);
    aiStore.setPendingConfirm(null);
    aiStore.setSessionStatus('aborted');
  });

  onEvent('ai:session-error', (data) => {
    aiStore.setGenerating(false);
    aiStore.setSessionStatus('error');
  });

  // ==================== 发送动作 ====================

  function confirmStep(stepId: StepId, editedData?: Record<string, any>) {
    sendEvent('ai:confirm-step', {
      sessionId: aiStore.sessionId,
      action: editedData ? 'edit' : 'continue',
      editedData,
    });
    aiStore.setActiveModal(null);
    aiStore.setPendingConfirm(null);
  }

  function retryStep(stepId: StepId) {
    sendEvent('ai:confirm-step', {
      sessionId: aiStore.sessionId,
      action: 'retry',
    });
    aiStore.setActiveModal(null);
    aiStore.setPendingConfirm(null);
  }

  function abortSession() {
    sendEvent('ai:abort-session', {
      sessionId: aiStore.sessionId,
    });
    aiStore.setActiveModal(null);
    aiStore.setPendingConfirm(null);
  }

  return {
    confirmStep,
    retryStep,
    abortSession,
  };
}
