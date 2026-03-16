// AI 测试生成系统 - Prompt 模板管理

import type { ProjectContext, PageObjectInfo } from './types';

/** 通用 System Prompt */
const SYSTEM_PROMPT = `你是一名资深 Playwright E2E 自动化测试工程师，正在为医院体检报告管理系统编写测试。
你必须严格使用项目中已有的 Page Object 类、Fixture 和工具函数。
输出要求：只输出完整可执行的 TypeScript 测试代码，不含 markdown 标记、代码围栏或额外说明文字。`;

/**
 * 将 PO 信息格式化为文本描述
 */
function formatPageObject(po: PageObjectInfo): string {
  const locatorLines = po.locators
    .map((l) => `  readonly ${l.name}: Locator; // ${l.selector}`)
    .join('\n');
  const methodLines = po.methods
    .map((m) => {
      const desc = m.description ? ` // ${m.description}` : '';
      return `  async ${m.name}(${m.params}): ${m.returnType};${desc}`;
    })
    .join('\n');
  return `class ${po.className} {\n  constructor(page: Page);\n${locatorLines}\n${methodLines}\n}`;
}

/**
 * 构建项目上下文描述文本
 */
function buildContextText(context: ProjectContext): string {
  const sections: string[] = [];

  // Page Objects
  sections.push('## 可用的 Page Object 类\n');
  for (const po of context.pageObjects) {
    sections.push(`### ${po.className} (${po.filePath})`);
    sections.push('```typescript');
    sections.push(formatPageObject(po));
    sections.push('```\n');
  }

  // Auth Fixtures
  sections.push('## 可用的 Auth Fixture');
  sections.push('从 `../../fixtures/auth.fixture` 导入 `{ test, expect }`，test 函数参数中可解构以下角色页面：');
  for (const f of context.authFixtures) {
    sections.push(`- \`${f.name}\`: ${f.type} — ${f.description}`);
  }
  sections.push('');

  // Data Fixtures
  sections.push('## 可用的 Data Fixture');
  sections.push('从 `../../fixtures/data.fixture` 导入 `{ test, expect }`（继承 auth fixture），额外提供：');
  for (const f of context.dataFixtures) {
    sections.push(`- \`${f.name}\`: ${f.type} — ${f.description}`);
  }
  sections.push('');

  // Util Functions
  sections.push('## 可用的工具函数');
  sections.push('从 `../../utils/api-helper` 导入：');
  for (const u of context.utilFunctions) {
    const desc = u.description ? ` — ${u.description}` : '';
    sections.push(`- \`${u.signature}\`${desc}`);
  }
  sections.push('');

  // Test Data
  sections.push('## 测试数据参考');
  for (const d of context.testDataSchemas) {
    sections.push(`### ${d.filePath}`);
    sections.push(d.summary);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * 构建硬约束段
 */
function buildConstraints(testType: 'smoke' | 'regression'): string {
  const typeGuide =
    testType === 'smoke'
      ? '生成 2-4 个 P0 核心流程测试用例，聚焦正向流程和关键断言。'
      : '生成 6-12 个测试用例，全面覆盖正向流程、逆向流程、边界条件和权限控制。';

  return `## 硬约束（必须遵守）
1. 必须使用项目中已有的 Page Object 类和方法，不要自创 PO 方法或属性
2. 必须从 \`../../fixtures/auth.fixture\` 或 \`../../fixtures/data.fixture\` 导入 test 和 expect
3. 如果需要准备测试数据，使用 \`createTestReport()\` / \`deleteTestReport()\`，从 \`../../utils/api-helper\` 导入
4. Locator 通过 PO 实例的属性访问（如 \`editPage.saveButton\`），不要直接写 \`page.getByTestId()\`
5. 文件必须包含完整的 import 语句
6. 使用 \`test.describe()\` 组织测试，每个 \`test()\` 使用清晰的中文名称
7. PO 在测试函数内实例化：\`const xxxPage = new XxxPage(rolePage);\`
8. 数据清理放在 afterEach 或测试末尾，用 \`.catch(() => {})\` 防止清理失败阻断测试
9. ${typeGuide}
10. 输出纯 TypeScript 代码，不要包含 \`\`\`typescript\`\`\` 标记或任何非代码文字`;
}

/**
 * 构建 generate 场景的 prompt
 */
export function buildGeneratePrompt(
  feature: string,
  testType: 'smoke' | 'regression',
  context: ProjectContext
): { systemPrompt: string; userPrompt: string } {
  const contextText = buildContextText(context);

  // 选取最相关的 few-shot example
  const exemplar = context.testPatterns.find((p) =>
    testType === 'smoke'
      ? p.filePath.includes('smoke/')
      : p.filePath.includes('regression/')
  );

  const exemplarSection = exemplar
    ? `## 代码风格参考（请严格模仿此风格）\n以下是项目中已有的 ${testType} 测试文件，请模仿其 import 方式、数据准备模式、PO 使用方式和断言风格：\n\n\`\`\`typescript\n${exemplar.fullContent}\`\`\`\n`
    : '';

  const userPrompt = `${contextText}
${exemplarSection}
${buildConstraints(testType)}

## 生成任务
请为以下功能生成完整的 ${testType} 测试文件：

**功能描述**：${feature}

输出完整的 .spec.ts 文件内容（从 import 语句开始）。`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

/**
 * 构建 modify 场景的 prompt
 */
export function buildModifyPrompt(
  existingCode: string,
  changeDescription: string,
  context: ProjectContext
): { systemPrompt: string; userPrompt: string } {
  const contextText = buildContextText(context);

  const userPrompt = `${contextText}

${buildConstraints('regression')}

## 现有测试代码
\`\`\`typescript
${existingCode}
\`\`\`

## 修改需求
${changeDescription}

## 任务
请基于以上修改需求，输出修改后的完整文件内容。保持不相关的代码不变，仅做必要修改。
输出完整的 .spec.ts 文件内容（从 import 语句开始）。`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

/**
 * 构建 extend 场景的 prompt
 */
export function buildExtendPrompt(
  existingCode: string,
  addDescription: string,
  context: ProjectContext
): { systemPrompt: string; userPrompt: string } {
  const contextText = buildContextText(context);

  const userPrompt = `${contextText}

${buildConstraints('regression')}

## 现有测试代码
\`\`\`typescript
${existingCode}
\`\`\`

## 新增需求
${addDescription}

## 任务
在现有测试代码基础上追加新的测试用例。保持现有所有代码完全不变，在现有的 test.describe 块内或新增 test.describe 块中添加新用例。
如果需要新的 import，添加到文件顶部。
输出修改后的完整 .spec.ts 文件内容（从 import 语句开始）。`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
