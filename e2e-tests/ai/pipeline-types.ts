// AI 测试生成系统 - 可暂停管道类型定义

// ==================== 步骤相关 ====================

/** 步骤 ID */
export type StepId =
  | 'context-scan'
  | 'prompt-build'
  | 'llm-call'
  | 'post-process'
  | 'file-write';

/** 步骤状态 */
export type StepStatus =
  | 'pending'
  | 'running'
  | 'wait-confirm'
  | 'completed'
  | 'skipped'
  | 'failed';

/** 管道步骤 */
export interface PipelineStep {
  id: StepId;
  name: string;
  status: StepStatus;
  requiresConfirm: boolean;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  data?: unknown;
  error?: string;
}

/** 用户确认动作 */
export interface StepConfirmAction {
  action: 'continue' | 'edit' | 'retry' | 'abort';
  editedData?: Record<string, unknown>;
}

// ==================== 各步骤数据结构 ====================

/** context-scan 步骤输出 */
export interface ContextScanData {
  pageObjects: Array<{
    className: string;
    filePath: string;
    locatorCount: number;
    methodCount: number;
    methods: string[];
  }>;
  authFixtures: Array<{ name: string; type: string; description: string }>;
  dataFixtures: Array<{ name: string; type: string; description: string }>;
  testPatterns: Array<{ filePath: string; imports: string[] }>;
  testDataSchemas: Array<{ filePath: string; summary: string }>;
  utilFunctions: Array<{ name: string; signature: string }>;
  relevantPOs: string[];
}

/** prompt-build 步骤输出 */
export interface PromptBuildData {
  systemPrompt: string;
  userPrompt: string;
}

/** llm-call 步骤输出 */
export interface LlmCallData {
  rawResponse: string;
  model: string;
  tokenUsage?: { prompt: number; completion: number };
}

/** post-process 步骤输出 */
export interface PostProcessData {
  rawCode: string;
  processedCode: string;
  warnings: string[];
  isValid: boolean;
}

/** file-write 步骤输出 */
export interface FileWriteData {
  targetPath: string;
  fileName: string;
  testCount: number;
  fileExists: boolean;
  code: string;
}

// ==================== 调试日志 ====================

/** 日志级别 */
export type LogLevel = 'info' | 'debug' | 'warn' | 'error';

/** 日志分类 */
export type LogCategory =
  | 'progress'
  | 'prompt'
  | 'llm-response'
  | 'validation'
  | 'diff'
  | 'system';

/** 调试日志条目 */
export interface DebugLogEntry {
  timestamp: string;
  level: LogLevel;
  step: string;
  category: LogCategory;
  message: string;
  data?: unknown;
}

// ==================== 会话 ====================

/** 管道模式 */
export type PipelineMode = 'generate' | 'modify' | 'extend';

/** 会话状态 */
export type SessionStatus =
  | 'running'
  | 'wait-confirm'
  | 'completed'
  | 'aborted'
  | 'error';

/** 管道会话 */
export interface PipelineSession {
  sessionId: string;
  mode: PipelineMode;
  stepByStep: boolean;
  status: SessionStatus;
  currentStepIndex: number;
  steps: PipelineStep[];
  logs: DebugLogEntry[];
  createdAt: number;
  result?: string;
}

// ==================== 管道参数 ====================

/** generate 管道参数 */
export interface GeneratePipelineParams {
  feature: string;
  type: 'smoke' | 'regression';
  output?: string;
  dryRun?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/** modify 管道参数 */
export interface ModifyPipelineParams {
  file: string;
  change: string;
  temperature?: number;
  maxTokens?: number;
}

/** extend 管道参数 */
export interface ExtendPipelineParams {
  file: string;
  add: string;
  temperature?: number;
  maxTokens?: number;
}

/** 管道参数联合类型 */
export type PipelineParams =
  | GeneratePipelineParams
  | ModifyPipelineParams
  | ExtendPipelineParams;

// ==================== 管道事件 ====================

/** 步骤定义（用于注册） */
export interface StepDefinition {
  id: StepId;
  name: string;
  requiresConfirm: boolean;
  execute: (prevData: unknown) => Promise<unknown>;
}

/** 管道中止错误 */
export class PipelineAbortError extends Error {
  constructor(message = '用户中止了管道执行') {
    super(message);
    this.name = 'PipelineAbortError';
  }
}

/** 步骤确认超时错误 */
export class StepConfirmTimeoutError extends Error {
  constructor(stepId: string) {
    super(`步骤 '${stepId}' 确认超时`);
    this.name = 'StepConfirmTimeoutError';
  }
}
