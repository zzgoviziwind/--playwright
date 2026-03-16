import { callLLM, extractJSON } from './llm-client';

// ============ 类型定义 ============

export interface FailureAnalysis {
  /** 失败根因分类 */
  category: 'locator' | 'logic' | 'env' | 'data';
  /** 具体原因描述 */
  description: string;
  /** 修复建议 */
  suggestion: string;
  /** 建议的修复代码（如有） */
  fixCode?: string;
}

interface AnalyzeFailureInput {
  testName: string;
  errorMessage: string;
  screenshot?: string;
  recentChanges?: string[];
}

// ============ 主函数 ============

/**
 * AI 分析测试失败原因
 * 输入失败日志和上下文，输出根因分析报告
 */
export async function analyzeFailure(
  input: AnalyzeFailureInput
): Promise<FailureAnalysis> {
  const systemPrompt = `你是一名自动化测试失败分析专家。请分析以下 Playwright 测试失败信息，
给出失败根因和修复建议。请严格按照 JSON 格式输出。`;

  const prompt = `## 失败信息
测试用例：${input.testName}
错误信息：
${input.errorMessage}

${input.screenshot ? `## 页面截图\n（已附截图，请根据错误信息分析）` : ''}

${
  input.recentChanges?.length
    ? `## 最近代码变更\n${input.recentChanges.map((c) => `- ${c}`).join('\n')}`
    : ''
}

## 请按以下 JSON 格式回答
{
  "category": "locator|logic|env|data",
  "description": "具体原因描述",
  "suggestion": "修复建议",
  "fixCode": "修复后的代码（如适用）"
}

分类说明：
- locator: 定位器失效（元素属性变更、DOM 结构变化）
- logic: 业务逻辑变更（功能行为改变）
- env: 环境问题（服务不可用、网络超时）
- data: 数据问题（测试数据不存在、数据状态不正确）`;

  const result = await callLLM(prompt, { systemPrompt, temperature: 0.3 });

  return extractJSON<FailureAnalysis>(result);
}
