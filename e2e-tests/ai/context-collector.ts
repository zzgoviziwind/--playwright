// AI 测试生成系统 - 项目上下文收集器

import fs from 'fs';
import path from 'path';
import type {
  PageObjectInfo,
  FixtureInfo,
  DataFixtureInfo,
  TestPatternInfo,
  ProjectContext,
} from './types';

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 收集所有 Page Object 的结构化信息
 */
export function collectPageObjects(
  pagesDir: string = path.join(PROJECT_ROOT, 'pages')
): PageObjectInfo[] {
  const results: PageObjectInfo[] = [];

  if (!fs.existsSync(pagesDir)) return results;

  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.page.ts'));

  for (const file of files) {
    const filePath = path.join(pagesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 提取类名
    const classMatch = content.match(/export class (\w+Page)/);
    if (!classMatch) continue;

    const className = classMatch[1];

    // 提取 Locator 属性和选择器
    const locators: PageObjectInfo['locators'] = [];
    const locatorDeclRegex = /readonly (\w+): Locator;/g;
    let locatorMatch: RegExpExecArray | null;
    while ((locatorMatch = locatorDeclRegex.exec(content)) !== null) {
      const name = locatorMatch[1];
      // 查找构造函数中的对应赋值
      const selectorRegex = new RegExp(
        `this\\.${name}\\s*=\\s*(page\\.(?:getByTestId|getByRole|getByText|locator)\\([^)]+\\))`,
      );
      const selectorMatch = content.match(selectorRegex);
      locators.push({
        name,
        selector: selectorMatch ? selectorMatch[1] : '(unknown)',
      });
    }

    // 提取方法签名和 JSDoc 注释
    const methods: PageObjectInfo['methods'] = [];
    const methodRegex =
      /(\/\*\*[\s\S]*?\*\/\s*)?async (\w+)\(([^)]*)\)(?:\s*:\s*Promise<([^>]+)>)?/g;
    let methodMatch: RegExpExecArray | null;
    while ((methodMatch = methodRegex.exec(content)) !== null) {
      const jsdoc = methodMatch[1] || '';
      const name = methodMatch[2];
      const params = methodMatch[3].trim();
      const returnType = methodMatch[4] || 'void';

      // 从 JSDoc 提取描述
      const descMatch = jsdoc.match(/\*\s*(.+?)(?:\n|\*\/)/);
      const description = descMatch ? descMatch[1].trim() : '';

      // 跳过构造函数
      if (name === 'constructor') continue;

      methods.push({ name, params, returnType: `Promise<${returnType}>`, description });
    }

    results.push({
      className,
      filePath: `pages/${file}`,
      locators,
      methods,
    });
  }

  return results;
}

/**
 * 收集 Auth Fixture 信息
 */
export function collectAuthFixtures(
  fixturesDir: string = path.join(PROJECT_ROOT, 'fixtures')
): FixtureInfo[] {
  const results: FixtureInfo[] = [];
  const authFixturePath = path.join(fixturesDir, 'auth.fixture.ts');

  if (!fs.existsSync(authFixturePath)) return results;

  const content = fs.readFileSync(authFixturePath, 'utf-8');

  // 提取 RoleFixtures 类型中的字段
  const roleMap: Record<string, string> = {
    doctorPage: '已登录的医生角色页面',
    auditorPage: '已登录的审核医生角色页面',
    adminPage: '已登录的管理员角色页面',
  };

  const fixtureRegex = /(\w+Page)\s*:\s*(?:async\s*)?\(\s*\{[^}]*\}\s*,\s*use\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = fixtureRegex.exec(content)) !== null) {
    const name = match[1];
    results.push({
      name,
      type: 'Page',
      description: roleMap[name] || `${name} 角色页面`,
      sourceFile: 'fixtures/auth.fixture.ts',
    });
  }

  // 如果正则未匹配到，用已知的 fixture 名称作为 fallback
  if (results.length === 0) {
    for (const [name, desc] of Object.entries(roleMap)) {
      if (content.includes(name)) {
        results.push({
          name,
          type: 'Page',
          description: desc,
          sourceFile: 'fixtures/auth.fixture.ts',
        });
      }
    }
  }

  return results;
}

/**
 * 收集 Data Fixture 信息
 */
export function collectDataFixtures(
  fixturesDir: string = path.join(PROJECT_ROOT, 'fixtures')
): DataFixtureInfo[] {
  const results: DataFixtureInfo[] = [];
  const dataFixturePath = path.join(fixturesDir, 'data.fixture.ts');

  if (!fs.existsSync(dataFixturePath)) return results;

  const content = fs.readFileSync(dataFixturePath, 'utf-8');

  // 提取 DataFixtures 类型中的字段和 JSDoc
  const fieldRegex =
    /\/\*\*\s*([\s\S]*?)\*\/\s*(\w+)\s*:\s*string/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(content)) !== null) {
    const jsdoc = match[1].replace(/\s*\*\s*/g, ' ').trim();
    const name = match[2];
    results.push({
      name,
      type: 'string (reportId)',
      description: jsdoc,
      sourceFile: 'fixtures/data.fixture.ts',
      setupDescription: jsdoc,
      autoCleanup: content.includes(`deleteTestReport`),
    });
  }

  // Fallback：如果 JSDoc 正则未匹配，直接搜索已知名称
  if (results.length === 0) {
    const knownFixtures: Record<string, string> = {
      draftReport: '自动创建一条草稿报告，测试结束后自动清理',
      pendingAuditReport: '自动创建一条待审核报告',
      auditedReport: '自动创建一条已审核报告',
    };
    for (const [name, desc] of Object.entries(knownFixtures)) {
      if (content.includes(name)) {
        results.push({
          name,
          type: 'string (reportId)',
          description: desc,
          sourceFile: 'fixtures/data.fixture.ts',
          setupDescription: desc,
          autoCleanup: true,
        });
      }
    }
  }

  return results;
}

