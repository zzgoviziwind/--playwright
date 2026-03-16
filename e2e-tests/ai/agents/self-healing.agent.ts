// AI 测试生成系统 - Self-Healing Agent
// 职责：根据分析结果自动修复测试代码

import { callLLM, extractCodeBlock } from '../llm-client';
import type { FailureAnalysis } from './failure-analysis.agent';

/**
 * Self-Healing Agent 输入
 */
export interface SelfHealingInput {
  /** 原始测试代码 */
  originalCode: string;
  /** 失败分析结果 */
  analysis: FailureAnalysis;
  /** 失败时的页面上下文（可选） */
  pageContext?: {
    /** 页面标题 */
    title: string;
    /** 页面 URL */
    url: string;
    /** 可用元素列表 */
    availableElements: Array<{
      selector: string;
      text?: string;
      type?: string;
    }>;
  };
}

/**
 * 修复结果
 */
export interface HealingResult {
  /** 修复后的代码 */
  fixedCode: string;
  /** 修复说明 */
  fixDescription: string;
  /** 修复类型 */
  fixType: 'locator' | 'timing' | 'logic' | 'data' | 'other';
  /** 修改内容摘要 */
  changes: string[];
  /** 是否成功修复 */
  success: boolean;
}

/**
 * Self-Healing Agent
 *
 * 职责：
 * 1. 根据失败分析结果修复测试代码
 * 2. 更新定位器
 * 3. 调整等待策略
 * 4. 修复断言逻辑
 *
 * @param input - 输入信息
 */
export async function selfHealingAgent(
  input: SelfHealingInput
): Promise<HealingResult> {
  const systemPrompt = `你是一名 Playwright 测试修复专家，专注于自动修复失败的 E2E 测试。

## 修复策略

### 1. 定位器修复 (locator)
- 使用 data-testid 优先
- 使用 getByRole + name 组合
- 使用更稳定的 CSS 选择器
- 避免使用易变的 class 名

### 2. 时序修复 (timing)
- 使用 await expect() 等待元素
- 使用 waitForLoadState 等待页面
- 使用 waitForResponse 等待 API
- 避免硬编码 setTimeout

### 3. 逻辑修复 (logic)
- 调整操作步骤顺序
- 修正断言条件
- 更新业务逻辑

### 4. 数据修复 (data)
- 使用正确的测试数据
- 添加数据前置条件
- 修复数据依赖

## 修复原则
1. 最小化修改：仅修改必要部分
2. 保持风格：与原有代码风格一致
3. 可维护性：修复后的代码应易于维护
4. 可追溯性：清晰说明修改内容`;

  const userPrompt = buildHealingPrompt(input);

  const result = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 8192,
  });

  const fixedCode = extractCodeBlock(result);

  // 分析修改内容
  const changes = analyzeChanges(input.originalCode, fixedCode);

  // 确定修复类型
  const fixType = mapCategoryToFixType(input.analysis.category);

  return {
    fixedCode,
    fixDescription: input.analysis.suggestion,
    fixType,
    changes,
    success: fixedCode.length > 0 && changes.length > 0,
  };
}

/**
 * 构建修复提示
 */
