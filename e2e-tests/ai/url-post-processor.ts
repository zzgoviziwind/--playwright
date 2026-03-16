// AI 测试生成系统 - URL 场景后处理与校验
// 针对 URL 分析生成的测试代码，不校验 PO 引用

import type { ProcessResult } from './types';

/**
 * 对 URL 场景 LLM 生成的代码进行后处理和校验
 */
export function processUrlGeneratedCode(code: string): ProcessResult {
  const warnings: string[] = [];
  let processed = code;

  // 1. 清理 Markdown 标记
  processed = cleanMarkdown(processed);

  // 2. 校验 import 语句
  const importWarnings = validateImports(processed);
  warnings.push(...importWarnings);

  // 3. 校验 page.goto 调用
  if (!processed.includes('page.goto(')) {
    warnings.push('[警告] 代码中未发现 page.goto() 调用，测试可能无法正确导航到目标页面');
  }

  // 4. 格式标准化
  processed = normalizeFormat(processed);

  // 5. 括号匹配检查
  const bracketValid = checkBrackets(processed);
  if (!bracketValid) {
    warnings.push('[错误] 括号不匹配，生成的代码可能不完整，建议手动检查');
  }

  const isValid =
    bracketValid && warnings.filter((w) => w.startsWith('[错误]')).length === 0;

  return { code: processed, warnings, isValid };
}

/**
 * 清理 markdown 代码块标记
 */
function cleanMarkdown(code: string): string {
  let cleaned = code.replace(/^```(?:typescript|ts)?\s*\n/gm, '');
  cleaned = cleaned.replace(/\n```\s*$/gm, '');
  cleaned = cleaned.replace(/^```\s*$/gm, '');

  // 如果以非代码文字开头，提取第一个 import 开始的部分
  const importIndex = cleaned.indexOf('import ');
  if (importIndex > 0) {
    const prefix = cleaned.substring(0, importIndex).trim();
    if (prefix && !prefix.startsWith('//')) {
      cleaned = cleaned.substring(importIndex);
    }
  }

  return cleaned.trim();
}

/**
 * 校验 import 语句
 */
function validateImports(code: string): string[] {
  const warnings: string[] = [];

  // 检查是否有 @playwright/test 导入
  if (!code.includes("from '@playwright/test'") && !code.includes('from "@playwright/test"')) {
    warnings.push('[警告] 未找到 @playwright/test 导入，将自动添加');
  }

  // 检查是否误用了 PO 导入
  if (code.includes('from \'../../pages/') || code.includes('from "../../pages/')) {
    warnings.push('[警告] 检测到 Page Object 导入，URL 分析模式不应使用 PO 类');
  }

  // 检查是否误用了 fixture 导入
  if (code.includes('from \'../../fixtures/') || code.includes('from "../../fixtures/')) {
    warnings.push('[警告] 检测到 Fixture 导入，URL 分析模式不应使用自定义 Fixture');
  }

  return warnings;
}

/**
 * 格式标准化
 */
function normalizeFormat(code: string): string {
  let normalized = code;

  // 确保有 @playwright/test 导入（如果缺失则添加）
  if (
    !normalized.includes("from '@playwright/test'") &&
    !normalized.includes('from "@playwright/test"')
  ) {
    normalized = `import { test, expect } from '@playwright/test';\n\n${normalized}`;
  }

  // 添加 AI 生成标记注释
  if (!normalized.startsWith('//')) {
    const timestamp = new Date().toISOString().split('T')[0];
    normalized = `// AI 生成 (URL 分析) - ${timestamp}\n\n${normalized}`;
  }

  // 确保文件以换行符结尾
  if (!normalized.endsWith('\n')) {
    normalized += '\n';
  }

  return normalized;
}

/**
 * 基础括号匹配检查
 */
function checkBrackets(code: string): boolean {
  const stripped = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/`[^`]*`/g, '');

  let curly = 0;
  let paren = 0;

  for (const ch of stripped) {
    if (ch === '{') curly++;
    if (ch === '}') curly--;
    if (ch === '(') paren++;
    if (ch === ')') paren--;

    if (curly < 0 || paren < 0) return false;
  }

  return curly === 0 && paren === 0;
}