/**
 * 收集现有测试文件的模式信息
 */
export function collectTestPatterns(
  testsDir: string = path.join(PROJECT_ROOT, 'tests')
): TestPatternInfo[] {
  const results: TestPatternInfo[] = [];

  if (!fs.existsSync(testsDir)) return results;

  // 选取代表性文件作为 few-shot example
  const exemplarFiles = [
    'smoke/report-edit.spec.ts',
    'regression/report-workflow.spec.ts',
  ];

  for (const relPath of exemplarFiles) {
    const filePath = path.join(testsDir, relPath);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');

    // 提取 import 语句
    const imports: string[] = [];
    const importRegex = /^import .+$/gm;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importRegex.exec(content)) !== null) {
      imports.push(importMatch[0]);
    }

    // 提取使用的 fixture 名称
    const fixturesUsed: string[] = [];
    const fixtureRegex = /async\s*\(\s*\{\s*([^}]+)\s*\}\s*\)/g;
    let fixtureMatch: RegExpExecArray | null;
    while ((fixtureMatch = fixtureRegex.exec(content)) !== null) {
      const names = fixtureMatch[1].split(',').map((s) => s.trim());
      for (const name of names) {
        if (name && !fixturesUsed.includes(name)) {
          fixturesUsed.push(name);
        }
      }
    }

    // 提取使用的 PO 类名
    const pageObjectsUsed: string[] = [];
    const poRegex = /new (\w+Page)\(/g;
    let poMatch: RegExpExecArray | null;
    while ((poMatch = poRegex.exec(content)) !== null) {
      if (!pageObjectsUsed.includes(poMatch[1])) {
        pageObjectsUsed.push(poMatch[1]);
      }
    }

    results.push({
      filePath: `tests/${relPath}`,
      imports,
      fixturesUsed,
      pageObjectsUsed,
      fullContent: content,
    });
  }

  return results;
}

/**
 * 收集测试数据 schema
 */
export function collectTestData(
  dataDir: string = path.join(PROJECT_ROOT, 'data')
): Array<{ filePath: string; summary: string }> {
  const results: Array<{ filePath: string; summary: string }> = [];

  if (!fs.existsSync(dataDir)) return results;

  // users.json
  const usersPath = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const roles = Object.keys(users);
    const summaryParts = roles.map((role) => {
      const defaultUser = users[role]?.default;
      return `${role}: 默认账号 ${defaultUser?.username || '(unknown)'}`;
    });
    results.push({
      filePath: 'data/users.json',
      summary: `系统用户 - ${summaryParts.join('; ')}`,
    });
  }

  // exam-items.json
  const examPath = path.join(dataDir, 'exam-items.json');
  if (fs.existsSync(examPath)) {
    const items = JSON.parse(fs.readFileSync(examPath, 'utf-8')) as Array<{
      code: string;
      name: string;
      unit: string;
      normalRange: string;
      required: boolean;
      sampleNormal: string;
      sampleAbnormal: string;
    }>;
    const required = items.filter((i) => i.required);
    const summaryLines = required.map(
      (i) =>
        `${i.name}(${i.code}): 正常=${i.sampleNormal}${i.unit}, 异常=${i.sampleAbnormal}${i.unit}, 范围=${i.normalRange}`
    );
    results.push({
      filePath: 'data/exam-items.json',
      summary: `必填体检项目:\n${summaryLines.join('\n')}`,
    });
  }

  // reports.json
  const reportsPath = path.join(dataDir, 'reports.json');
  if (fs.existsSync(reportsPath)) {
    const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf-8'));
    const smokeKeys = Object.keys(reports.smoke || {});
    const regressionKeys = Object.keys(reports.regression || {});
    results.push({
      filePath: 'data/reports.json',
      summary: `测试报告样本 - smoke: [${smokeKeys.join(', ')}], regression: [${regressionKeys.join(', ')}]`,
    });
  }

  return results;
}

/**
 * 收集工具函数签名
 */
export function collectUtilFunctions(
  utilsDir: string = path.join(PROJECT_ROOT, 'utils')
): Array<{ name: string; signature: string; description: string }> {
  const results: Array<{ name: string; signature: string; description: string }> = [];

  if (!fs.existsSync(utilsDir)) return results;

  const files = fs.readdirSync(utilsDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const filePath = path.join(utilsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 提取 export function / export async function 及其前面的 JSDoc
    const funcRegex =
      /(\/\*\*[\s\S]*?\*\/\s*)?export\s+(?:async\s+)?function\s+(\w+)\(([^)]*)\)(?:\s*:\s*(\S+))?/g;
    let match: RegExpExecArray | null;
    while ((match = funcRegex.exec(content)) !== null) {
      const jsdoc = match[1] || '';
      const name = match[2];
      const params = match[3].trim();
      const returnType = match[4] || 'void';

      const descMatch = jsdoc.match(/\*\s*(.+?)(?:\n|\*\/)/);
      const description = descMatch ? descMatch[1].trim() : '';

      results.push({
        name,
        signature: `${name}(${params}): ${returnType}`,
        description,
      });
    }
  }

  return results;
}

/**
 * 聚合收集完整项目上下文
 */
export function collectFullContext(): ProjectContext {
  return {
    pageObjects: collectPageObjects(),
    authFixtures: collectAuthFixtures(),
    dataFixtures: collectDataFixtures(),
    testPatterns: collectTestPatterns(),
    testDataSchemas: collectTestData(),
    utilFunctions: collectUtilFunctions(),
  };
}
