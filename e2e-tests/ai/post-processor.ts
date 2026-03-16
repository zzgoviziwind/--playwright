// AI 测试生成系统 - 后处理与校验

import type { ProjectContext, ProcessResult } from './types';

/**
 * 对 LLM 生成的代码进行后处理和校验
 */
export function processGeneratedCode(
  code: string,
  context: ProjectContext,
  targetDir: string
): ProcessResult {
  const warnings: string[] = [];
  let processed = code;

  // 1. 清理 Markdown 标记
  processed = cleanMarkdown(processed);

  // 2. 修正 Import 路径
  processed = fixImportPaths(processed, targetDir);

  // 3. 修正 Fixture Import
  processed = fixFixtureImport(processed, context);

  // 4. 校验 PO 引用
  const poWarnings = validatePOReferences(processed, context);
  warnings.push(...poWarnings);

  // 5. 校验方法调用
  const methodWarnings = validateMethodCalls(processed, context);
  warnings.push(...methodWarnings);

  // 6. 格式标准化
  processed = normalizeFormat(processed);

  // 7. 括号匹配检查
  const bracketValid = checkBrackets(processed);
  if (!bracketValid) {
    warnings.push('括号不匹配，生成的代码可能不完整，建议手动检查');
  }

  const isValid = bracketValid && warnings.filter((w) => w.startsWith('[错误]')).length === 0;

  return { code: processed, warnings, isValid };
}

/**
 * 清理 markdown 代码块标记
 */
function cleanMarkdown(code: string): string {
  // 移除开头的 ```typescript 或 ```ts
  let cleaned = code.replace(/^```(?:typescript|ts)?\s*\n/gm, '');
  // 移除结尾的 ```
  cleaned = cleaned.replace(/\n```\s*$/gm, '');
  // 移除行内的 ``` （可能出现在中间）
  cleaned = cleaned.replace(/^```\s*$/gm, '');

  // 如果仍以非代码文字开头（LLM 添加的说明），提取第一个 import 开始的部分
  const importIndex = cleaned.indexOf('import ');
  if (importIndex > 0) {
    // 检查 import 之前是否有非空行（说明文字）
    const prefix = cleaned.substring(0, importIndex).trim();
    if (prefix && !prefix.includes('//')) {
      cleaned = cleaned.substring(importIndex);
    }
  }

  return cleaned.trim();
}

/**
 * 修正 import 路径
 */
function fixImportPaths(code: string, targetDir: string): string {
  let fixed = code;

  // 计算相对路径深度：tests/smoke/ 或 tests/regression/ → ../../
  const relPrefix = '../../';

  // 修正 @pages/ 别名为相对路径
  fixed = fixed.replace(
    /from\s+['"]@pages\/([^'"]+)['"]/g,
    `from '${relPrefix}pages/$1'`
  );

  // 修正 @fixtures/ 别名
  fixed = fixed.replace(
    /from\s+['"]@fixtures\/([^'"]+)['"]/g,
    `from '${relPrefix}fixtures/$1'`
  );

  // 修正 @utils/ 别名
  fixed = fixed.replace(
    /from\s+['"]@utils\/([^'"]+)['"]/g,
    `from '${relPrefix}utils/$1'`
  );

  // 修正 @data/ 别名
  fixed = fixed.replace(
    /from\s+['"]@data\/([^'"]+)['"]/g,
    `from '${relPrefix}data/$1'`
  );

  // 确保 .page 文件路径没有 .ts 后缀（Playwright 的 import 不需要）
  // 但如果已经有了也不需要移除

  return fixed;
}

/**
 * 修正 Fixture Import：如果使用了 data fixture 但 import 指向 auth.fixture
 */
function fixFixtureImport(code: string, context: ProjectContext): string {
  const dataFixtureNames = context.dataFixtures.map((f) => f.name);

  // 检查代码中是否使用了 data fixture
  const usesDataFixture = dataFixtureNames.some((name) => code.includes(name));

  if (usesDataFixture) {
    // 如果 import 指向 auth.fixture，改为 data.fixture
    return code.replace(
      /from\s+['"]([^'"]*?)auth\.fixture['"]/g,
      (match, prefix) => `from '${prefix}data.fixture'`
    );
  }

  return code;
}

/**
 * 校验 PO 类引用是否有效
 */
function validatePOReferences(code: string, context: ProjectContext): string[] {
  const warnings: string[] = [];
  const validClassNames = context.pageObjects.map((po) => po.className);

  const poRegex = /new (\w+Page)\(/g;
  let match: RegExpExecArray | null;
  while ((match = poRegex.exec(code)) !== null) {
    const className = match[1];
    if (!validClassNames.includes(className)) {
      warnings.push(
        `[警告] 使用了未知的 Page Object 类: ${className}，项目中可用的类: ${validClassNames.join(', ')}`
      );
    }
  }

  return warnings;
}

/**
 * 校验 PO 方法调用是否有效
 */
function validateMethodCalls(code: string, context: ProjectContext): string[] {
  const warnings: string[] = [];

  for (const po of context.pageObjects) {
    // 检查代码中是否实例化了该 PO
    const varRegex = new RegExp(`(\\w+)\\s*=\\s*new ${po.className}\\(`);
    const varMatch = code.match(varRegex);
    if (!varMatch) continue;

    const varName = varMatch[1];
    const validMethods = po.methods.map((m) => m.name);
    const validLocators = po.locators.map((l) => l.name);
    const validMembers = [...validMethods, ...validLocators];

    // 查找该变量的所有属性访问
    const memberRegex = new RegExp(`${varName}\\.(\\w+)`, 'g');
    let memberMatch: RegExpExecArray | null;
    while ((memberMatch = memberRegex.exec(code)) !== null) {
      const member = memberMatch[1];
      // 跳过 page 属性（PO 基类的属性）
      if (member === 'page') continue;
      if (!validMembers.includes(member)) {
        warnings.push(
          `[警告] ${po.className} 不存在成员 '${member}'，可用成员: ${validMembers.join(', ')}`
        );
      }
    }
  }

  return warnings;
}

/**
 * 格式标准化
 */
function normalizeFormat(code: string): string {
  let normalized = code;

  // 添加 AI 生成标记注释（如果没有的话）
  if (!normalized.startsWith('//')) {
    const timestamp = new Date().toISOString().split('T')[0];
    normalized = `// AI 生成 - ${timestamp}\n\n${normalized}`;
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
  // 移除字符串和注释内容，避免误判
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
