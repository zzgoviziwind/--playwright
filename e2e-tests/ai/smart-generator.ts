// AI 测试生成系统 - 核心编排引擎

import fs from 'fs';
import path from 'path';
import { callLLM, extractCodeBlock } from './llm-client';
import { collectFullContext } from './context-collector';
import {
  buildGeneratePrompt,
  buildModifyPrompt,
  buildExtendPrompt,
} from './prompt-templates';
import { processGeneratedCode } from './post-processor';
import type {
  GenerateOptions,
  ModifyOptions,
  ExtendOptions,
  ProjectContext,
} from './types';

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** feature 关键词到 PO 类名的映射 */
const KEYWORD_PO_MAP: Record<string, string[]> = {
  '登录|login': ['LoginPage'],
  '编辑|保存|填写|edit': ['ReportEditPage'],
  '审核|通过|退回|audit': ['AuditPage'],
  '列表|搜索|查询|筛选|list|query': ['ReportListPage'],
  '详情|查看|发布|作废|detail|view|publish': ['ReportDetailPage'],
  '报告|report': ['ReportListPage', 'ReportEditPage', 'ReportDetailPage'],
  '工作流|流转|workflow': ['ReportEditPage', 'AuditPage', 'ReportDetailPage'],
  '权限|permission': ['ReportEditPage', 'AuditPage', 'ReportDetailPage'],
};

/**
 * 根据 feature 描述推断最相关的 PO 类名
 */
function inferRelevantPOs(feature: string): string[] {
  const matched = new Set<string>();
  for (const [keywords, poNames] of Object.entries(KEYWORD_PO_MAP)) {
    const parts = keywords.split('|');
    if (parts.some((kw) => feature.toLowerCase().includes(kw.toLowerCase()))) {
      for (const name of poNames) {
        matched.add(name);
      }
    }
  }
  return matched.size > 0 ? Array.from(matched) : [];
}

/**
 * 从 feature 描述生成文件名
 */
function generateFileName(feature: string, testType: string): string {
  // 简单的中文→拼音/英文映射
  const nameMap: Record<string, string> = {
    '登录': 'login',
    '报告编辑': 'report-edit',
    '报告列表': 'report-list',
    '报告详情': 'report-detail',
    '报告审核': 'report-audit',
    '审核': 'audit',
    '发布': 'report-publish',
    '权限': 'permission',
    '查询': 'report-query',
    '工作流': 'report-workflow',
    '流转': 'report-workflow',
    '搜索': 'report-search',
    '编辑': 'report-edit',
  };

  let baseName = '';
  for (const [cn, en] of Object.entries(nameMap)) {
    if (feature.includes(cn)) {
      baseName = en;
      break;
    }
  }

  if (!baseName) {
    // Fallback：使用时间戳
    baseName = `test-${Date.now()}`;
  }

  return `${baseName}-ai.spec.ts`;
}

/**
 * 打印进度信息到控制台
 */
function log(tag: string, message: string): void {
  console.log(`[${tag}] ${message}`);
}

/**
 * generate 命令：生成新测试文件
 */
export async function generate(options: GenerateOptions): Promise<string> {
  log('扫描', '正在收集项目上下文...');
  const context = collectFullContext();

  log('扫描', `  - 发现 ${context.pageObjects.length} 个 Page Object 类`);
  log('扫描', `  - 发现 ${context.authFixtures.length} 个角色 Fixture + ${context.dataFixtures.length} 个数据 Fixture`);
  log('扫描', `  - 分析了 ${context.testPatterns.length} 个现有测试文件`);
  log('扫描', `  - 加载了 ${context.testDataSchemas.length} 个测试数据文件`);

  const relevantPOs = inferRelevantPOs(options.feature);
  log('生成', '正在调用 AI 生成测试代码...');
  if (relevantPOs.length > 0) {
    log('生成', `  - 相关 PO: ${relevantPOs.join(', ')}`);
  }
  log('生成', `  - 测试类型: ${options.type}`);

  const { systemPrompt, userPrompt } = buildGeneratePrompt(
    options.feature,
    options.type,
    context
  );

  const rawCode = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 8192,
  });

  const targetDir = options.type === 'smoke' ? 'tests/smoke' : 'tests/regression';
  const result = processGeneratedCode(extractCodeBlock(rawCode), context, targetDir);

  // 输出警告
  for (const warning of result.warnings) {
    log('校验', warning);
  }

  if (options.dryRun) {
    console.log('\n--- 生成的代码 (dry-run) ---\n');
    console.log(result.code);
    console.log('\n--- dry-run 结束 ---');
    return result.code;
  }

  // 确定输出路径
  const fileName = options.output || generateFileName(options.feature, options.type);
  const outputDir = path.join(PROJECT_ROOT, targetDir);
  const outputPath = path.join(outputDir, fileName);

  // 确保目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 检查文件是否已存在
  if (fs.existsSync(outputPath)) {
    log('警告', `文件已存在: ${outputPath}，将覆盖`);
  }

  fs.writeFileSync(outputPath, result.code, 'utf-8');

  const testCount = (result.code.match(/\btest\s*\(/g) || []).length;

  log('完成', `文件已生成: ${targetDir}/${fileName}`);
  log('完成', `  - 用例数: ${testCount}`);
  log('提示', `运行测试: npx playwright test ${targetDir}/${fileName}`);

  return result.code;
}

