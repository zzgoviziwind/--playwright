// AI 测试生成系统 - 统一 LLM 客户端

import dotenv from 'dotenv';

dotenv.config();

const LLM_API_URL = process.env.LLM_API_URL || '';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4';

interface CallLLMOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 统一 LLM API 调用
 * OpenAI-compatible /chat/completions 端点
 */
export async function callLLM(
  prompt: string,
  options: CallLLMOptions = {}
): Promise<string> {
  if (!LLM_API_URL || !LLM_API_KEY) {
    throw new Error('LLM_API_URL 和 LLM_API_KEY 未配置，请在 .env 中设置');
  }

  const {
    systemPrompt,
    temperature = 0.3,
    maxTokens = 4096,
  } = options;

  const messages = [
    ...(systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }]
      : []),
    { role: 'user' as const, content: prompt },
  ];

  const body = JSON.stringify({
    model: LLM_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  let lastError: Error | null = null;

  // 最多重试 1 次（共 2 次调用）
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180_000);

      const response = await fetch(`${LLM_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `LLM API 调用失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      lastError = error as Error;
      if (attempt === 0) {
        // 首次失败，等待 3 秒后重试
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  throw lastError!;
}

/**
 * 从 LLM 回复中提取 JSON 对象
 */
export function extractJSON<T = Record<string, unknown>>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 返回格式异常，无法解析 JSON 对象');
  }
  return JSON.parse(jsonMatch[0]) as T;
}

/**
 * 从 LLM 回复中提取 JSON 数组
 */
export function extractJSONArray<T = unknown>(text: string): T[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI 返回格式异常，无法解析 JSON 数组');
  }
  return JSON.parse(jsonMatch[0]) as T[];
}

/**
 * 从 LLM 回复中提取代码块（去除 markdown 标记）
 */
export function extractCodeBlock(text: string): string {
  return text
    .replace(/^```(?:typescript|ts)?\n?/gm, '')
    .replace(/^```\n?/gm, '')
    .trim();
}
