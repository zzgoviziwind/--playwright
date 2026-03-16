// AI 测试生成系统 - 主编排引擎
// 整合 5 个 Agent 形成完整的自动化测试流程

import fs from 'fs';
import path from 'path';
import { collectFullContext } from '../context-collector';
import type { ProjectContext } from '../types';
import type { TestPlan } from './test-planner.agent';
import type { GenerationResult } from './test-generator.agent';
import type { TestSuiteResult, TestResult } from './test-executor.agent';
import type { FailureAnalysis } from './failure-analysis.agent';
import type { HealingResult } from './self-healing.agent';

// ============ Agent 导入 ============
import {
  testPlannerAgent,
  type TestPlannerInput,
} from './test-planner.agent';
import {
  testGeneratorAgent,
  type TestGeneratorInput,
} from './test-generator.agent';
import {
  testExecutorAgent,
  type TestExecutorConfig,
} from './test-executor.agent';
import {
  failureAnalysisAgent,
  type FailureAnalysisInput,
} from './failure-analysis.agent';
import {
  selfHealingAgent,
  type SelfHealingInput,
  validateHealedCode,
} from './self-healing.agent';

// ============ 类型定义 ============

/**
 * 自动化测试流水线配置
 */
export interface AutoTestPipelineConfig {
  /** 需求描述 */
  requirement: string;
  /** 测试类型 */
  testType: 'smoke' | 'regression';
  /** 项目根目录 */
  projectRoot: string;
  /** 输出目录 */
  outputDir?: string;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用自愈 */
  enableSelfHealing?: boolean;
  /** 是否 headed 模式 */
  headed?: boolean;
  /** 慢动作延迟 */
  slowMo?: number;
}

/**
 * 流水线执行结果
 */
export interface PipelineResult {
  /** 是否成功 */
  success: boolean;
  /** 测试计划 */
  testPlan?: TestPlan;
  /** 生成结果 */
  generationResult?: GenerationResult;
  /** 执行结果 */
  executionResult?: TestSuiteResult;
  /** 失败分析（如有失败） */
  failureAnalyses?: FailureAnalysis[];
  /** 修复结果（如有修复） */
  healingResults?: HealingResult[];
  /** 执行日志 */
  logs: string[];
}

/**
 * 流水线步骤枚举
 */
export enum PipelineStep {
  PLANNING = '📋 测试计划',
  GENERATION = '🤖 代码生成',
  EXECUTION = '▶️ 测试执行',
  ANALYSIS = '🔍 失败分析',
  HEALING = '🔧 自动修复',
  VERIFICATION = '✅ 验证修复',
}

// ============ 主流水线 ============

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * AI 自动化测试流水线
 *
 * 流程：
 * 1. Test Planner -> 生成测试计划
 * 2. Test Generator -> 生成测试代码
 * 3. Test Executor -> 执行测试
 * 4. [如果失败] Failure Analyzer -> 分析失败原因
 * 5. [如果启用] Self-Healing Agent -> 自动修复代码
 * 6. [如果修复] 重新执行测试验证
 *
 * @param config - 配置参数
 */
