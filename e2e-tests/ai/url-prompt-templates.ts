// AI 测试生成系统 - URL 场景 Prompt 模板
// 面向任意网站的通用测试生成，不依赖项目 PO/Fixture

import type { PageAnalysis, FormInfo } from './types';

/** URL 场景的 System Prompt */
const URL_SYSTEM_PROMPT = `你是一名资深 Playwright E2E 自动化测试工程师。
你将根据一个真实网页的 DOM 结构分析结果，生成可直接运行的 Playwright 测试代码。

严格要求：
1. 使用 import { test, expect } from '@playwright/test';
2. 直接使用 page.goto() 导航，page.getByRole / page.getByText / page.getByPlaceholder / page.locator 等定位元素
3. 不使用任何 Page Object 类或自定义 Fixture
4. 每个 test() 必须使用清晰的中文名称和描述
5. 使用 test.describe() 组织同一功能的测试
6. 输出纯 TypeScript 代码，不含 markdown 标记、代码围栏或额外说明文字
7. 确保所有选择器都来自页面分析结果，不要臆造选择器
8. 对于需要登录或有权限的操作，生成的测试应包含前置导航步骤`;

/**
 * 推断页面类型
 */
function inferPageType(analysis: PageAnalysis): string {
  const { forms, tables, navigation, buttons, inputs } = analysis;

  // 检查是否为登录页
  for (const form of forms) {
    const fieldTypes = form.fields.map((f) => f.type.toLowerCase());
    const fieldNames = form.fields.map((f) => f.name.toLowerCase());
    const fieldPlaceholders = form.fields.map((f) => f.placeholder.toLowerCase());
    const allFieldText = [...fieldNames, ...fieldPlaceholders].join(' ');

    const hasPassword = fieldTypes.includes('password');
    const hasUsername =
      allFieldText.includes('用户') ||
      allFieldText.includes('账号') ||
      allFieldText.includes('user') ||
      allFieldText.includes('email') ||
      allFieldText.includes('邮箱') ||
      allFieldText.includes('手机') ||
      allFieldText.includes('phone') ||
      allFieldText.includes('login');

    if (hasPassword && (hasUsername || form.fields.length <= 3)) {
      return '登录页';
    }
  }

  // 检查是否为数据列表页
  if (tables.length > 0 && tables.some((t) => t.rowCount > 1)) {
    return '数据列表页';
  }

  // 检查是否为数据录入/表单页
  if (forms.length > 0 && forms.some((f) => f.fields.length >= 3)) {
    return '数据录入页';
  }

  // 检查是否为搜索页
  const allInputs = [...inputs, ...forms.flatMap((f) => f.fields)];
  const hasSearch = allInputs.some(
    (input) =>
      input.placeholder.includes('搜索') ||
      input.placeholder.includes('search') ||
      input.type === 'search'
  );
  if (hasSearch) {
    return '搜索页';
  }

  // 检查是否为导航/仪表盘页
  if (navigation.length >= 5) {
    return '导航/仪表盘页';
  }

  // 检查是否为内容展示页
  if (buttons.length <= 2 && forms.length === 0 && tables.length === 0) {
    return '内容展示页';
  }

  return '通用页面';
}

/**
 * 格式化表单信息为文本描述
 */
function formatForms(forms: FormInfo[]): string {
  if (forms.length === 0) return '无表单';
  return forms
    .map((form, i) => {
      const fields = form.fields
        .map(
          (f) =>
            `    - 字段: ${f.label || f.name || '未命名'} (类型: ${f.type}, 选择器: \`${f.selector}\`${f.required ? ', 必填' : ''}${f.placeholder ? `, 占位符: "${f.placeholder}"` : ''})`
        )
        .join('\n');
      const submit = form.submitButton
        ? `    - 提交按钮: "${form.submitButton.text}" (选择器: \`${form.submitButton.selector}\`)`
        : '    - 无明显提交按钮';
      return `  表单 ${i + 1} (选择器: \`${form.selector}\`):\n${fields}\n${submit}`;
    })
    .join('\n');
}

