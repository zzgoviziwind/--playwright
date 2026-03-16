#!/usr/bin/env node
// AI 测试生成系统 - CLI 入口

import { Command } from 'commander';
import { generate, modify, extend } from './smart-generator';

const program = new Command();

program
  .name('ai-test')
  .description('AI 驱动的 Playwright 测试生成工具')
  .version('1.0.0');

program
  .command('generate')
  .description('根据功能描述生成新的测试文件')
  .requiredOption('--feature <description>', '功能描述（中文或英文）')
  .requiredOption('--type <type>', '测试类型: smoke 或 regression', validateType)
  .option('--output <filename>', '输出文件名（可选，自动生成）')
  .option('--dry-run', '仅打印生成的代码，不写入文件')
  .action(async (opts) => {
    try {
      await generate({
        feature: opts.feature,
        type: opts.type,
        output: opts.output,
        dryRun: opts.dryRun || false,
      });
    } catch (error) {
      console.error(`\n[错误] ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('modify')
  .description('修改现有测试文件')
  .requiredOption('--file <path>', '要修改的测试文件路径')
  .requiredOption('--change <description>', '变更描述')
  .action(async (opts) => {
    try {
      await modify({
        file: opts.file,
        change: opts.change,
      });
    } catch (error) {
      console.error(`\n[错误] ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('extend')
  .description('在现有测试文件中追加测试用例')
  .requiredOption('--file <path>', '要扩展的测试文件路径')
  .requiredOption('--add <description>', '要新增的用例描述')
  .action(async (opts) => {
    try {
      await extend({
        file: opts.file,
        add: opts.add,
      });
    } catch (error) {
      console.error(`\n[错误] ${(error as Error).message}`);
      process.exit(1);
    }
  });

function validateType(value: string): string {
  if (value !== 'smoke' && value !== 'regression') {
    throw new Error('--type 必须是 smoke 或 regression');
  }
  return value;
}

program.parse();
