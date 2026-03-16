// AI 测试生成系统 - Test Generator Agent
// 职责：根据测试用例生成 Playwright 测试代码

import { callLLM, extractCodeBlock } from '../llm-client';
import type { ProjectContext, TestPatternInfo } from '../types';
import type { TestPlan, TestScenario } from './test-planner.agent';

/**
 * Test Generator Agent 输入
 */
export interface TestGeneratorInput {
  /** 测试计划 */
  testPlan: TestPlan;
  /** 可选：指定要生成的场景 */
  scenarios?: TestScenario[];
}

/**
 * 生成结果
 */
export interface GenerationResult {
  /** 生成的代码 */
  code: string;
  /** 生成的测试数量 */
  testCount: number;
  /** 警告信息 */
  warnings: string[];
  /** 是否有效 */
  isValid: boolean;
}

/**
 * Test Generator Agent
 *
 * 职责：
 * 1. 根据测试计划生成 Playwright 测试代码
 * 2. 使用项目一致的代码风格
 * 3. 遵循 Playwright 最佳实践
 *
 * @param input - 输入信息
 * @param context - 项目上下文
 */
export async function testGeneratorAgent(
  input: TestGeneratorInput,
  context: ProjectContext
): Promise<GenerationResult> {
  const warnings: string[] = [];

  const systemPrompt = `你是一名资深 Playwright 测试开发工程师，专注于生成高质量、可维护的 E2E 测试代码。

## 代码生成规范

### 必须遵循的 Playwright 最佳实践
1. **定位器优先级**: data-testid > getByRole > getByText > getByPlaceholder > CSS selector
2. **避免硬编码等待**: 使用 await expect() 和 auto-waiting，不要使用 page.waitForTimeout()
3. **使用断言**: 所有验证必须使用 await expect()
4. **使用 step 组织步骤**: 使用 await test.step() 组织测试步骤
5. **复用 fixture**: 优先使用项目已有的 fixture
6. **Page Object 模式**: 使用项目已有的 Page Object 类

### 代码风格要求
1. 使用 TypeScript
2. 使用 async/await
3. 使用 Playwright Test Runner
4. 测试文件命名：*-ai.spec.ts
5. 测试描述使用中文`;

  // 构建代码生成的上下文
  const codeContext = buildCodeContext(context);

  // 确定要生成的场景
  const scenariosToGenerate = input.scenarios || input.testPlan.scenarios;

  const userPrompt = `## 测试计划
功能模块：${input.testPlan.feature}
测试类型：${input.testPlan.type}

## 测试场景
${scenariosToGenerate.map((s, i) => `
### 场景 ${i + 1}: ${s.name}
- 优先级：${s.priority}
- 前置条件：${s.preCondition || '无'}
- 预期结果：${s.expectedResult}
- 步骤:
${s.steps.map((step, j) => `  ${j + 1}. [${step.action}] => 预期：${step.expected}`).join('\n')}
`).join('\n')}

## 项目代码上下文
${codeContext}

## 现有测试模式参考
${context.testPatterns.slice(0, 2).map((p) => `
### 文件：${p.filePath}
${p.fullContent.substring(0, 1000)}...
`).join('\n')}

## 任务
请生成完整的 Playwright 测试文件，要求：

1. 文件名为：${input.testPlan.feature.toLowerCase().replace(/[\s_]/g, '-')}-ai.spec.ts
2. 导入必要的 fixture 和 Page Object
3. 为每个场景生成一个 test()
4. 使用 test.step() 组织步骤
5. 使用 await expect() 进行断言
6. 代码完整、可执行

请直接输出代码，不要解释。`;

  const result = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 8192,
  });

  const code = extractCodeBlock(result);
  const testCount = (code.match(/\btest\s*\(/g) || []).length;

  // 验证生成的代码
  const isValid = validateGeneratedCode(code, warnings);

  return {
    code,
    testCount,
    warnings,
    isValid,
  };
}

/**
 * 构建代码生成的上下文信息
 */
