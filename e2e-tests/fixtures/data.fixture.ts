import { test as authTest } from './auth.fixture';

type DataFixtures = {
  /** 自动创建一条草稿报告，测试结束后自动清理 */
  draftReport: string | undefined;
  /** 自动创建一条待审核报告 */
  pendingAuditReport: string | undefined;
  /** 自动创建一条已审核报告 */
  auditedReport: string | undefined;
};

// 暂时禁用 API 创建报告，所有 fixture 返回 undefined
// 依赖这些 fixture 的测试将会被跳过
export const test = authTest.extend<DataFixtures>({
  draftReport: async ({}, use) => {
    console.log('跳过 API 创建报告：draftReport');
    await use(undefined);
  },

  pendingAuditReport: async ({}, use) => {
    console.log('跳过 API 创建报告：pendingAuditReport');
    await use(undefined);
  },

  auditedReport: async ({}, use) => {
    console.log('跳过 API 创建报告：auditedReport');
    await use(undefined);
  },
});

export { expect } from '@playwright/test';