/**
 * modify 命令：修改现有测试文件
 */
export async function modify(options: ModifyOptions): Promise<string> {
  const filePath = path.resolve(PROJECT_ROOT, options.file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${options.file}`);
  }

  const existingCode = fs.readFileSync(filePath, 'utf-8');

  log('扫描', '正在收集项目上下文...');
  const context = collectFullContext();

  log('修改', `正在调用 AI 修改测试: ${options.file}`);
  log('修改', `  - 变更描述: ${options.change}`);

  const { systemPrompt, userPrompt } = buildModifyPrompt(
    existingCode,
    options.change,
    context
  );

  const rawCode = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 8192,
  });

  // 根据文件位置确定 targetDir
  const targetDir = options.file.includes('smoke') ? 'tests/smoke' : 'tests/regression';
  const result = processGeneratedCode(extractCodeBlock(rawCode), context, targetDir);

  for (const warning of result.warnings) {
    log('校验', warning);
  }

  // 备份原文件
  const backupPath = filePath + '.bak';
  fs.writeFileSync(backupPath, existingCode, 'utf-8');
  log('备份', `原文件已备份: ${path.basename(backupPath)}`);

  // 写入修改后的文件
  fs.writeFileSync(filePath, result.code, 'utf-8');

  log('完成', `文件已修改: ${options.file}`);
  log('提示', `运行测试: npx playwright test ${options.file}`);

  return result.code;
}

/**
 * extend 命令：扩展现有测试文件
 */
export async function extend(options: ExtendOptions): Promise<string> {
  const filePath = path.resolve(PROJECT_ROOT, options.file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${options.file}`);
  }

  const existingCode = fs.readFileSync(filePath, 'utf-8');

  log('扫描', '正在收集项目上下文...');
  const context = collectFullContext();

  log('扩展', `正在调用 AI 扩展测试: ${options.file}`);
  log('扩展', `  - 新增描述: ${options.add}`);

  const { systemPrompt, userPrompt } = buildExtendPrompt(
    existingCode,
    options.add,
    context
  );

  const rawCode = await callLLM(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 8192,
  });

  const targetDir = options.file.includes('smoke') ? 'tests/smoke' : 'tests/regression';
  const result = processGeneratedCode(extractCodeBlock(rawCode), context, targetDir);

  for (const warning of result.warnings) {
    log('校验', warning);
  }

  // 备份原文件
  const backupPath = filePath + '.bak';
  fs.writeFileSync(backupPath, existingCode, 'utf-8');
  log('备份', `原文件已备份: ${path.basename(backupPath)}`);

  // 写入修改后的文件
  fs.writeFileSync(filePath, result.code, 'utf-8');

  const oldCount = (existingCode.match(/\btest\s*\(/g) || []).length;
  const newCount = (result.code.match(/\btest\s*\(/g) || []).length;

  log('完成', `文件已扩展: ${options.file}`);
  log('完成', `  - 原有用例: ${oldCount}, 扩展后: ${newCount}, 新增: ${newCount - oldCount}`);
  log('提示', `运行测试: npx playwright test ${options.file}`);

  return result.code;
}
