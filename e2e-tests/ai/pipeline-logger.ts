// AI 测试生成系统 - 结构化日志记录器

import { EventEmitter } from 'events';
import type { DebugLogEntry, LogLevel, LogCategory } from './pipeline-types';

/**
 * 管道日志记录器
 * 提供结构化日志记录，同时通过 EventEmitter 实时推送日志
 */
export class PipelineLogger extends EventEmitter {
  private logs: DebugLogEntry[] = [];

  /** 记录 info 级别日志 */
  info(step: string, message: string, data?: unknown): void {
    this.addLog('info', step, 'progress', message, data);
  }

  /** 记录 debug 级别日志 */
  debug(step: string, message: string, data?: unknown): void {
    this.addLog('debug', step, 'progress', message, data);
  }

  /** 记录 warn 级别日志 */
  warn(step: string, message: string, data?: unknown): void {
    this.addLog('warn', step, 'validation', message, data);
  }

  /** 记录 error 级别日志 */
  error(step: string, message: string, data?: unknown): void {
    this.addLog('error', step, 'system', message, data);
  }

  /** 记录发送给 LLM 的 Prompt */
  logPrompt(step: string, systemPrompt: string, userPrompt: string): void {
    this.addLog('debug', step, 'prompt', '构建 Prompt 完成', {
      systemPrompt,
      userPrompt,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });
  }

  /** 记录 LLM 返回 */
  logLLMResponse(
    step: string,
    rawResponse: string,
    tokenUsage?: { prompt: number; completion: number },
  ): void {
    this.addLog('debug', step, 'llm-response', 'LLM 响应已接收', {
      rawResponse,
      responseLength: rawResponse.length,
      tokenUsage,
    });
  }

  /** 记录后处理 diff */
  logDiff(step: string, before: string, after: string): void {
    this.addLog('debug', step, 'diff', '后处理对比', {
      before,
      after,
      beforeLength: before.length,
      afterLength: after.length,
    });
  }

  /** 记录校验警告 */
  logValidation(step: string, warnings: string[]): void {
    if (warnings.length === 0) {
      this.addLog('info', step, 'validation', '代码校验通过，无警告');
    } else {
      this.addLog('warn', step, 'validation', `代码校验发现 ${warnings.length} 条警告`, {
        warnings,
      });
    }
  }

  /** 获取所有日志 */
  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  /** 按步骤过滤日志 */
  getLogsByStep(stepId: string): DebugLogEntry[] {
    return this.logs.filter((l) => l.step === stepId);
  }

  /** 按分类过滤日志 */
  getLogsByCategory(category: LogCategory): DebugLogEntry[] {
    return this.logs.filter((l) => l.category === category);
  }

  /** 清空日志 */
  clear(): void {
    this.logs = [];
  }

  private addLog(
    level: LogLevel,
    step: string,
    category: LogCategory,
    message: string,
    data?: unknown,
  ): void {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      step,
      category,
      message,
      data,
    };
    this.logs.push(entry);
    this.emit('log', entry);
  }
}
