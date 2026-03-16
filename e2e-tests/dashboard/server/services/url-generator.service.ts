// URL 分析测试生成服务 — 编排页面分析 → LLM → 后处理 → 文件写入

import fs from 'fs';
import path from 'path';
import { socketManager } from '../ws/socket-manager';

let isAnalyzing = false;

/** 劫持 console.log 转发到 WebSocket */
function interceptConsoleLog(taskId: string): () => void {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');

    let stage = 'generating';
    if (message.includes('[分析]')) stage = 'analyzing';
    else if (message.includes('[生成]')) stage = 'generating';
    else if (message.includes('[校验]')) stage = 'validating';
    else if (message.includes('[完成]')) stage = 'writing';

    socketManager.broadcast('analyzer', {
      type: 'analyzer:progress',
      taskId,
      stage,
      message,
    });
  };
  return () => {
    console.log = originalLog;
  };
}

export class UrlGeneratorService {
  constructor(private _projectRoot: string) {}

  isAnalyzing(): boolean {
    return isAnalyzing;
  }

  /** 仅分析页面，返回 PageAnalysis */
  async analyzeUrl(params: {
    url: string;
    auth?: {
      cookies?: Array<{ name: string; value: string; domain: string }>;
      localStorage?: Record<string, string>;
    };
    waitTime?: number;
  }) {
    if (isAnalyzing) throw new Error('已有分析任务正在运行');
    isAnalyzing = true;
    const taskId = `analyzer-${Date.now()}`;
    const restore = interceptConsoleLog(taskId);

    try {
      const { analyzeUrl } = await import('../../../ai/page-analyzer');
      const analysis = await analyzeUrl(params.url, {
        auth: params.auth,
        waitTime: params.waitTime,
        onProgress: (msg) => console.log(msg),
      });

      socketManager.broadcast('analyzer', {
        type: 'analyzer:analyzed',
        taskId,
        analysis: {
          ...analysis,
          // 截图单独处理，避免 WS 消息过大
          screenshot: analysis.screenshot ? '(已截图)' : '',
        },
      });

      return { taskId, analysis };
    } catch (err) {
      socketManager.broadcast('analyzer', {
        type: 'analyzer:error',
        taskId,
        error: (err as Error).message,
      });
      throw err;
    } finally {
      restore();
      isAnalyzing = false;
    }
  }

  /** 分析 + 生成测试（异步，通过 WS 推送进度） */
  async generateFromUrl(params: {
    url: string;
    description?: string;
    type: 'smoke' | 'regression';
    output?: string;
    dryRun?: boolean;
    auth?: {
      cookies?: Array<{ name: string; value: string; domain: string }>;
      localStorage?: Record<string, string>;
    };
    waitTime?: number;
  }): Promise<string> {
    if (isAnalyzing) throw new Error('已有分析任务正在运行');
    isAnalyzing = true;
    const taskId = `analyzer-${Date.now()}`;
    const restore = interceptConsoleLog(taskId);

    try {
      // Step 1: 页面分析
      const { analyzeUrl } = await import('../../../ai/page-analyzer');
      const analysis = await analyzeUrl(params.url, {
        auth: params.auth,
        waitTime: params.waitTime,
        onProgress: (msg) => console.log(msg),
      });

      // 广播分析结果（不含截图）
      socketManager.broadcast('analyzer', {
        type: 'analyzer:analyzed',
        taskId,
        analysis: {
          url: analysis.url,
          title: analysis.title,
          meta: analysis.meta,
          forms: analysis.forms,
          navigation: analysis.navigation,
          tables: analysis.tables,
          buttons: analysis.buttons,
          inputs: analysis.inputs,
        },
      });

      // Step 2: 构建 Prompt
      console.log('[生成] 正在构建 AI Prompt...');
      const { buildUrlGeneratePrompt } = await import('../../../ai/url-prompt-templates');
      const { systemPrompt, userPrompt } = buildUrlGeneratePrompt(
        analysis,
        params.type,
        params.description
      );

      // Step 3: 调用 LLM
      console.log('[生成] 正在调用 AI 生成测试代码...');
      const { callLLM, extractCodeBlock } = await import('../../../ai/llm-client');
      const rawCode = await callLLM(userPrompt, {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 8192,
      });

      // Step 4: 后处理
      console.log('[校验] 正在校验生成的代码...');
      const { processUrlGeneratedCode } = await import('../../../ai/url-post-processor');
      const result = processUrlGeneratedCode(extractCodeBlock(rawCode));

      for (const warning of result.warnings) {
        console.log(`[校验] ${warning}`);
      }

      if (params.dryRun) {
        socketManager.broadcast('analyzer', {
          type: 'analyzer:complete',
          taskId,
          code: result.code,
          warnings: result.warnings,
          screenshot: analysis.screenshot,
        });
        return result.code;
      }

      // Step 5: 写入文件
      const targetDir = params.type === 'smoke' ? 'tests/smoke' : 'tests/regression';
      const fileName = params.output || this.generateFileName(params.url, params.type);
      const outputDir = path.join(this._projectRoot, targetDir);
      const outputPath = path.join(outputDir, fileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, result.code, 'utf-8');

      const testCount = (result.code.match(/\btest\s*\(/g) || []).length;
      console.log(`[完成] 文件已生成: ${targetDir}/${fileName}`);
      console.log(`[完成]   - 用例数: ${testCount}`);

      socketManager.broadcast('analyzer', {
        type: 'analyzer:complete',
        taskId,
        code: result.code,
        warnings: result.warnings,
        filePath: `${targetDir}/${fileName}`,
        screenshot: analysis.screenshot,
      });

      return result.code;
    } catch (err) {
      socketManager.broadcast('analyzer', {
        type: 'analyzer:error',
        taskId,
        error: (err as Error).message,
      });
      throw err;
    } finally {
      restore();
      isAnalyzing = false;
    }
  }

  /** 根据 URL 生成文件名 */
  private generateFileName(url: string, testType: string): string {
    try {
      const parsed = new URL(url);
      let name = parsed.hostname.replace(/\./g, '-');
      const pathPart = parsed.pathname
        .replace(/^\/|\/$/g, '')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '');
      if (pathPart) {
        name += `-${pathPart}`;
      }
      // 截断避免过长
      if (name.length > 40) {
        name = name.substring(0, 40);
      }
      return `${name}-url-ai.spec.ts`;
    } catch {
      return `url-test-${Date.now()}-ai.spec.ts`;
    }
  }
}
