import { callLLM, extractJSONArray } from './llm-client';

// ============ 类型定义 ============

export interface TestCase {
  id: string;
  name: string;
  precondition: string;
  steps: string[];
  expected: string;
  priority: 'P0' | 'P1' | 'P2';
  category: '正向' | '逆向' | '边界' | '权限';
}

interface GenerateTestCasesInput {
  featureName: string;
  description: string;
  roles: string[];
}

// ============ 主函数 ============

/**
 * AI 生成测试用例
 * 输入功能描述，输出结构化测试用例列表
 */
export async function generateTestCases(
  input: GenerateTestCasesInput
): Promise<TestCase[]> {
  const systemPrompt = `你是一名资深测试工程师，正在为医院体检报告管理系统编写测试用例。
请严格按照 JSON 数组格式输出测试用例，不要包含其他内容。`;

  const prompt = `## 待测功能
功能名称：${input.featureName}
功能描述：${input.description}

## 系统角色
${input.roles.map((r) => `- ${r}`).join('\n')}

## 输出要求
请生成测试用例，严格按照以下 JSON 数组格式输出：
[
  {
    "id": "TC-001",
    "name": "用例名称",
    "precondition": "前置条件",
    "steps": ["步骤1", "步骤2"],
    "expected": "预期结果",
    "priority": "P0",
    "category": "正向"
  }
]

请覆盖：正向流程、逆向流程、边界条件、权限控制。
优先级定义：P0=核心流程，P1=重要功能，P2=边界/异常。`;

  const result = await callLLM(prompt, { systemPrompt, temperature: 0.3 });

  return extractJSONArray<TestCase>(result);
}
