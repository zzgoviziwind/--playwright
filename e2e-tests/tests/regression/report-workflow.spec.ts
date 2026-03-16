import { test, expect } from '../../fixtures/auth.fixture';
import { ReportEditPage } from '../../pages/report-edit.page';
import { ReportDetailPage } from '../../pages/report-detail.page';
import { AuditPage } from '../../pages/audit.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('回归测试 - 报告状态流转', () => {
  test.describe('正向流程', () => {
    let reportId: string;

    test.beforeEach(async () => {
      reportId = await createTestReport({
        patientName: '流转测试患者',
        status: 'draft',
      });
    });

    test.afterEach(async () => {
      await deleteTestReport(reportId).catch(() => {});
    });

    test('草稿 → 待审核：医生提交审核', async ({ doctorPage }) => {
      const editPage = new ReportEditPage(doctorPage);
      await editPage.goto(reportId);

      await editPage.fillExamResults({
        bloodPressure: '120/80',
        heartRate: '72',
        bloodSugar: '5.6',
        comment: '各项指标正常',
      });
      await editPage.save();
      await editPage.submitForAudit();

      await expect(editPage.statusTag).toHaveText('待审核');
    });

    test('待审核 → 已审核：审核医生通过', async ({ auditorPage }) => {
      // 准备待审核状态的报告
      await deleteTestReport(reportId).catch(() => {});
      reportId = await createTestReport({
        patientName: '审核流转测试',
        status: 'pending_audit',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
      });

      const auditPage = new AuditPage(auditorPage);
      await auditPage.goto(reportId);
      await auditPage.approve('审核通过，结果无异常');

      await expect(auditPage.statusTag).toHaveText('已审核');
    });

    test('已审核 → 已发布：管理员发布报告', async ({ adminPage }) => {
      // 准备已审核状态的报告
      await deleteTestReport(reportId).catch(() => {});
      reportId = await createTestReport({
        patientName: '发布流转测试',
        status: 'audited',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
      });

      const detailPage = new ReportDetailPage(adminPage);
      await detailPage.goto(reportId);
      await detailPage.clickPublish();

      await expect(detailPage.statusTag).toHaveText('已发布');
    });
  });

  test.describe('逆向流程', () => {
    test('待审核 → 草稿：审核医生退回', async ({ auditorPage }) => {
      const reportId = await createTestReport({
        patientName: '退回测试患者',
        status: 'pending_audit',
        examData: { bloodPressure: '160/100', heartRate: '105', bloodSugar: '8.5' },
      });

      const auditPage = new AuditPage(auditorPage);
      await auditPage.goto(reportId);
      await auditPage.reject('血压数据疑似异常，请复查');

      await expect(auditPage.statusTag).toHaveText('草稿');

      await deleteTestReport(reportId).catch(() => {});
    });

    test('已审核 → 已作废：管理员作废报告', async ({ adminPage }) => {
      const reportId = await createTestReport({
        patientName: '作废测试患者',
        status: 'audited',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
      });

      const detailPage = new ReportDetailPage(adminPage);
      await detailPage.goto(reportId);
      await detailPage.clickVoid();

      await expect(detailPage.statusTag).toHaveText('已作废');

      await deleteTestReport(reportId).catch(() => {});
    });
  });

  test.describe('异常场景', () => {
    test('草稿状态不可直接发布', async ({ adminPage }) => {
      const reportId = await createTestReport({
        patientName: '异常流程测试A',
        status: 'draft',
      });

      const detailPage = new ReportDetailPage(adminPage);
      await detailPage.goto(reportId);

      // 断言：发布按钮不可见或禁用
      await expect(detailPage.publishButton).not.toBeVisible();

      await deleteTestReport(reportId).catch(() => {});
    });

    test('已发布状态不可编辑', async ({ doctorPage }) => {
      const reportId = await createTestReport({
        patientName: '异常流程测试B',
        status: 'published',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
      });

      const detailPage = new ReportDetailPage(doctorPage);
      await detailPage.goto(reportId);

      // 断言：编辑按钮不可见或禁用
      await expect(detailPage.editButton).not.toBeVisible();

      await deleteTestReport(reportId).catch(() => {});
    });
  });
});