export async function autoTestPipeline(
  config: AutoTestPipelineConfig
): Promise<PipelineResult> {
  const logs: string[] = [];
  const maxRetries = config.maxRetries ?? 1;
  const enableSelfHealing = config.enableSelfHealing ?? true;

  let testPlan: TestPlan | undefined;
  let generationResult: GenerationResult | undefined;
  let executionResult: TestSuiteResult | undefined;
  const failureAnalyses: FailureAnalysis[] = [];
  const healingResults: HealingResult[] = [];

  try {
    // ==================== Step 1: 测试计划 ====================
    log(logs, PipelineStep.PLANNING, `开始分析需求：${config.requirement}`);

    const context = collectFullContext();
    log(logs, PipelineStep.PLANNING, `已收集 ${context.pageObjects.length} 个 Page Object`);
    log(logs, PipelineStep.PLANNING, `已收集 ${context.authFixtures.length} 个角色 Fixture`);

    const plannerInput: TestPlannerInput = {
      requirement: config.requirement,
      testType: config.testType,
    };

    testPlan = await testPlannerAgent(plannerInput, context);
    log(
      logs,
      PipelineStep.PLANNING,
      `生成 ${testPlan.scenarios.length} 个测试场景`
    );
    log(logs, PipelineStep.PLANNING, `推荐使用 Fixture: ${testPlan.recommendedFixtures.join(', ') || '无'}`);
    log(
      logs,
      PipelineStep.PLANNING,
      `推荐使用 Page Object: ${testPlan.recommendedPageObjects.join(', ') || '无'}`
    );

    // ==================== Step 2: 代码生成 ====================
    log(logs, PipelineStep.GENERATION, '开始生成测试代码...');

    const generatorInput: TestGeneratorInput = {
      testPlan,
    };

    generationResult = await testGeneratorAgent(generatorInput, context);
    log(
      logs,
      PipelineStep.GENERATION,
      `生成 ${generationResult.testCount} 个测试用例`
    );

    if (generationResult.warnings.length > 0) {
      generationResult.warnings.forEach((w) =>
        log(logs, '⚠️ 校验警告', w)
      );
    }

    // 保存生成的代码
    const outputPath = saveGeneratedCode(
      generationResult.code,
      config.testType,
      config.outputDir || config.outputDir || `auto-${Date.now()}.spec.ts`,
      PROJECT_ROOT
    );
    log(logs, PipelineStep.GENERATION, `代码已保存：${outputPath}`);

    // ==================== Step 3: 测试执行 ====================
    log(logs, PipelineStep.EXECUTION, '开始执行测试...');

    const executorConfig: TestExecutorConfig = {
      projectRoot: PROJECT_ROOT,
      timeout: 60000,
      retries: 0, // 首次执行不重试，以便收集失败信息
      headed: config.headed ?? false,
      slowMo: config.slowMo ?? 0,
      trace: 'retain-on-failure',
      recordVideo: true,
    };

    executionResult = await testExecutorAgent(outputPath, executorConfig);
    log(
      logs,
      PipelineStep.EXECUTION,
      `执行完成：${executionResult.passed} 通过，${executionResult.failed} 失败，${executionResult.skipped} 跳过`
    );

    // ==================== Step 4 & 5: 失败分析和自愈 ====================
    if (executionResult.failed > 0 && enableSelfHealing) {
      log(
        logs,
        PipelineStep.ANALYSIS,
        `发现 ${executionResult.failed} 个失败测试，开始分析...`
      );

      let currentCode = generationResult.code;
      let retryCount = 0;

      while (executionResult.failed > 0 && retryCount < maxRetries) {
        retryCount++;
        log(
          logs,
          PipelineStep.HEALING,
          `=== 第 ${retryCount} 次自愈循环 ===`
        );

        // 分析每个失败的测试
        for (const failedTest of executionResult.results.filter(
          (r) => r.status === 'failed'
        )) {
          log(logs, PipelineStep.ANALYSIS, `分析失败：${failedTest.name}`);

          // 提取失败测试的代码片段
          const testCodeSnippet = extractTestCode(currentCode, failedTest.name);

          const analysisInput: FailureAnalysisInput = {
            testResult: failedTest,
            testCode: testCodeSnippet || currentCode,
          };

          const analysis = await failureAnalysisAgent(analysisInput);
          failureAnalyses.push(analysis);

          log(
            logs,
            PipelineStep.ANALYSIS,
            `根因：${analysis.category} - ${analysis.rootCause}`
          );
          log(
            logs,
            PipelineStep.ANALYSIS,
            `置信度：${(analysis.confidence * 100).toFixed(0)}%`
          );

          // 自动修复
          log(logs, PipelineStep.HEALING, `尝试修复：${failedTest.name}`);

          const healingInput: SelfHealingInput = {
            originalCode: currentCode,
            analysis,
          };

          const healingResult = await selfHealingAgent(healingInput);

          if (healingResult.success) {
            healingResults.push(healingResult);
            currentCode = healingResult.fixedCode;

            log(
              logs,
              PipelineStep.HEALING,
              `修复成功，修改内容：`
            );
            healingResult.changes.slice(0, 5).forEach((c) =>
              log(logs, '  ', c)
            );

            // 更新代码文件
            fs.writeFileSync(outputPath, currentCode, 'utf-8');

            // 验证修复后的代码
            const validation = validateHealedCode(currentCode);
            if (!validation.isValid) {
              log(
                logs,
                '⚠️ 验证警告',
                `修复后的代码存在问题：${validation.issues.join(', ')}`
              );
            }

            // 重新执行测试
            log(logs, PipelineStep.VERIFICATION, '重新执行测试...');
            executionResult = await testExecutorAgent(outputPath, {
              ...executorConfig,
              retries: 0,
            });

            log(
              logs,
              PipelineStep.VERIFICATION,
              `验证结果：${executionResult.passed} 通过，${executionResult.failed} 失败`
            );

            if (executionResult.failed === 0) {
              log(logs, PipelineStep.VERIFICATION, '✅ 所有测试通过！');
              break;
            }
          } else {
            log(
              logs,
              PipelineStep.HEALING,
              `❌ 修复失败：${healingResult.fixDescription}`
            );
          }
        }
      }

      if (executionResult.failed > 0) {
        log(
          logs,
          PipelineStep.HEALING,
          `⚠️ 经过 ${retryCount} 次自愈后仍有 ${executionResult.failed} 个失败测试`
        );
      }
    }

    // ==================== 最终结果 ====================
    const success = executionResult.failed === 0;

    return {
      success,
      testPlan,
      generationResult,
      executionResult,
      failureAnalyses: failureAnalyses.length > 0 ? failureAnalyses : undefined,
      healingResults: healingResults.length > 0 ? healingResults : undefined,
      logs,
    };
  } catch (error) {
    log(logs, '❌ 错误', (error as Error).message);
    return {
      success: false,
      logs,
    };
  }
}

