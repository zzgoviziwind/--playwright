// Agent Pipeline 类型定义

/** Agent ID */
export type AgentId =
  | 'test-planner'
  | 'test-generator'
  | 'test-executor'
  | 'failure-analysis'
  | 'self-healing';

/** Agent 状态 */
export type AgentStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/** Agent 节点 */
export interface AgentNode {
  id: AgentId;
  name: string;
  description: string;
  status: AgentStatus;
  icon: string;
  progress?: number; // 0-100
  duration?: number; // ms
  error?: string;
  result?: any;
}

/** Agent 执行结果 */
export interface AgentResult {
  agentId: AgentId;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

/** 完整 Agent 管道状态 */
export interface AgentPipelineState {
  agents: AgentNode[];
  currentAgent: AgentId | null;
  overallProgress: number;
  startTime?: number;
  endTime?: number;
}