function buildCodeContext(context: ProjectContext): string {
  const lines: string[] = [];

  // Page Objects 详细方法签名
  if (context.pageObjects.length > 0) {
    lines.push('### Page Object 类方法');
    for (const po of context.pageObjects) {
      lines.push(`\n// ${po.className}`);
      lines.push(`// 位置：${po.filePath}`);
      for (const method of po.methods) {
        lines.push(`// ${method.name}(${method.params}): ${method.returnType}`);
        if (method.description) {
          lines.push(`//   ${method.description}`);
        }
      }
    }
  }

  // Fixture 使用示例
  if (context.authFixtures.length > 0) {
    lines.push('\n### 角色 Fixture 使用示例');
    lines.push('// 在 test 函数中使用：');
    lines.push('// test("测试名", async ({ adminPage }) => { ... })');
    lines.push('// test("测试名", async ({ doctorPage }) => { ... })');
    lines.push('// test("测试名", async ({ auditorPage }) => { ... })');
  }

  return lines.join('\n') || '无可用上下文';
}

/**
 * 验证生成的代码
 */
function validateGeneratedCode(code: string, warnings: string[]): boolean {
  let isValid = true;

  // 检查是否有 test 定义
  if (!code.includes('test(')) {
    warnings.push('警告：未找到 test() 定义');
    isValid = false;
  }

  // 检查是否有 expect 断言
  if (!code.includes('expect(')) {
    warnings.push('警告：未找到 expect() 断言，测试可能缺少验证');
  }

  // 检查是否使用了硬编码等待
  const waitForTimeoutMatches = code.match(/waitForTimeout\s*\(\s*\d+\s*\)/g);
  if (waitForTimeoutMatches && waitForTimeoutMatches.length > 0) {
    warnings.push(`警告：发现 ${waitForTimeoutMatches.length} 处硬编码等待，建议改用 auto-waiting`);
  }

  // 检查是否导入了 test 和 expect
  if (!code.includes("from '@playwright/test'")) {
    warnings.push('警告：未找到 @playwright/test 导入');
    isValid = false;
  }

  // 检查是否使用了 fixture
  if (!code.includes('async ({') || !code.includes('})')) {
    warnings.push('警告：代码可能未正确使用 fixture');
  }

  return isValid;
}

/**
 * 根据单个测试场景生成测试的便捷方法
 */
export async function generateTestForScenario(
  scenario: TestScenario,
  feature: string,
  context: ProjectContext
): Promise<GenerationResult> {
  return testGeneratorAgent(
    {
      testPlan: {
        feature,
        type: 'smoke',
        scenarios: [scenario],
        recommendedFixtures: [],
        recommendedPageObjects: [],
      },
    },
    context
  );
}

/**
 * 修改现有测试代码
 */
export async function modifyTestCode(
  existingCode: string,
  changeDescription: string,
  context: ProjectContext
): Promise<GenerationResult> {
  const warnings: string[] = [];

  const systemPrompt = `你是一名 Playwright 测试专家，擅长修改和优化现有测试代码。

## 修改原则
1. 保持原有代码风格一致
2. 仅修改必要部分
3. 确保修改后的代码完整可执行
4. 遵循 Playwright 最佳实践`;

  const userPrompt = `## 现有测试代码
${existingCode}

## 修改要求
${changeDescription}

## 项目上下文
${buildCodeContext(context)}

## 任务
请修改上述测试代码，满足修改要求。
直接输出完整代码，不要解释。`;

  const result = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 8192,
  });

  const code = extractCodeBlock(result);
  const testCount = (code.match(/\btest\s*\(/g) || []).length;
  const isValid = validateGeneratedCode(code, warnings);

  return {
    code,
    testCount,
    warnings,
    isValid,
  };
}

/**
 * 扩展现有测试代码
 */
export async function extendTestCode(
  existingCode: string,
  addDescription: string,
  context: ProjectContext
): Promise<GenerationResult> {
  const warnings: string[] = [];

  const systemPrompt = `你是一名 Playwright 测试专家，擅长扩展现有测试代码。

## 扩展原则
1. 在现有测试文件中添加新的 test()
2. 保持原有代码风格一致
3. 新增测试应独立于现有测试
4. 遵循 Playwright 最佳实践`;

  const userPrompt = `## 现有测试代码
${existingCode}

## 扩展要求
${addDescription}

## 项目上下文
${buildCodeContext(context)}

## 任务
请在现有测试代码基础上扩展，添加新的测试用例。
直接输出完整代码，不要解释。`;

  const result = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 8192,
  });

  const code = extractCodeBlock(result);
  const testCount = (code.match(/\btest\s*\(/g) || []).length;
  const isValid = validateGeneratedCode(code, warnings);

  return {
    code,
    testCount,
    warnings,
    isValid,
  };
}