/**
 * 根据页面类型生成测试建议
 */
function buildTestSuggestions(
  pageType: string,
  analysis: PageAnalysis,
  testType: 'smoke' | 'regression'
): string {
  const suggestions: string[] = [];

  switch (pageType) {
    case '登录页':
      suggestions.push('- 使用正确的用户名和密码登录成功，验证跳转');
      suggestions.push('- 使用错误的密码登录失败，验证错误提示');
      if (testType === 'regression') {
        suggestions.push('- 不填写用户名直接提交，验证表单验证提示');
        suggestions.push('- 不填写密码直接提交，验证表单验证提示');
        suggestions.push('- 用户名和密码都为空，点击提交');
        suggestions.push('- 验证密码输入框为密码类型（输入内容不可见）');
        suggestions.push('- 验证页面标题和品牌标识正确显示');
        suggestions.push('- 检查"忘记密码"等辅助链接是否存在');
      }
      break;

    case '数据列表页':
      suggestions.push('- 页面加载后表格正确显示数据');
      suggestions.push('- 验证表头内容正确');
      if (testType === 'regression') {
        suggestions.push('- 如有分页，验证分页组件存在');
        suggestions.push('- 如有搜索框，输入关键词搜索');
        suggestions.push('- 如有排序，点击表头排序');
        suggestions.push('- 验证表格行数大于 0');
        suggestions.push('- 点击表格行查看详情（如有链接）');
      }
      break;

    case '数据录入页':
      suggestions.push('- 填写所有必填字段后提交表单');
      suggestions.push('- 验证提交后有成功反馈');
      if (testType === 'regression') {
        suggestions.push('- 不填必填字段直接提交，验证验证提示');
        suggestions.push('- 填写边界值数据');
        suggestions.push('- 填写后清空表单（如有重置按钮）');
        suggestions.push('- 验证各字段的占位符/提示文字正确');
      }
      break;

    case '导航/仪表盘页':
      suggestions.push('- 页面加载成功，核心元素可见');
      suggestions.push('- 导航菜单正确显示');
      if (testType === 'regression') {
        suggestions.push('- 点击各导航链接，验证跳转正确');
        suggestions.push('- 验证页面标题正确');
        if (analysis.buttons.length > 0) {
          suggestions.push('- 验证功能按钮可见且可点击');
        }
      }
      break;

    default:
      suggestions.push('- 页面加载成功，验证页面标题');
      suggestions.push('- 核心元素正确显示');
      if (testType === 'regression') {
        if (analysis.buttons.length > 0) {
          suggestions.push('- 验证所有按钮可见');
        }
        if (analysis.navigation.length > 0) {
          suggestions.push('- 验证导航链接可达');
        }
      }
      break;
  }

  return suggestions.join('\n');
}

/**
 * 构建 URL 分析场景的生成 Prompt
 */
