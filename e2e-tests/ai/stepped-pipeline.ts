// AI 测试生成系统 - 可暂停管道引擎

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { PipelineLogger } from './pipeline-logger';
import { collectFullContext } from './context-collector';
import {
  buildGeneratePrompt,
  buildModifyPrompt,
  buildExtendPrompt,
} from './prompt-templates';
import { callLLM, extractCodeBlock } from './llm-client';
import { processGeneratedCode } from './post-processor';
import type { ProjectContext } from './types';
import type {
  StepId,
  PipelineStep,
  StepConfirmAction,
  StepDefinition,
  GeneratePipelineParams,
  ModifyPipelineParams,
  ExtendPipelineParams,
  PipelineMode,
  PipelineParams,
  ContextScanData,
  PromptBuildData,
  LlmCallData,
  PostProcessData,
  FileWriteData,
} from './pipeline-types';
import { PipelineAbortError, StepConfirmTimeoutError } from './pipeline-types';

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** 确认超时：30 分钟 */
const CONFIRM_TIMEOUT_MS = 30 * 60 * 1000;

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

function inferRelevantPOs(feature: string): string[] {
  const matched = new Set<string>();
  for (const [keywords, poNames] of Object.entries(KEYWORD_PO_MAP)) {
    const parts = keywords.split('|');
    if (parts.some((kw) => feature.toLowerCase().includes(kw.toLowerCase()))) {
      for (const name of poNames) matched.add(name);
    }
  }
  return Array.from(matched);
}

function generateFileName(feature: string, _testType: string): string {
  const nameMap: Record<string, string> = {
    '登录': 'login', '报告编辑': 'report-edit', '报告列表': 'report-list',
    '报告详情': 'report-detail', '报告审核': 'report-audit', '审核': 'audit',
    '发布': 'report-publish', '权限': 'permission', '查询': 'report-query',
    '工作流': 'report-workflow', '流转': 'report-workflow', '搜索': 'report-search',
    '编辑': 'report-edit',
  };
  let baseName = '';
  for (const [cn, en] of Object.entries(nameMap)) {
    if (feature.includes(cn)) { baseName = en; break; }
  }
  if (!baseName) baseName = `test-${Date.now()}`;
  return `${baseName}-ai.spec.ts`;
}

/**
 * 可暂停管道引擎
 *
 * Events:
 * - 'step-start'            (step: PipelineStep)
 * - 'step-completed'        (step: PipelineStep, data: unknown)
 * - 'step-confirm-required' (step: PipelineStep, data: unknown)
 * - 'step-error'            (step: PipelineStep, error: Error)
 * - 'pipeline-complete'     (result: string)
 * - 'pipeline-error'        (error: Error)
 * - 'pipeline-aborted'      ()
 */
export class SteppedPipeline extends EventEmitter {
  readonly logger = new PipelineLogger();
  readonly steps: PipelineStep[] = [];
  private stepDefinitions: StepDefinition[] = [];
  private _pendingResolve: ((action: StepConfirmAction) => void) | null = null;
  private _pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  private _aborted = false;

  constructor(
    public readonly mode: PipelineMode,
    public readonly params: PipelineParams,
  ) {
    super();
    this.buildSteps();
  }

