import { test, expect } from '../../fixtures/auth.fixture';
import { ReportDetailPage } from '../../pages/report-detail.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('回归测试 - 报告发布与查看', () => {
  test.describe('发布报告', () => {
    let reportId: string;

    test.beforeEach(async () => {
      reportId = await createTestReport({
        patientName: '发布测试患者',
        status: 'audited',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
        doctorComment: '各项指标正常',
      });
    });

    test.afterEach(async () => {
      await deleteTestReport(reportId).catch(() => {});
    });

    test('管理员发布已审核报告，状态变为已发布', async ({ adminPage }) => {
      const detailPage = new ReportDetailPage(adminPage);
      await detailPage.goto(reportId);

      // 验证当前为已审核状态
      await expect(detailPage.statusTag).toHaveText('已审核');

      // 点击发布
      await detailPage.clickPublish();

      // 断言：状态变为已发布
      await expect(detailPage.statusTag).toHaveText('已发布');
    });
  });

  test.describe('查看已发布报告', () => {
    let publishedReportId: string;

    test.beforeAll(async () => {
      publishedReportId = await createTestReport({
        patientName: '已发布查看测试',
        status: 'published',
        examData: { bloodPressure: '118/75', heartRate: '68', bloodSugar: '4.8' },
        doctorComment: '各项指标正常，建议保持良好生活习惯',
      });
    });

    test.afterAll(async () => {
      await deleteTestReport(publishedReportId).catch(() => {});
    });

    test('已发布报告可以在公开页面查看', async ({ adminPage }) => {
      // 访问公开查看页面
      await adminPage.goto(`/public/reports/${publishedReportId}`);

      // 断言：报告内容可见
      const patientName = adminPage.getByTestId('public-patient-name');
      await expect(patientName).toBeVisible();
      await expect(patientName).toHaveText('已发布查看测试');
    });

    test('已发布报告显示完整体检数据', async ({ adminPage }) => {
      await adminPage.goto(`/public/reports/${publishedReportId}`);

      const bloodPressure = adminPage.getByTestId('public-blood-pressure');
      const heartRate = adminPage.getByTestId('public-heart-rate');

      await expect(bloodPressure).toHaveText('118/75');
      await expect(heartRate).toHaveText('68');
    });
  });

  test.describe('未发布报告不可查看', () => {
    let draftReportId: string;

    test.beforeAll(async () => {
      draftReportId = await createTestReport({
        patientName: '未发布查看测试',
        status: 'draft',
      });
    });

    test.afterAll(async () => {
      await deleteTestReport(draftReportId).catch(() => {});
    });

    test('未发布报告在公开页面不可访问', async ({ adminPage }) => {
      const response = await adminPage.goto(`/public/reports/${draftReportId}`);

      // 断言：页面返回 403/404 或显示不可访问提示
      const notFoundMessage = adminPage.getByText('报告不存在或未发布');
      const isForbidden = response?.status() === 403 || response?.status() === 404;
      const hasMessage = await notFoundMessage.isVisible().catch(() => false);

      expect(isForbidden || hasMessage).toBeTruthy();
    });
  });
});
