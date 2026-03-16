// AI 桥接服务 — 支持自动模式和交互式分步模式

import { socketManager } from '../ws/socket-manager';
import { sessionManager } from './session-manager';
import type { StepConfirmAction, PipelineSession, DebugLogEntry } from '../../../ai/pipeline-types';

// 动态 import 以确保 .env 已加载
async function loadAiModules() {
  const smartGen = await import('../../../ai/smart-generator');
  const contextCollector = await import('../../../ai/context-collector');
  return { smartGen, contextCollector };
}

let isGenerating = false;

/** 劫持 console.log 转发到 WebSocket（仅自动模式使用） */
function interceptConsoleLog(taskId: string): () => void {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');

    // 根据标签推断 stage
    let stage = 'generating';
    if (message.includes('[扫描]')) stage = 'scanning';
    else if (message.includes('[校验]')) stage = 'validating';
    else if (message.includes('[完成]') || message.includes('[备份]')) stage = 'writing';

    socketManager.broadcast('ai', {
      type: 'ai:progress',
      taskId,
      stage,
      message,
    });
  };
  return () => {
    console.log = originalLog;
  };
}

export class AiService {
  constructor(private _projectRoot: string) {
    // 注册 WebSocket 消息处理器（客户端→服务端）
    socketManager.onMessage('ai:confirm-step', (data) => {
      try {
        const action: StepConfirmAction = {
          action: data.action || 'continue',
          editedData: data.editedData,
        };
        sessionManager.confirmStep(data.sessionId, action);
      } catch (err) {
        console.error('[AI] 确认步骤失败:', (err as Error).message);
      }
    });

    socketManager.onMessage('ai:abort-session', (data) => {
      try {
        sessionManager.abortSession(data.sessionId);
      } catch (err) {
        console.error('[AI] 中止会话失败:', (err as Error).message);
      }
    });
  }

  /** 是否正在生成（自动模式或交互模式） */
  isRunning(): boolean {
    return isGenerating || sessionManager.hasActiveSession();
  }

  /** 获取项目上下文摘要 */
  async getContext() {
    const { contextCollector } = await loadAiModules();
    return contextCollector.collectFullContext();
  }

  // ==================== 交互式模式 ====================

  /** 以交互式模式生成测试 */
  generateInteractive(params: {
    feature: string;
    type: 'smoke' | 'regression';
    output?: string;
    dryRun?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): string {
    if (this.isRunning()) throw new Error('已有 AI 任务正在运行');
    return sessionManager.createSession('generate', params, true);
  }

  /** 以交互式模式修改测试 */
  modifyInteractive(params: { file: string; change: string }): string {
    if (this.isRunning()) throw new Error('已有 AI 任务正在运行');
    return sessionManager.createSession('modify', params, true);
  }

  /** 以交互式模式扩展测试 */
  extendInteractive(params: { file: string; add: string }): string {
    if (this.isRunning()) throw new Error('已有 AI 任务正在运行');
    return sessionManager.createSession('extend', params, true);
  }

  /** 确认步骤 */
  confirmStep(sessionId: string, action: StepConfirmAction): void {
    sessionManager.confirmStep(sessionId, action);
  }

  /** 中止会话 */
  abortSession(sessionId: string): void {
    sessionManager.abortSession(sessionId);
  }

  /** 获取会话状态 */
  getSession(sessionId: string): PipelineSession | undefined {
    return sessionManager.getSession(sessionId);
  }

  /** 获取会话调试日志 */
  getSessionLogs(sessionId: string): DebugLogEntry[] {
    return sessionManager.getSessionLogs(sessionId);
  }

  // ==================== 自动模式（保持原有逻辑不变） ====================

  /** 生成测试（自动模式，通过 WS 推送进度） */
  async generate(params: {
    feature: string;
    type: 'smoke' | 'regression';
    output?: string;
    dryRun?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    if (this.isRunning()) throw new Error('已有 AI 任务正在运行');
    isGenerating = true;
    const taskId = `ai-${Date.now()}`;
    const restore = interceptConsoleLog(taskId);

    try {
      const { smartGen } = await loadAiModules();
      const code = await smartGen.generate({
        feature: params.feature,
        type: params.type,
        output: params.output,
        dryRun: params.dryRun || false,
      });

      socketManager.broadcast('ai', {
        type: 'ai:complete',
        taskId,
        code,
        warnings: [],
      });

      return code;
    } catch (err) {
      socketManager.broadcast('ai', {
        type: 'ai:error',
        taskId,
        error: (err as Error).message,
      });
      throw err;
    } finally {
      restore();
      isGenerating = false;
    }
  }

  /** 修改测试（自动模式） */
  async modify(params: { file: string; change: string }): Promise<string> {
    if (this.isRunning()) throw new Error('已有 AI 任务正在运行');
    isGenerating = true;
    const taskId = `ai-${Date.now()}`;
    const restore = interceptConsoleLog(taskId);

    try {
      const { smartGen } = await loadAiModules();
      const code = await smartGen.modify({
        file: params.file,
        change: params.change,
      });

      socketManager.broadcast('ai', {
        type: 'ai:complete',
        taskId,
        code,
        warnings: [],
      });

      return code;
    } catch (err) {
      socketManager.broadcast('ai', {
        type: 'ai:error',
        taskId,
        error: (err as Error).message,
      });
      throw err;
    } finally {
      restore();
      isGenerating = false;
    }
  }

  /** 扩展测试（自动模式） */
  async extend(params: { file: string; add: string }): Promise<string> {
    if (this.isRunning()) throw new Error('已有 AI 任务正在运行');
    isGenerating = true;
    const taskId = `ai-${Date.now()}`;
    const restore = interceptConsoleLog(taskId);

    try {
      const { smartGen } = await loadAiModules();
      const code = await smartGen.extend({
        file: params.file,
        add: params.add,
      });

      socketManager.broadcast('ai', {
        type: 'ai:complete',
        taskId,
        code,
        warnings: [],
      });

      return code;
    } catch (err) {
      socketManager.broadcast('ai', {
        type: 'ai:error',
        taskId,
        error: (err as Error).message,
      });
      throw err;
    } finally {
      restore();
      isGenerating = false;
    }
  }
}