/**
 * 保存生成的测试代码
 */
function saveGeneratedCode(
  code: string,
  testType: 'smoke' | 'regression',
  fileName: string,
  projectRoot: string
): string {
  const targetDir = path.join(
    projectRoot,
    'tests',
    testType === 'smoke' ? 'smoke' : 'regression'
  );

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outputPath = path.join(targetDir, fileName);
  fs.writeFileSync(outputPath, code, 'utf-8');

  return outputPath;
}

/**
 * 提取单个测试的代码片段
 */
function extractTestCode(fullCode: string, testName: string): string | null {
  // 尝试提取单个 test() 块
  const escapedName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const testRegex = new RegExp(
    `test\\s*\\([^'"]*['"]${escapedName}['"][\\s\\S]*?^\\s*\\}\\s*\\)`,
    'm'
  );

  const match = fullCode.match(testRegex);
  return match ? match[0] : null;
}

/**
 * 日志记录辅助函数
 */
function log(logs: string[], step: PipelineStep | string, message: string): void {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  const logEntry = `[${timestamp}] ${step}: ${message}`;
  logs.push(logEntry);
  console.log(logEntry);
}

/**
 * 打印测试结果摘要
 */
export function printTestSummary(result: PipelineResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('                    测试执行摘要');
  console.log('='.repeat(60));

  if (result.testPlan) {
    console.log(`功能模块：${result.testPlan.feature}`);
    console.log(`测试类型：${result.testPlan.type}`);
    console.log(`场景数量：${result.testPlan.scenarios.length}`);
  }

  if (result.generationResult) {
    console.log(`生成用例：${result.generationResult.testCount} 个`);
    console.log(`代码有效：${result.generationResult.isValid ? '✅' : '⚠️'}`);
  }

  if (result.executionResult) {
    const exec = result.executionResult;
    console.log(`\n执行结果:`);
    console.log(`  ✅ 通过：${exec.passed}`);
    console.log(`  ❌ 失败：${exec.failed}`);
    console.log(`  ⏭️  跳过：${exec.skipped}`);
    console.log(`  ⏱️  耗时：${(exec.duration / 1000).toFixed(1)}s`);
  }

  if (result.failureAnalyses && result.failureAnalyses.length > 0) {
    console.log(`\n失败分析:`);
    result.failureAnalyses.forEach((analysis, i) => {
      console.log(`  ${i + 1}. [${analysis.category}] ${analysis.rootCause}`);
      console.log(`     置信度：${(analysis.confidence * 100).toFixed(0)}%`);
      console.log(`     建议：${analysis.suggestion.substring(0, 80)}...`);
    });
  }

  if (result.healingResults && result.healingResults.length > 0) {
    console.log(`\n自愈结果:`);
    result.healingResults.forEach((heal, i) => {
      console.log(
        `  ${i + 1}. ${heal.success ? '✅' : '❌'} [${heal.fixType}] ${heal.fixDescription.substring(0, 50)}...`
      );
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    `最终状态：${result.success ? '✅ 全部通过' : '❌ 存在失败'}`
  );
  console.log('='.repeat(60) + '\n');
}
