import { type Page, type Response, type Locator } from '@playwright/test';

const DEFAULT_TIMEOUT = 10_000;

/**
 * 等待表格数据加载完成（骨架屏消失 + 数据行出现）
 */
export async function waitForTableLoaded(
  page: Page,
  tableTestId: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  const table = page.getByTestId(tableTestId);
  // 等待表格容器可见
  await table.waitFor({ state: 'visible', timeout });
  // 等待加载状态消失（如 loading spinner 或骨架屏）
  const loading = table.locator('.el-loading-mask, .loading-skeleton');
  await loading.waitFor({ state: 'hidden', timeout }).catch(() => {
    // 加载指示器可能不存在，忽略超时
  });
  // 等待至少一行数据出现
  await table.locator('tbody tr').first().waitFor({ state: 'visible', timeout });
}

/**
 * 等待 Toast/Message 提示出现
 */
export async function waitForToast(
  page: Page,
  message: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Locator> {
  const toast = page.getByText(message);
  await toast.waitFor({ state: 'visible', timeout });
  return toast;
}

/**
 * 等待特定 API 响应完成
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 200,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const response = await page.waitForResponse(
    (resp) => {
      const urlMatch =
        typeof urlPattern === 'string'
          ? resp.url().includes(urlPattern)
          : urlPattern.test(resp.url());
      return urlMatch && resp.status() === status;
    },
    { timeout }
  );
  return response;
}

/**
 * 等待 Vue SPA 路由跳转完成
 */
export async function waitForNavigationComplete(
  page: Page,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * 操作重试包装器
 * 在操作失败时自动重试，适用于因时序问题导致的间歇性失败
 */
export async function retryAction(
  action: () => Promise<void>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<void> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await action();
      return;
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * 等待元素包含指定文本
 */
export async function waitForTextContent(
  locator: Locator,
  expectedText: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  await locator.filter({ hasText: expectedText }).waitFor({
    state: 'visible',
    timeout,
  });
}