export function buildUrlGeneratePrompt(
  analysis: PageAnalysis,
  testType: 'smoke' | 'regression',
  description?: string
): { systemPrompt: string; userPrompt: string } {
  const pageType = inferPageType(analysis);

  const typeGuide =
    testType === 'smoke'
      ? '生成 2-4 个核心冒烟测试用例，聚焦页面最关键的功能和正向流程。'
      : '生成 6-12 个全面回归测试用例，覆盖正向流程、异常流程、边界条件和页面元素验证。';

  const sections: string[] = [];

  // 页面概览
  sections.push('## 页面信息');
  sections.push(`- URL: ${analysis.url}`);
  sections.push(`- 标题: ${analysis.title || '(无标题)'}`);
  sections.push(`- 推断页面类型: ${pageType}`);
  sections.push(`- 加载耗时: ${analysis.meta.loadTime}ms`);
  if (analysis.meta.description) {
    sections.push(`- Meta 描述: ${analysis.meta.description}`);
  }
  sections.push('');

  // 交互元素
  sections.push('## 页面交互元素');
  sections.push('');
  sections.push(`### 表单 (${analysis.forms.length} 个)`);
  sections.push(formatForms(analysis.forms));
  sections.push('');

  if (analysis.buttons.length > 0) {
    sections.push(`### 按钮 (${analysis.buttons.length} 个)`);
    for (const btn of analysis.buttons.slice(0, 20)) {
      sections.push(`  - "${btn.text}" (类型: ${btn.type}, 选择器: \`${btn.selector}\`)`);
    }
    sections.push('');
  }

  if (analysis.navigation.length > 0) {
    sections.push(`### 导航链接 (${analysis.navigation.length} 个)`);
    for (const nav of analysis.navigation.slice(0, 20)) {
      sections.push(`  - "${nav.text}" → ${nav.href} (选择器: \`${nav.selector}\`)`);
    }
    sections.push('');
  }

  if (analysis.tables.length > 0) {
    sections.push(`### 表格 (${analysis.tables.length} 个)`);
    for (const table of analysis.tables) {
      sections.push(
        `  - 选择器: \`${table.selector}\`, 表头: [${table.headers.join(', ')}], 行数: ${table.rowCount}`
      );
    }
    sections.push('');
  }

  if (analysis.inputs.length > 0) {
    sections.push(`### 独立输入框 (${analysis.inputs.length} 个)`);
    for (const input of analysis.inputs.slice(0, 15)) {
      sections.push(
        `  - ${input.label || '未标记'} (类型: ${input.type}, 选择器: \`${input.selector}\`${input.placeholder ? `, 占位符: "${input.placeholder}"` : ''})`
      );
    }
    sections.push('');
  }

  // 测试建议
  sections.push('## 测试建议');
  sections.push(buildTestSuggestions(pageType, analysis, testType));
  sections.push('');

  // 约束
  sections.push('## 硬约束（必须遵守）');
  sections.push(`1. ${typeGuide}`);
  sections.push('2. 必须使用 import { test, expect } from \'@playwright/test\';');
  sections.push(`3. 每个测试以 page.goto('${analysis.url}') 开始`);
  sections.push('4. 使用上述分析结果中的选择器定位元素，将选择器转换为对应的 Playwright API 调用：');
  sections.push('   - `[placeholder="xxx"]` → `page.getByPlaceholder(\'xxx\')`');
  sections.push('   - `[aria-label="xxx"]` → `page.getByLabel(\'xxx\')`');
  sections.push('   - `role=button[name="xxx"]` → `page.getByRole(\'button\', { name: \'xxx\' })`');
  sections.push('   - `button:has-text("xxx")` → `page.getByRole(\'button\', { name: \'xxx\' })`');
  sections.push('   - `a:has-text("xxx")` → `page.getByRole(\'link\', { name: \'xxx\' })`');
  sections.push('   - 其他 CSS 选择器 → `page.locator(\'selector\')`');
  sections.push('5. 每个 test() 使用中文名称描述测试意图');
  sections.push('6. 使用 test.describe() 组织测试');
  sections.push('7. 输出纯 TypeScript 代码，不含 markdown 标记');
  sections.push('8. 对于需要填写的表单，使用合理的测试数据（中文优先）');
  sections.push('');

  // 用户补充描述
  if (description) {
    sections.push('## 用户补充说明');
    sections.push(description);
    sections.push('');
  }

  sections.push('## 生成任务');
  sections.push(`请为上述页面生成完整的 ${testType === 'smoke' ? '冒烟' : '回归'}测试文件。`);
  sections.push('输出完整的 .spec.ts 文件内容（从 import 语句开始）。');

  return {
    systemPrompt: URL_SYSTEM_PROMPT,
    userPrompt: sections.join('\n'),
  };
}
