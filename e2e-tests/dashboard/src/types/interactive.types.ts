// 交互式 AI 测试生成 - 前端类型定义

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
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  data?: any;
  error?: string;
}

/** 确认请求 */
export interface ConfirmRequest {
  sessionId: string;
  stepId: StepId;
  stepName: string;
  data: any;
  confirmOptions: string[];
}

/** 确认响应 */
export interface ConfirmResponse {
  sessionId: string;
  stepId: StepId;
  action: 'continue' | 'edit' | 'retry' | 'abort';
  editedData?: Record<string, any>;
}

/** 调试日志条目 */
export interface DebugLogEntry {
  timestamp: string;
  level: 'info' | 'debug' | 'warn' | 'error';
  step: string;
  category: 'progress' | 'prompt' | 'llm-response' | 'validation' | 'diff' | 'system';
  message: string;
  data?: any;
}

/** 会话状态 */
export type SessionStatus =
  | 'running'
  | 'wait-confirm'
  | 'completed'
  | 'aborted'
  | 'error';

/** 交互式会话 */
export interface InteractiveSession {
  sessionId: string;
  status: SessionStatus;
  steps: PipelineStep[];
  currentStepId: StepId | null;
  activeModal: StepId | 'error' | null;
  pendingConfirm: ConfirmRequest | null;
  debugLogs: DebugLogEntry[];
}

/** Context Scan 步骤数据 */
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

/** Prompt Build 步骤数据 */
export interface PromptBuildData {
  systemPrompt: string;
  userPrompt: string;
}

/** LLM Call 步骤数据 */
export interface LlmCallData {
  rawResponse: string;
  model: string;
  tokenUsage?: { prompt: number; completion: number };
}

/** Post Process 步骤数据 */
export interface PostProcessData {
  rawCode: string;
  processedCode: string;
  warnings: string[];
  isValid: boolean;
}

/** File Write 步骤数据 */
export interface FileWriteData {
  targetPath: string;
  fileName: string;
  testCount: number;
  fileExists: boolean;
  code: string;
}

/** 浏览器查看器状态 */
export interface BrowserViewerState {
  isRunning: boolean;
  screenshots: Array<{ timestamp: number; data: string }>;
  isRecording: boolean;
  recordedActions: Array<{
    action: string;
    selector: string;
    value?: string;
    timestamp: number;
  }>;
}