  /** 执行管道 */
  async run(stepByStep: boolean): Promise<string> {
    let prevData: unknown = null;

    for (let i = 0; i < this.stepDefinitions.length; i++) {
      if (this._aborted) throw new PipelineAbortError();

      const def = this.stepDefinitions[i];
      const step = this.steps[i];

      // 标记运行中
      step.status = 'running';
      step.startedAt = Date.now();
      this.emit('step-start', step);
      this.logger.info(def.id, `步骤开始: ${def.name}`);

      try {
        // 执行步骤
        const data = await def.execute(prevData);
        step.data = data;
        step.completedAt = Date.now();
        step.duration = step.completedAt - step.startedAt!;
        step.status = 'completed';
        this.emit('step-completed', step, data);
        this.logger.info(def.id, `步骤完成: ${def.name}，耗时 ${step.duration}ms`);

        // 分步确认模式
        if (stepByStep && def.requiresConfirm) {
          step.status = 'wait-confirm';
          this.emit('step-confirm-required', step, data);
          this.logger.info(def.id, '等待用户确认...');

          const action = await this.waitForConfirmation(def.id);
          this.logger.info(def.id, `用户操作: ${action.action}`);

          if (action.action === 'abort') {
            this._aborted = true;
            this.emit('pipeline-aborted');
            throw new PipelineAbortError();
          }

          if (action.action === 'retry') {
            // 重新执行当前步骤
            this.logger.info(def.id, '用户选择重试，重新执行当前步骤');
            i--; // 循环会 i++，所以这里 i-- 让它重新执行
            step.status = 'pending';
            step.data = undefined;
            step.startedAt = undefined;
            step.completedAt = undefined;
            step.duration = undefined;
            continue;
          }

          if (action.action === 'edit' && action.editedData) {
            // 用编辑后的数据覆盖
            this.logger.info(def.id, '用户编辑了步骤数据');
            Object.assign(data as Record<string, unknown>, action.editedData);
            step.data = data;
          }

          step.status = 'completed';
        }

        prevData = data;
      } catch (err) {
        if (err instanceof PipelineAbortError) throw err;

        step.status = 'failed';
        step.error = (err as Error).message;
        step.completedAt = Date.now();
        step.duration = step.completedAt - (step.startedAt || step.completedAt);
        this.logger.error(def.id, `步骤失败: ${(err as Error).message}`);
        this.emit('step-error', step, err);

        if (stepByStep) {
          // 交互模式下等待用户决策
          const action = await this.waitForConfirmation(def.id);
          if (action.action === 'abort') {
            this._aborted = true;
            this.emit('pipeline-aborted');
            throw new PipelineAbortError();
          }
          if (action.action === 'retry') {
            i--;
            step.status = 'pending';
            step.data = undefined;
            step.error = undefined;
            step.startedAt = undefined;
            step.completedAt = undefined;
            step.duration = undefined;
            continue;
          }
          // 'continue' or 'edit' in error case: skip this step
          step.status = 'skipped';
          prevData = null;
        } else {
          throw err;
        }
      }
    }

    // 提取最终代码结果
    const lastStep = this.steps[this.steps.length - 1];
    const result = this.extractResult(lastStep);
    this.emit('pipeline-complete', result);
    return result;
  }

  /** 外部调用：确认步骤 */
  confirm(action: StepConfirmAction): void {
    if (this._pendingResolve) {
      if (this._pendingTimeout) {
        clearTimeout(this._pendingTimeout);
        this._pendingTimeout = null;
      }
      this._pendingResolve(action);
      this._pendingResolve = null;
    }
  }

  /** 外部调用：中止管道 */
  abort(): void {
    this._aborted = true;
    if (this._pendingResolve) {
      this._pendingResolve({ action: 'abort' });
      this._pendingResolve = null;
    }
  }

  // ==================== 内部方法 ====================

  private waitForConfirmation(stepId: string): Promise<StepConfirmAction> {
    return new Promise<StepConfirmAction>((resolve, reject) => {
      this._pendingResolve = resolve;
      this._pendingTimeout = setTimeout(() => {
        this._pendingResolve = null;
        reject(new StepConfirmTimeoutError(stepId));
      }, CONFIRM_TIMEOUT_MS);
    });
  }

  private extractResult(lastStep: PipelineStep): string {
    if (this.mode === 'generate') {
      const fwd = lastStep.data as FileWriteData | undefined;
      return fwd?.code || '';
    }
    const ppd = lastStep.data as PostProcessData | FileWriteData | undefined;
    if (ppd && 'processedCode' in ppd) return ppd.processedCode;
    if (ppd && 'code' in ppd) return ppd.code;
    return '';
  }

  /** 根据 mode 构建步骤 */
  private buildSteps(): void {
    switch (this.mode) {
      case 'generate':
        this.buildGenerateSteps();
        break;
      case 'modify':
        this.buildModifySteps();
        break;
      case 'extend':
        this.buildExtendSteps();
        break;
    }
    // 初始化 PipelineStep 状态对象
    for (const def of this.stepDefinitions) {
      this.steps.push({
        id: def.id,
        name: def.name,
        status: 'pending',
        requiresConfirm: def.requiresConfirm,
      });
    }
  }

  // ==================== Generate 步骤 ====================

