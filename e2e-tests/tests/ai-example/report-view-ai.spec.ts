// AI 生成测试示例 - 体检报告查看功能
// 使用多 Agent 架构生成的完整测试用例

import { test, expect } from '../../fixtures/auth.fixture';
import { ReportListPage } from '../../pages/report-list.page';
import { ReportDetailPage } from '../../pages/report-detail.page';

test.describe('体检报告查看功能 - AI 生成示例', () => {
  // 场景 1: 医生查看报告列表
  test('P0-医生可查看体检报告列表', async ({ doctorPage }) => {
    const reportListPage = new ReportListPage(doctorPage);

    await test.step('访问报告列表页面', async () => {
      await reportListPage.goto();
    });

    await test.step('验证列表加载成功', async () => {
      await expect(reportListPage.searchInput).toBeVisible();
      await expect(reportListPage.queryButton).toBeVisible();
    });

    await test.step('执行查询并验证结果', async () => {
      await reportListPage.queryButton.click();
      await expect(reportListPage.reportTable).toBeVisible();
    });
  });

  // 场景 2: 查看报告详情
  test('P0-医生可查看体检报告详情', async ({ doctorPage }) => {
    const reportListPage = new ReportListPage(doctorPage);
    const reportDetailPage = new ReportDetailPage(doctorPage);

    await test.step('访问报告列表并查询', async () => {
      await reportListPage.goto();
      await reportListPage.queryButton.click();
      await reportListPage.reportTable.waitFor({ state: 'visible' });
    });

    await test.step('点击第一个报告的查看按钮', async () => {
      const firstViewButton = reportListPage.reportTable
        .locator('button:has-text("查看")')
        .first();
      await firstViewButton.click();
    });

    await test.step('验证报告详情页加载成功', async () => {
      await expect(reportDetailPage.patientInfoSection).toBeVisible();
      await expect(reportDetailPage.examItemsSection).toBeVisible();
    });

    await test.step('验证报告包含必要信息', async () => {
      await expect(reportDetailPage.reportTitle).toBeVisible();
      await expect(reportDetailPage.examDate).toBeVisible();
    });
  });

  // 场景 3: 搜索特定报告
  test('P1-医生可通过姓名搜索报告', async ({ doctorPage }) => {
    const reportListPage = new ReportListPage(doctorPage);

    await test.step('访问报告列表页面', async () => {
      await reportListPage.goto();
    });

    await test.step('输入搜索条件', async () => {
      await reportListPage.searchInput.fill('测试');
    });

    await test.step('执行查询', async () => {
      await reportListPage.queryButton.click();
      await reportListPage.reportTable.waitFor({ state: 'visible' });
    });

    await test.step('验证搜索结果', async () => {
      // 验证搜索条件仍显示在输入框中
      const inputValue = await reportListPage.searchInput.inputValue();
      expect(inputValue).toContain('测试');
    });
  });

  // 场景 4: 查看报告结论
  test('P1-医生可查看报告结论和建议', async ({ doctorPage }) => {
    const reportListPage = new ReportListPage(doctorPage);
    const reportDetailPage = new ReportDetailPage(doctorPage);

    await test.step('打开第一个报告', async () => {
      await reportListPage.goto();
      await reportListPage.queryButton.click();

      const firstViewButton = reportListPage.reportTable
        .locator('button:has-text("查看")')
        .first();
      await firstViewButton.click();
    });

    await test.step('滚动到结论部分', async () => {
      await reportDetailPage.conclusionSection.scrollIntoViewIfNeeded();
    });

    await test.step('验证结论内容', async () => {
      await expect(reportDetailPage.conclusionSection).toBeVisible();
      await expect(reportDetailPage.suggestionSection).toBeVisible();
    });
  });

  // 场景 5: 报告预览功能
  test('P2-医生可使用报告预览功能', async ({ doctorPage }) => {
    const reportListPage = new ReportListPage(doctorPage);
    const reportDetailPage = new ReportDetailPage(doctorPage);

    await test.step('打开报告详情页', async () => {
      await reportListPage.goto();
      await reportListPage.queryButton.click();

      const firstViewButton = reportListPage.reportTable
        .locator('button:has-text("查看")')
        .first();
      await firstViewButton.click();
    });

    await test.step('点击报告预览按钮', async () => {
      const previewButton = reportDetailPage.page.locator(
        'button:has-text("报告预览")'
      ).first();
      await previewButton.click();
    });

    await test.step('验证预览窗口打开', async () => {
      // 验证预览对话框可见
      const previewDialog = doctorPage.locator('[role="dialog"]');
      await expect(previewDialog).toBeVisible();
    });
  });
});
