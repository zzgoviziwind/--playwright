import { test, expect } from '../../fixtures/auth.fixture';
import { ReportListPage } from '../../pages/report-list.page';

test.describe('冒烟测试 - 打开体检报告列表 (SM-02)', () => {
  test('报告列表加载成功并显示数据', async ({ doctorPage }) => {
    const listPage = new ReportListPage(doctorPage);
    await listPage.goto();

    // 断言：表格可见
    await expect(listPage.reportTable).toBeVisible();

    // 断言：列表中有数据行
    const rowCount = await listPage.getRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('报告列表显示关键列信息', async ({ doctorPage }) => {
    const listPage = new ReportListPage(doctorPage);
    await listPage.goto();

    // 断言：表格包含关键列标题
    const tableHeader = listPage.reportTable.locator('thead');
    await expect(tableHeader).toContainText('患者姓名');
    await expect(tableHeader).toContainText('体检日期');
    await expect(tableHeader).toContainText('状态');
  });
});