function buildHealingPrompt(input: SelfHealingInput): string {
  const sections: string[] = [];

  // 失败分析结果
  sections.push(`## 失败分析结果
分类：${input.analysis.category}
描述：${input.analysis.description}
根因：${input.analysis.rootCause}
建议：${input.analysis.suggestion}
置信度：${input.analysis.confidence * 100}%`);

  if (input.analysis.elementInfo) {
    sections.push(`
### 元素信息
- 原始选择器：${input.analysis.elementInfo.originalSelector}`);
    if (input.analysis.elementInfo.suggestedSelector) {
      sections.push(`- 建议选择器：${input.analysis.elementInfo.suggestedSelector}`);
    }
  }

  // 原始测试代码
  sections.push(`
## 原始测试代码
\`\`\`typescript
${input.originalCode}
\`\`\``);

  // 页面上下文
  if (input.pageContext) {
    sections.push(`
## 页面上下文
- 页面标题：${input.pageContext.title}
- 页面 URL: ${input.pageContext.url}

### 可用元素
${input.pageContext.availableElements
  .map((e) => `- ${e.selector}${e.text ? ` (text: "${e.text}")` : ''}${e.type ? ` (type: ${e.type})` : ''}`)
  .join('\n')}`);
  }

  // 如果有建议的选择器，优先使用
  if (input.analysis.elementInfo?.suggestedSelector) {
    sections.push(`
## 修复要求
请将失败的选择器 "${input.analysis.elementInfo.originalSelector}"
替换为 "${input.analysis.elementInfo.suggestedSelector}"`);
  } else {
    sections.push(`
## 修复要求
请根据上述失败分析结果，修复测试代码中的问题。`);
  }

  // 输出要求
  sections.push(`
## 输出要求
1. 输出完整的修复后的测试代码
2. 代码必须完整、可执行
3. 使用 markdown 代码块包裹
4. 不要省略任何部分
5. 保持原有代码风格一致`);

  return sections.join('\n');
}

/**
 * 分析代码变更
 */
function analyzeChanges(originalCode: string, fixedCode: string): string[] {
  const changes: string[] = [];
  const originalLines = originalCode.split('\n');
  const fixedLines = fixedCode.split('\n');

  // 简单的 diff 分析
  const maxLen = Math.max(originalLines.length, fixedLines.length);

  for (let i = 0; i < maxLen; i++) {
    const origLine = originalLines[i];
    const fixedLine = fixedLines[i];

    if (origLine !== fixedLine) {
      if (origLine === undefined) {
        changes.push(`+ 新增：${fixedLine?.trim()}`);
      } else if (fixedLine === undefined) {
        changes.push(`- 删除：${origLine.trim()}`);
      } else {
        changes.push(`~ 修改："${origLine.trim()}" => "${fixedLine.trim()}"`);
      }
    }
  }

  // 限制返回的变更数量
  return changes.slice(0, 20);
}

/**
 * 将失败分类映射到修复类型
 */
function mapCategoryToFixType(
  category: FailureAnalysis['category']
): HealingResult['fixType'] {
  switch (category) {
    case 'locator':
      return 'locator';
    case 'timing':
      return 'timing';
    case 'logic':
      return 'logic';
    case 'data':
      return 'data';
    default:
      return 'other';
  }
}

/**
 * 批量修复多个测试
 */
export async function healMultipleTests(
  inputs: SelfHealingInput[]
): Promise<HealingResult[]> {
  const results: HealingResult[] = [];

  for (const input of inputs) {
    try {
      const result = await selfHealingAgent(input);
      results.push(result);
    } catch (error) {
      results.push({
        fixedCode: '',
        fixDescription: `修复失败：${(error as Error).message}`,
        fixType: 'other',
        changes: [],
        success: false,
      });
    }
  }

  return results;
}

/**
 * 验证修复后的代码
 */
export function validateHealedCode(code: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 检查基本语法
  if (!code.includes('test(')) {
    issues.push('缺少 test() 定义');
  }

  if (!code.includes('expect(')) {
    issues.push('缺少 expect() 断言');
  }

  if (!code.includes('from')) {
    issues.push('缺少 import 语句');
  }

  // 检查是否有语法错误
  const unmatchedBraces =
    (code.match(/{/g) || []).length - (code.match(/}/g) || []).length;
  if (unmatchedBraces !== 0) {
    issues.push(`括号不匹配：${unmatchedBraces > 0 ? '缺少 }' : '多余的 }'}`);
  }

  const unmatchedParens =
    (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length;
  if (unmatchedParens !== 0) {
    issues.push(`圆括号不匹配：${unmatchedParens > 0 ? '缺少 )' : '多余的 )'}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
