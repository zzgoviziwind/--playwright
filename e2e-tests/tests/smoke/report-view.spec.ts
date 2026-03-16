import { test, expect } from '../../fixtures/data.fixture';
import { ReportListPage } from '../../pages/report-list.page';
import { ReportDetailPage } from '../../pages/report-detail.page';

test.describe('冒烟测试 - 查看报告详情 (SM-03)', () => {
  test('从列表点击查看，详情页正确加载', async ({ doctorPage, draftReport }) => {
    const detailPage = new ReportDetailPage(doctorPage);
    await detailPage.goto(draftReport);

    // 断言：详情页核心信息可见
    await expect(detailPage.patientName).toBeVisible();
    await expect(detailPage.examDate).toBeVisible();
    await expect(detailPage.statusTag).toBeVisible();
  });

  test('详情页显示体检项目结果', async ({ doctorPage, draftReport }) => {
    const detailPage = new ReportDetailPage(doctorPage);
    await detailPage.goto(draftReport);

    // 断言：体检项目区域可见
    await expect(detailPage.bloodPressure).toBeVisible();
    await expect(detailPage.heartRate).toBeVisible();
    await expect(detailPage.bloodSugar).toBeVisible();
  });
});
