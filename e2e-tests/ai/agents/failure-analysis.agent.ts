// AI 测试生成系统 - Failure Analysis Agent
// 职责：当测试失败时分析原因

import { callLLM, extractJSON } from '../llm-client';
import type { TestResult } from './test-executor.agent';

/**
 * 失败根因分类
 */
export type FailureCategory =
  | 'locator' // 定位器问题
  | 'timing' // 时序/等待问题
  | 'network' // 网络请求问题
  | 'permission' // 权限问题
  | 'data' // 测试数据问题
  | 'logic' // 业务逻辑问题
  | 'environment' // 环境问题
  | 'flaky'; // 不稳定测试

/**
 * 失败分析结果
 */
export interface FailureAnalysis {
  /** 根因分类 */
  category: FailureCategory;
  /** 详细描述 */
  description: string;
  /** 具体原因 */
  rootCause: string;
  /** 修复建议 */
  suggestion: string;
  /** 建议的代码修复（如有） */
  fixCode?: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 相关元素信息 */
  elementInfo?: {
    originalSelector: string;
    suggestedSelector?: string;
    elementType?: string;
  };
}

/**
 * Failure Analysis Agent 输入
 */
export interface FailureAnalysisInput {
  /** 测试结果 */
  testResult: TestResult;
  /** 测试代码 */
  testCode: string;
  /** 页面 HTML 快照（可选） */
  pageSnapshot?: string;
  /** 控制台日志（可选） */
  consoleLogs?: string[];
  /** 网络日志（可选） */
  networkLogs?: Array<{ url: string; status: number; method: string }>;
  /** 最近代码变更（可选） */
  recentChanges?: string[];
}

/**
 * Failure Analysis Agent
 *
 * 职责：
 * 1. 分析测试失败原因
 * 2. 识别根因分类
 * 3. 提供修复建议
 *
 * @param input - 输入信息
 */
export async function failureAnalysisAgent(
  input: FailureAnalysisInput
): Promise<FailureAnalysis> {
  const systemPrompt = `你是一名自动化测试失败分析专家，专注于 Playwright E2E 测试的根因分析。

## 分析维度

### 1. 定位器问题 (locator)
- 元素属性变更（class、id、data-testid 等）
- DOM 结构变化
- 选择器语法错误

### 2. 时序问题 (timing)
- 页面未完全加载
- 动画/过渡效果未完成
- 异步操作未完成

### 3. 网络问题 (network)
- API 请求失败
- 响应超时
- 数据加载失败

### 4. 权限问题 (permission)
- 用户角色权限不足
- 认证 token 过期
- 访问控制限制

### 5. 数据问题 (data)
- 测试数据不存在
- 数据状态不正确
- 数据依赖缺失

### 6. 业务逻辑问题 (logic)
- 功能行为变更
- 业务规则修改
- 流程调整

### 7. 环境问题 (environment)
- 服务不可用
- 配置错误
- 环境差异

### 8. 不稳定测试 (flaky)
- 竞态条件
- 随机失败
- 依赖外部状态`;

  const userPrompt = buildAnalysisPrompt(input);

  const result = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 4096,
  });

  return extractJSON<FailureAnalysis>(result);
}

/**
 * 构建分析提示
 */
function buildAnalysisPrompt(input: FailureAnalysisInput): string {
  const sections: string[] = [];

  // 测试结果信息
  sections.push(`## 测试结果信息
测试名称：${input.testResult.name}
执行状态：${input.testResult.status}
执行时长：${input.testResult.duration}ms
失败步骤：${input.testResult.failedStep || 'N/A'}`);

  // 错误信息
  if (input.testResult.error) {
    sections.push(`
## 错误信息
错误类型：${input.testResult.error.message.split(':')[0] || 'Unknown'}
错误详情：
${input.testResult.error.message}

错误堆栈：
${input.testResult.error.stack.substring(0, 1000)}`);
  }

  // 测试代码
  sections.push(`
## 测试代码
\`\`\`typescript
${input.testCode.substring(0, 3000)}
\`\`\``);

  // 页面快照
  if (input.pageSnapshot) {
    sections.push(`
## 页面 HTML 快照
${input.pageSnapshot.substring(0, 5000)}...`);
  }

  // 控制台日志
  if (input.consoleLogs && input.consoleLogs.length > 0) {
    sections.push(`
## 控制台日志
${input.consoleLogs.slice(-20).join('\n')}`);
  }

  // 网络日志
  if (input.networkLogs && input.networkLogs.length > 0) {
    const failedRequests = input.networkLogs.filter(
      (log) => log.status >= 400 || log.status === 0
    );
    if (failedRequests.length > 0) {
      sections.push(`
## 失败的网络请求
${failedRequests.map((r) => `${r.method} ${r.url} - ${r.status}`).join('\n')}`);
    }
  }

  // 代码变更
  if (input.recentChanges && input.recentChanges.length > 0) {
    sections.push(`
## 最近代码变更
${input.recentChanges.map((c) => `- ${c}`).join('\n')}`);
  }

  // 分析要求
  sections.push(`
## 任务
请分析上述失败信息，找出根因并提供修复建议。

请按以下 JSON 格式输出：
{
  "category": "locator|timing|network|permission|data|logic|environment|flaky",
  "description": "失败原因详细描述",
  "rootCause": "具体根因",
  "suggestion": "修复建议",
  "fixCode": "建议的修复代码（如适用）",
  "confidence": 0.95,
  "elementInfo": {
    "originalSelector": "原始选择器",
    "suggestedSelector": "建议的新选择器（如适用）",
    "elementType": "元素类型（如适用）"
  }
}

置信度说明：
- 0.9-1.0: 非常确定
- 0.7-0.9: 比较确定
- 0.5-0.7: 中等确定
- <0.5: 不太确定`);

  return sections.join('\n');
}

/**
 * 批量分析多个失败
 */
export async function analyzeFailures(
  failures: FailureAnalysisInput[]
): Promise<FailureAnalysis[]> {
  const results: FailureAnalysis[] = [];

  for (const failure of failures) {
    try {
      const analysis = await failureAnalysisAgent(failure);
      results.push(analysis);
    } catch (error) {
      results.push({
        category: 'environment',
        description: `分析失败：${(error as Error).message}`,
        rootCause: '无法完成分析',
        suggestion: '请手动检查测试日志',
        confidence: 0,
      });
    }
  }

  return results;
}

/**
 * 生成失败分析报告
 */
export function generateFailureReport(
  analysis: FailureAnalysis,
  testName: string
): string {
  const lines: string[] = [
    `# 测试失败分析报告`,
    ``,
    `## 测试信息`,
    `- 测试名称：${testName}`,
    `- 失败分类：**${analysis.category}**`,
    `- 置信度：${(analysis.confidence * 100).toFixed(0)}%`,
    ``,
    `## 失败原因`,
    analysis.description,
    ``,
    `## 根因分析`,
    analysis.rootCause,
    ``,
    `## 修复建议`,
    analysis.suggestion,
  ];

  if (analysis.fixCode) {
    lines.push(``, `## 建议修复代码`, `\`\`\`typescript`, analysis.fixCode, `\`\`\``);
  }

  if (analysis.elementInfo) {
    lines.push(
      ``,
      `## 元素信息`,
      `- 原始选择器：${analysis.elementInfo.originalSelector}`,
      analysis.elementInfo.suggestedSelector
        ? `- 建议选择器：${analysis.elementInfo.suggestedSelector}`
        : '',
      analysis.elementInfo.elementType
        ? `- 元素类型：${analysis.elementInfo.elementType}`
        : ''
    );
  }

  return lines.join('\n');
}
