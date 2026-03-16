#!/usr/bin/env node
// AI 自动化测试 CLI - 完整流水线入口

import { Command } from 'commander';
import { autoTestPipeline, printTestSummary } from './agents/auto-test-pipeline';

const program = new Command();

program
  .name('ai-test-pipeline')
  .description('AI 驱动的自动化测试流水线 - 生成、执行、自愈')
  .version('1.0.0');

program
  .command('run')
  .description('运行完整的自动化测试流水线（生成 + 执行 + 自愈）')
  .requiredOption('--requirement <desc>', '需求描述（中文）')
  .option('--type <type>', '测试类型：smoke 或 regression', 'smoke')
  .option('--output <file>', '输出文件名')
  .option('--max-retries <n>', '最大自愈重试次数', '1')
  .option('--headed', '使用有头模式运行')
  .option('--slow-mo <ms>', '慢动作延迟（毫秒）', '0')
  .option('--no-healing', '禁用自动修复')
  .action(async (opts) => {
    console.log('🚀 启动 AI 自动化测试流水线...\n');

    const result = await autoTestPipeline({
      requirement: opts.requirement,
      testType: opts.type,
      projectRoot: process.cwd(),
      maxRetries: parseInt(opts.maxRetries, 10),
      enableSelfHealing: opts.healing !== false,
      headed: opts.headed || false,
      slowMo: parseInt(opts.slowMo, 10),
      outputDir: opts.output,
    });

    printTestSummary(result);
    process.exit(result.success ? 0 : 1);
  });

program
  .command('plan')
  .description('仅生成测试计划（不生成代码）')
  .requiredOption('--requirement <desc>', '需求描述（中文）')
  .action(async (opts) => {
    console.log('📋 生成测试计划...\n');
    // 简化版本，实际应调用 testPlannerAgent
    console.log('测试计划功能需要完整上下文，请使用 run 命令');
  });

program
  .command('heal')
  .description('修复失败的测试文件')
  .requiredOption('--file <path>', '失败的测试文件')
  .option('--error <msg>', '错误信息')
  .action(async (opts) => {
    console.log('🔧 开始修复测试...\n');
    console.log('文件:', opts.file);
    console.log('错误:', opts.error || '未提供');
    // 简化版本，实际应调用 selfHealingAgent
  });

program.parse();
