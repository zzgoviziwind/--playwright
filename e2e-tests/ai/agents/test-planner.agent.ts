// AI 测试生成系统 - Test Planner Agent
// 职责：读取需求或页面信息，分析测试场景，生成测试用例

import { callLLM, extractJSON } from '../llm-client';
import type { ProjectContext } from '../types';

/**
 * 测试用例步骤
 */
export interface TestCaseStep {
  /** 步骤描述 */
  action: string;
  /** 预期结果 */
  expected: string;
  /** 使用的 Page Object（可选） */
  pageObject?: string;
}

/**
 * 测试场景
 */
export interface TestScenario {
  /** 场景名称 */
  name: string;
  /** 优先级：P0/P1/P2 */
  priority: 'P0' | 'P1' | 'P2';
  /** 测试步骤 */
  steps: TestCaseStep[];
  /** 前置条件 */
  preCondition?: string;
  /** 预期结果 */
  expectedResult: string;
}

/**
 * 测试计划输出
 */
export interface TestPlan {
  /** 功能模块 */
  feature: string;
  /** 测试类型：smoke/regression */
  type: 'smoke' | 'regression';
  /** 测试场景列表 */
  scenarios: TestScenario[];
  /** 建议使用的 Fixture */
  recommendedFixtures: string[];
  /** 建议使用的 Page Object */
  recommendedPageObjects: string[];
}

/**
 * Test Planner Agent 输入
 */
export interface TestPlannerInput {
  /** 需求描述或功能描述 */
  requirement: string;
  /** 可选：页面 URL（用于自动分析） */
  url?: string;
  /** 可选：页面分析结果 */
  pageAnalysis?: {
    title: string;
    forms: any[];
    buttons: any[];
    tables: any[];
  };
  /** 测试类型偏好 */
  testType?: 'smoke' | 'regression';
}

/**
 * Test Planner Agent
 *
 * 职责：
 * 1. 分析需求描述
 * 2. 识别测试场景
 * 3. 生成结构化测试用例
 *
 * @param input - 输入信息
 * @param context - 项目上下文
 */
export async function testPlannerAgent(
  input: TestPlannerInput,
  context: ProjectContext
): Promise<TestPlan> {
  const systemPrompt = `你是一名资深测试分析师，专注于医院体检系统的测试用例设计。
请根据用户提供的需求描述，分析测试场景并生成结构化的测试计划。

## 测试设计原则

### 冒烟测试 (smoke)
- 验证核心功能是否正常
- 覆盖主要业务流程
- 测试用例数量精简 (3-5 个)
- 执行时间短

### 回归测试 (regression)
- 全面覆盖各种场景
- 包括边界条件和异常情况
- 测试用例数量较多 (5-10 个)
- 验证功能稳定性`;

  // 构建项目上下文摘要
  const contextSummary = buildContextSummary(context);

  const userPrompt = `## 需求描述
${input.requirement}

${input.pageAnalysis ? `## 页面分析结果
- 页面标题：${input.pageAnalysis.title}
- 表单数量：${input.pageAnalysis.forms?.length || 0}
- 按钮数量：${input.pageAnalysis.buttons?.length || 0}
- 表格数量：${input.pageAnalysis.tables?.length || 0}` : ''}

${input.url ? `## 目标 URL
${input.url}` : ''}

## 项目上下文
${contextSummary}

## 任务
请生成测试计划，严格按以下 JSON 格式输出：

{
  "feature": "功能模块名称",
  "type": "smoke 或 regression",
  "scenarios": [
    {
      "name": "场景名称",
      "priority": "P0/P1/P2",
      "preCondition": "前置条件（可选）",
      "steps": [
        {
          "action": "步骤描述",
          "expected": "预期结果",
          "pageObject": "使用的 Page Object 类名（可选）"
        }
      ],
      "expectedResult": "最终预期结果"
    }
  ],
  "recommendedFixtures": ["建议使用的 fixture 名称"],
  "recommendedPageObjects": ["建议使用的 Page Object 类名"]
}

## 要求
1. 场景名称应清晰描述测试目的
2. 步骤应具体、可执行
3. 优先使用项目中已有的 Page Object 和 Fixture
4. P0 表示核心流程，P1 表示重要场景，P2 表示边界情况`;

  const result = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 4096,
  });

  return extractJSON<TestPlan>(result);
}

/**
 * 构建项目上下文摘要
 */
function buildContextSummary(context: ProjectContext): string {
  const lines: string[] = [];

  // Page Objects
  if (context.pageObjects.length > 0) {
    lines.push('### 可用的 Page Object 类');
    for (const po of context.pageObjects) {
      lines.push(`- ${po.className}: ${po.methods.map((m) => m.name).join(', ') || '无方法'}`);
    }
  }

  // Fixtures
  if (context.authFixtures.length > 0) {
    lines.push('\n### 可用的角色 Fixture');
    for (const f of context.authFixtures) {
      lines.push(`- ${f.name}: ${f.description}`);
    }
  }

  if (context.dataFixtures.length > 0) {
    lines.push('\n### 可用的数据 Fixture');
    for (const f of context.dataFixtures) {
      lines.push(`- ${f.name}: ${f.description}`);
    }
  }

  return lines.join('\n') || '无可用上下文信息';
}

/**
 * 根据 URL 生成测试计划的便捷方法
 */
export async function testPlannerFromURL(
  url: string,
  context: ProjectContext,
  description?: string
): Promise<TestPlan> {
  return testPlannerAgent(
    {
      requirement: description || `为 URL ${url} 生成测试用例`,
      url,
      testType: 'smoke',
    },
    context
  );
}