  private buildGenerateSteps(): void {
    const params = this.params as GeneratePipelineParams;

    this.stepDefinitions = [
      {
        id: 'context-scan',
        name: '上下文发现',
        requiresConfirm: true,
        execute: async (): Promise<ContextScanData> => {
          this.logger.info('context-scan', '正在收集项目上下文...');
          const context = collectFullContext();
          const relevantPOs = inferRelevantPOs(params.feature);

          this.logger.info('context-scan', `发现 ${context.pageObjects.length} 个 Page Object`);
          this.logger.info('context-scan', `发现 ${context.authFixtures.length} 个角色 Fixture`);
          this.logger.info('context-scan', `分析了 ${context.testPatterns.length} 个现有测试文件`);
          if (relevantPOs.length > 0) {
            this.logger.info('context-scan', `推断相关 PO: ${relevantPOs.join(', ')}`);
          }

          // 保存完整 context 供后续步骤使用（附加在 _context 上）
          (this as any)._context = context;

          return {
            pageObjects: context.pageObjects.map((po) => ({
              className: po.className,
              filePath: po.filePath,
              locatorCount: po.locators.length,
              methodCount: po.methods.length,
              methods: po.methods.map((m) => m.name),
            })),
            authFixtures: context.authFixtures.map((f) => ({
              name: f.name, type: f.type, description: f.description,
            })),
            dataFixtures: context.dataFixtures.map((f) => ({
              name: f.name, type: f.type, description: f.description,
            })),
            testPatterns: context.testPatterns.map((t) => ({
              filePath: t.filePath, imports: t.imports,
            })),
            testDataSchemas: context.testDataSchemas,
            utilFunctions: context.utilFunctions.map((u) => ({
              name: u.name, signature: u.signature,
            })),
            relevantPOs,
          };
        },
      },
      {
        id: 'prompt-build',
        name: 'Prompt 构建',
        requiresConfirm: true,
        execute: async (): Promise<PromptBuildData> => {
          const context: ProjectContext = (this as any)._context;
          this.logger.info('prompt-build', '正在构建 Prompt...');

          const { systemPrompt, userPrompt } = buildGeneratePrompt(
            params.feature,
            params.type,
            context,
          );

          this.logger.logPrompt('prompt-build', systemPrompt, userPrompt);
          return { systemPrompt, userPrompt };
        },
      },
      {
        id: 'llm-call',
        name: 'LLM 调用',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<LlmCallData> => {
          const { systemPrompt, userPrompt } = prevData as PromptBuildData;
          this.logger.info('llm-call', '正在调用 LLM...');

          const startTime = Date.now();

          // 创建进度回调，发送到 WebSocket
          const onProgress = (stage: string, progress: number) => {
            this.logger.info('llm-call', `LLM 进度：${stage} (${progress}%)`);
            // 通过 logger 事件自动广播到 WebSocket
            this.emit('llm:progress', { stage, progress, stepId: 'llm-call' });
          };

          const rawResponse = await callLLM(userPrompt, {
            systemPrompt,
            temperature: params.temperature ?? 0.3,
            maxTokens: params.maxTokens ?? 8192,
            onProgress,
          });
          const duration = Date.now() - startTime;

          this.logger.info('llm-call', `LLM 响应完成，耗时 ${duration}ms`);
          this.logger.logLLMResponse('llm-call', rawResponse);

          return {
            rawResponse,
            model: process.env.LLM_MODEL || 'unknown',
          };
        },
      },
      {
        id: 'post-process',
        name: '代码后处理',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<PostProcessData> => {
          const { rawResponse } = prevData as LlmCallData;
          const context: ProjectContext = (this as any)._context;
          const targetDir = params.type === 'smoke' ? 'tests/smoke' : 'tests/regression';

          this.logger.info('post-process', '正在后处理代码...');
          const rawCode = extractCodeBlock(rawResponse);
          const result = processGeneratedCode(rawCode, context, targetDir);

          this.logger.logDiff('post-process', rawCode, result.code);
          this.logger.logValidation('post-process', result.warnings);

          return {
            rawCode,
            processedCode: result.code,
            warnings: result.warnings,
            isValid: result.isValid,
          };
        },
      },
      {
        id: 'file-write',
        name: '文件写入',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<FileWriteData> => {
          const { processedCode } = prevData as PostProcessData;
          const targetDir = params.type === 'smoke' ? 'tests/smoke' : 'tests/regression';
          const fileName = params.output || generateFileName(params.feature, params.type);
          const outputDir = path.join(PROJECT_ROOT, targetDir);
          const outputPath = path.join(outputDir, fileName);
          const fileExists = fs.existsSync(outputPath);
          const testCount = (processedCode.match(/\btest\s*\(/g) || []).length;

          this.logger.info('file-write', `目标路径: ${targetDir}/${fileName}`);
          this.logger.info('file-write', `用例数: ${testCount}`);
          if (fileExists) {
            this.logger.warn('file-write', `文件已存在，将覆盖: ${outputPath}`);
          }

          if (!params.dryRun) {
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(outputPath, processedCode, 'utf-8');
            this.logger.info('file-write', `文件已写入: ${outputPath}`);
          } else {
            this.logger.info('file-write', 'Dry-run 模式，未写入文件');
          }

          return {
            targetPath: outputPath,
            fileName,
            testCount,
            fileExists,
            code: processedCode,
          };
        },
      },
    ];
  }

  // ==================== Modify 步骤 ====================

  private buildModifySteps(): void {
    const params = this.params as ModifyPipelineParams;

    this.stepDefinitions = [
      {
        id: 'context-scan',
        name: '上下文发现',
        requiresConfirm: true,
        execute: async (): Promise<ContextScanData> => {
          const filePath = path.resolve(PROJECT_ROOT, params.file);
          if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${params.file}`);
          }
          (this as any)._existingCode = fs.readFileSync(filePath, 'utf-8');
          (this as any)._filePath = filePath;

          this.logger.info('context-scan', '正在收集项目上下文...');
          const context = collectFullContext();
          (this as any)._context = context;

          return {
            pageObjects: context.pageObjects.map((po) => ({
              className: po.className, filePath: po.filePath,
              locatorCount: po.locators.length, methodCount: po.methods.length,
              methods: po.methods.map((m) => m.name),
            })),
            authFixtures: context.authFixtures.map((f) => ({
              name: f.name, type: f.type, description: f.description,
            })),
            dataFixtures: context.dataFixtures.map((f) => ({
              name: f.name, type: f.type, description: f.description,
            })),
            testPatterns: context.testPatterns.map((t) => ({
              filePath: t.filePath, imports: t.imports,
            })),
            testDataSchemas: context.testDataSchemas,
            utilFunctions: context.utilFunctions.map((u) => ({
              name: u.name, signature: u.signature,
            })),
            relevantPOs: [],
          };
        },
      },
      {
        id: 'prompt-build',
        name: 'Prompt 构建',
        requiresConfirm: true,
        execute: async (): Promise<PromptBuildData> => {
          const context: ProjectContext = (this as any)._context;
          const existingCode: string = (this as any)._existingCode;
          this.logger.info('prompt-build', `正在构建修改 Prompt: ${params.change}`);

          const { systemPrompt, userPrompt } = buildModifyPrompt(
            existingCode, params.change, context,
          );
          this.logger.logPrompt('prompt-build', systemPrompt, userPrompt);
          return { systemPrompt, userPrompt };
        },
      },
      {
        id: 'llm-call',
        name: 'LLM 调用',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<LlmCallData> => {
          const { systemPrompt, userPrompt } = prevData as PromptBuildData;
          this.logger.info('llm-call', '正在调用 LLM...');
          const rawResponse = await callLLM(userPrompt, {
            systemPrompt,
            temperature: params.temperature ?? 0.3,
            maxTokens: params.maxTokens ?? 8192,
          });
          this.logger.logLLMResponse('llm-call', rawResponse);
          return { rawResponse, model: process.env.LLM_MODEL || 'unknown' };
        },
      },
      {
        id: 'post-process',
        name: '代码后处理',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<PostProcessData> => {
          const { rawResponse } = prevData as LlmCallData;
          const context: ProjectContext = (this as any)._context;
          const targetDir = params.file.includes('smoke') ? 'tests/smoke' : 'tests/regression';

          const rawCode = extractCodeBlock(rawResponse);
          const result = processGeneratedCode(rawCode, context, targetDir);
          this.logger.logDiff('post-process', rawCode, result.code);
          this.logger.logValidation('post-process', result.warnings);

          return {
            rawCode, processedCode: result.code,
            warnings: result.warnings, isValid: result.isValid,
          };
        },
      },
      {
        id: 'file-write',
        name: '文件写入',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<FileWriteData> => {
          const { processedCode } = prevData as PostProcessData;
          const filePath: string = (this as any)._filePath;
          const existingCode: string = (this as any)._existingCode;
          const testCount = (processedCode.match(/\btest\s*\(/g) || []).length;

          // 备份原文件
          const backupPath = filePath + '.bak';
          fs.writeFileSync(backupPath, existingCode, 'utf-8');
          this.logger.info('file-write', `原文件已备份: ${path.basename(backupPath)}`);

          fs.writeFileSync(filePath, processedCode, 'utf-8');
          this.logger.info('file-write', `文件已修改: ${params.file}`);

          return {
            targetPath: filePath,
            fileName: path.basename(filePath),
            testCount,
            fileExists: true,
            code: processedCode,
          };
        },
      },
    ];
  }

  // ==================== Extend 步骤 ====================

  private buildExtendSteps(): void {
    const params = this.params as ExtendPipelineParams;

    this.stepDefinitions = [
      {
        id: 'context-scan',
        name: '上下文发现',
        requiresConfirm: true,
        execute: async (): Promise<ContextScanData> => {
          const filePath = path.resolve(PROJECT_ROOT, params.file);
          if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${params.file}`);
          }
          (this as any)._existingCode = fs.readFileSync(filePath, 'utf-8');
          (this as any)._filePath = filePath;

          this.logger.info('context-scan', '正在收集项目上下文...');
          const context = collectFullContext();
          (this as any)._context = context;

          return {
            pageObjects: context.pageObjects.map((po) => ({
              className: po.className, filePath: po.filePath,
              locatorCount: po.locators.length, methodCount: po.methods.length,
              methods: po.methods.map((m) => m.name),
            })),
            authFixtures: context.authFixtures.map((f) => ({
              name: f.name, type: f.type, description: f.description,
            })),
            dataFixtures: context.dataFixtures.map((f) => ({
              name: f.name, type: f.type, description: f.description,
            })),
            testPatterns: context.testPatterns.map((t) => ({
              filePath: t.filePath, imports: t.imports,
            })),
            testDataSchemas: context.testDataSchemas,
            utilFunctions: context.utilFunctions.map((u) => ({
              name: u.name, signature: u.signature,
            })),
            relevantPOs: [],
          };
        },
      },
      {
        id: 'prompt-build',
        name: 'Prompt 构建',
        requiresConfirm: true,
        execute: async (): Promise<PromptBuildData> => {
          const context: ProjectContext = (this as any)._context;
          const existingCode: string = (this as any)._existingCode;
          this.logger.info('prompt-build', `正在构建扩展 Prompt: ${params.add}`);

          const { systemPrompt, userPrompt } = buildExtendPrompt(
            existingCode, params.add, context,
          );
          this.logger.logPrompt('prompt-build', systemPrompt, userPrompt);
          return { systemPrompt, userPrompt };
        },
      },
      {
        id: 'llm-call',
        name: 'LLM 调用',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<LlmCallData> => {
          const { systemPrompt, userPrompt } = prevData as PromptBuildData;
          this.logger.info('llm-call', '正在调用 LLM...');
          const rawResponse = await callLLM(userPrompt, {
            systemPrompt,
            temperature: params.temperature ?? 0.3,
            maxTokens: params.maxTokens ?? 8192,
          });
          this.logger.logLLMResponse('llm-call', rawResponse);
          return { rawResponse, model: process.env.LLM_MODEL || 'unknown' };
        },
      },
      {
        id: 'post-process',
        name: '代码后处理',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<PostProcessData> => {
          const { rawResponse } = prevData as LlmCallData;
          const context: ProjectContext = (this as any)._context;
          const targetDir = params.file.includes('smoke') ? 'tests/smoke' : 'tests/regression';

          const rawCode = extractCodeBlock(rawResponse);
          const result = processGeneratedCode(rawCode, context, targetDir);
          this.logger.logDiff('post-process', rawCode, result.code);
          this.logger.logValidation('post-process', result.warnings);

          return {
            rawCode, processedCode: result.code,
            warnings: result.warnings, isValid: result.isValid,
          };
        },
      },
      {
        id: 'file-write',
        name: '文件写入',
        requiresConfirm: true,
        execute: async (prevData: unknown): Promise<FileWriteData> => {
          const { processedCode } = prevData as PostProcessData;
          const filePath: string = (this as any)._filePath;
          const existingCode: string = (this as any)._existingCode;
          const testCount = (processedCode.match(/\btest\s*\(/g) || []).length;
          const oldCount = (existingCode.match(/\btest\s*\(/g) || []).length;

          // 备份
          const backupPath = filePath + '.bak';
          fs.writeFileSync(backupPath, existingCode, 'utf-8');
          this.logger.info('file-write', `原文件已备份: ${path.basename(backupPath)}`);

          fs.writeFileSync(filePath, processedCode, 'utf-8');
          this.logger.info('file-write', `文件已扩展: ${params.file}`);
          this.logger.info('file-write', `原有用例: ${oldCount}, 扩展后: ${testCount}, 新增: ${testCount - oldCount}`);

          return {
            targetPath: filePath,
            fileName: path.basename(filePath),
            testCount,
            fileExists: true,
            code: processedCode,
          };
        },
      },
    ];
  }
}
