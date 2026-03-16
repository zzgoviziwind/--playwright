import { callLLM, extractCodeBlock } from './llm-client';
import type { TestCase } from './test-generator';

// ============ 类型定义 ============

interface POInterface {
  className: string;
  methods: string[];
}

interface GenerateScriptInput {
  testCase: TestCase;
  pageObjects: POInterface[];
  fixtures: string[];
}

// ============ 主函数 ============

/**
 * AI 生成 Playwright 测试脚本
 * 输入测试用例描述 + PO 接口，输出可执行的 .spec.ts 代码
 */
export async function generateScript(input: GenerateScriptInput): Promise<string> {
  const systemPrompt = `你是一名 Playwright 自动化测试工程师。请根据以下测试用例和 Page Object 接口，
生成可执行的 Playwright TypeScript 测试脚本。
要求：
- 使用 test.describe 组织
- 使用 fixture 获取登录态
- 使用 beforeEach 准备数据
- 断言使用 expect
- 输出纯代码，不要包含 markdown 标记`;

  const poDescription = input.pageObjects
    .map(
      (po) =>
        `class ${po.className} {\n${po.methods.map((m) => `  ${m}`).join('\n')}\n}`
    )
    .join('\n\n');

  const prompt = `## 测试用例
用例编号：${input.testCase.id}
用例名称：${input.testCase.name}
前置条件：${input.testCase.precondition}
操作步骤：
${input.testCase.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
预期结果：${input.testCase.expected}

## 可用的 Page Object 接口
\`\`\`typescript
${poDescription}
\`\`\`

## 可用的 Fixture
${input.fixtures.map((f) => `- ${f}`).join('\n')}

## 可用的工具函数
- createTestReport(options): 通过 API 创建测试报告，返回 reportId
- deleteTestReport(reportId): 通过 API 删除测试报告

请生成完整的 .spec.ts 文件内容。`;

  const result = await callLLM(prompt, { systemPrompt, temperature: 0.2 });

  return extractCodeBlock(result);
}
