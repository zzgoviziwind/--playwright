// 交互式 AI 管道会话管理器

import { socketManager } from '../ws/socket-manager';
import { SteppedPipeline } from '../../../ai/stepped-pipeline';
import type {
  PipelineSession,
  PipelineMode,
  PipelineParams,
  StepConfirmAction,
  PipelineStep,
  DebugLogEntry,
} from '../../../ai/pipeline-types';

interface SessionEntry {
  session: PipelineSession;
  pipeline: SteppedPipeline;
}

/** 会话过期时间：1 小时 */
const SESSION_EXPIRY_MS = 60 * 60 * 1000;

/** 清理间隔：10 分钟 */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

class SessionManager {
  private sessions = new Map<string, SessionEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), CLEANUP_INTERVAL_MS);
  }

  /** 创建交互式会话 */
  createSession(
    mode: PipelineMode,
    params: PipelineParams,
    stepByStep: boolean,
  ): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pipeline = new SteppedPipeline(mode, params);

    const session: PipelineSession = {
      sessionId,
      mode,
      stepByStep,
      status: 'running',
      currentStepIndex: 0,
      steps: pipeline.steps.map((s) => ({ ...s })),
      logs: [],
      createdAt: Date.now(),
    };

    const entry: SessionEntry = { session, pipeline };
    this.sessions.set(sessionId, entry);

    // 绑定 pipeline 事件 -> WebSocket 广播
    this.bindPipelineEvents(sessionId, pipeline, session);

    // 广播 session 创建
    socketManager.broadcast('ai', {
      type: 'ai:session-created',
      sessionId,
      steps: session.steps.map((s) => ({
        id: s.id, name: s.name, status: s.status,
      })),
    });

    // 启动管道（异步，不阻塞）
    pipeline.run(stepByStep)
      .then((result) => {
        session.status = 'completed';
        session.result = result;
        socketManager.broadcast('ai', {
          type: 'ai:session-completed',
          sessionId,
          result: {
            code: result,
            filePath: this.getLastStepFilePath(session),
            warnings: this.getLastStepWarnings(session),
          },
        });
      })
      .catch((err) => {
        if (err.name === 'PipelineAbortError') {
          session.status = 'aborted';
          socketManager.broadcast('ai', {
            type: 'ai:session-aborted',
            sessionId,
          });
        } else {
          session.status = 'error';
          socketManager.broadcast('ai', {
            type: 'ai:session-error',
            sessionId,
            error: (err as Error).message,
            failedStepId: session.steps.find((s) => s.status === 'failed')?.id || null,
          });
        }
      });

    return sessionId;
  }

  /** 确认步骤 */
  confirmStep(sessionId: string, action: StepConfirmAction): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`会话不存在: ${sessionId}`);
    entry.pipeline.confirm(action);
    entry.session.status = 'running';
  }

  /** 中止会话 */
  abortSession(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`会话不存在: ${sessionId}`);
    entry.pipeline.abort();
    entry.session.status = 'aborted';
  }

  /** 获取会话状态 */
  getSession(sessionId: string): PipelineSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  /** 获取会话调试日志 */
  getSessionLogs(sessionId: string): DebugLogEntry[] {
    const entry = this.sessions.get(sessionId);
    if (!entry) return [];
    return entry.pipeline.logger.getLogs();
  }

  /** 是否有活跃会话 */
  hasActiveSession(): boolean {
    for (const entry of this.sessions.values()) {
      if (entry.session.status === 'running' || entry.session.status === 'wait-confirm') {
        return true;
      }
    }
    return false;
  }

  /** 清理过期会话 */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.sessions.entries()) {
      if (now - entry.session.createdAt > SESSION_EXPIRY_MS) {
        if (entry.session.status === 'running' || entry.session.status === 'wait-confirm') {
          entry.pipeline.abort();
        }
        this.sessions.delete(id);
      }
    }
  }

  /** 绑定 pipeline 事件到 WebSocket 广播 */
  private bindPipelineEvents(
    sessionId: string,
    pipeline: SteppedPipeline,
    session: PipelineSession,
  ): void {
    pipeline.on('step-start', (step: PipelineStep) => {
      // 同步到 session
      const idx = session.steps.findIndex((s) => s.id === step.id);
      if (idx >= 0) {
        session.steps[idx] = { ...step };
        session.currentStepIndex = idx;
      }

      socketManager.broadcast('ai', {
        type: 'ai:step-start',
        sessionId,
        stepId: step.id,
        stepName: step.name,
      });
    });

    pipeline.on('step-completed', (step: PipelineStep, data: unknown) => {
      const idx = session.steps.findIndex((s) => s.id === step.id);
      if (idx >= 0) session.steps[idx] = { ...step };

      socketManager.broadcast('ai', {
        type: 'ai:step-completed',
        sessionId,
        stepId: step.id,
        data: this.truncateData(data),
        duration: step.duration,
      });
    });

    pipeline.on('step-confirm-required', (step: PipelineStep, data: unknown) => {
      const idx = session.steps.findIndex((s) => s.id === step.id);
      if (idx >= 0) session.steps[idx] = { ...step };
      session.status = 'wait-confirm';

      socketManager.broadcast('ai', {
        type: 'ai:step-confirm-required',
        sessionId,
        stepId: step.id,
        stepName: step.name,
        data,
        confirmOptions: ['continue', 'edit', 'retry', 'abort'],
      });
    });

    pipeline.on('step-error', (step: PipelineStep, error: Error) => {
      const idx = session.steps.findIndex((s) => s.id === step.id);
      if (idx >= 0) session.steps[idx] = { ...step };

      socketManager.broadcast('ai', {
        type: 'ai:step-error',
        sessionId,
        stepId: step.id,
        stepName: step.name,
        error: error.message,
        retryable: true,
      });
    });

    // 日志事件
    pipeline.logger.on('log', (entry: DebugLogEntry) => {
      session.logs.push(entry);
      socketManager.broadcast('ai', {
        type: 'ai:debug-log',
        sessionId,
        log: this.truncateLogData(entry),
      });
    });
  }

  /** 截断过大的数据，避免 WS 消息过大 */
  private truncateData(data: unknown): unknown {
    const json = JSON.stringify(data);
    if (json.length <= 50000) return data;
    // 对于过大的数据，只发送摘要
    return { _truncated: true, _size: json.length, _hint: '完整数据请通过 GET /api/ai/session/:id/logs 获取' };
  }

  /** 截断日志中过大的 data 字段 */
  private truncateLogData(entry: DebugLogEntry): DebugLogEntry {
    if (!entry.data) return entry;
    const dataJson = JSON.stringify(entry.data);
    if (dataJson.length <= 10000) return entry;
    return {
      ...entry,
      data: { _truncated: true, _size: dataJson.length },
    };
  }

  private getLastStepFilePath(session: PipelineSession): string | null {
    const writeStep = session.steps.find((s) => s.id === 'file-write');
    if (writeStep?.data && typeof writeStep.data === 'object') {
      return (writeStep.data as any).targetPath || null;
    }
    return null;
  }

  private getLastStepWarnings(session: PipelineSession): string[] {
    const ppStep = session.steps.find((s) => s.id === 'post-process');
    if (ppStep?.data && typeof ppStep.data === 'object') {
      return (ppStep.data as any).warnings || [];
    }
    return [];
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const entry of this.sessions.values()) {
      if (entry.session.status === 'running' || entry.session.status === 'wait-confirm') {
        entry.pipeline.abort();
      }
    }
    this.sessions.clear();
  }
}

export const sessionManager = new SessionManager();
