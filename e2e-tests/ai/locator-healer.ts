import { type Page } from '@playwright/test';
import { callLLM, extractJSON } from './llm-client';

// ============ 类型定义 ============

export interface HealResult {
  originalLocator: string;
  newLocator: string;
  confidence: number;
  strategy: string;
}

// ============ 主函数 ============

/**
 * AI 定位器自愈
 * 当定位器失效时，分析当前页面 DOM，推荐新的定位器
 */
export async function healLocator(
  page: Page,
  failedLocator: string,
  elementDescription: string
): Promise<HealResult> {
  // 1. 获取当前页面 DOM 快照
  const domSnapshot = await page.evaluate(() => {
    return document.body.innerHTML.substring(0, 5000);
  });

  // 2. 构建 Prompt 发送给 LLM
  const prompt = `你是一名 Playwright 自动化测试专家，擅长分析页面 DOM 并修复失效的定位器。

## 当前页面 DOM 片段
${domSnapshot}

## 失败的定位器
${failedLocator}

## 元素描述
${elementDescription}

## 要求
请分析 DOM，找到该元素的新定位器，返回 JSON 格式：
{
  "locator": "新定位器（使用 Playwright 语法，如 getByTestId('xxx') 或 getByRole('button', { name: 'xxx' })）",
  "confidence": 0.95,
  "strategy": "修复策略说明（如：testid 变更、元素重构等）"
}

优先使用 data-testid，其次使用 role + name，最后使用文本或 CSS 选择器。`;

  // 3. 调用 LLM API 获取新定位器
  const response = extractJSON<{ locator: string; confidence: number; strategy: string }>(
    await callLLM(prompt, { temperature: 0.1 })
  );

  return {
    originalLocator: failedLocator,
    newLocator: response.locator,
    confidence: response.confidence,
    strategy: response.strategy,
  };
}

/**
 * 批量修复失效定位器
 * 遍历失败列表，逐个尝试修复
 */
export async function healLocators(
  page: Page,
  failures: Array<{ locator: string; description: string }>
): Promise<HealResult[]> {
  const results: HealResult[] = [];

  for (const failure of failures) {
    try {
      const result = await healLocator(page, failure.locator, failure.description);
      results.push(result);
    } catch (error) {
      results.push({
        originalLocator: failure.locator,
        newLocator: '',
        confidence: 0,
        strategy: `修复失败: ${(error as Error).message}`,
      });
    }
  }

  return results;
}
