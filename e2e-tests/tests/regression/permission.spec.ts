import { test, expect } from '../../fixtures/auth.fixture';
import { ReportListPage } from '../../pages/report-list.page';
import { ReportDetailPage } from '../../pages/report-detail.page';
import { ReportEditPage } from '../../pages/report-edit.page';
import { AuditPage } from '../../pages/audit.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('回归测试 - 角色权限控制', () => {
  let draftReportId: string;
  let pendingReportId: string;
  let auditedReportId: string;

  test.beforeAll(async () => {
    draftReportId = await createTestReport({
      patientName: '权限测试_草稿报告',
      status: 'draft',
    });
    pendingReportId = await createTestReport({
      patientName: '权限测试_待审核报告',
      status: 'pending_audit',
      examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
    });
    auditedReportId = await createTestReport({
      patientName: '权限测试_已审核报告',
      status: 'audited',
      examData: { bloodPressure: '125/82', heartRate: '76', bloodSugar: '5.2' },
    });
  });

  test.afterAll(async () => {
    await deleteTestReport(draftReportId).catch(() => {});
    await deleteTestReport(pendingReportId).catch(() => {});
    await deleteTestReport(auditedReportId).catch(() => {});
  });

  test.describe('医生权限', () => {
    test('医生可以编辑自己创建的草稿报告', async ({ doctorPage }) => {
      const editPage = new ReportEditPage(doctorPage);
      await editPage.goto(draftReportId);

      // 断言：编辑页面可访问，保存按钮可用
      await expect(editPage.saveButton).toBeVisible();
      await expect(editPage.saveButton).toBeEnabled();
    });

    test('医生无审核按钮', async ({ doctorPage }) => {
      const detailPage = new ReportDetailPage(doctorPage);
      await detailPage.goto(pendingReportId);

      // 断言：页面上没有审核通过/退回按钮
      const approveButton = doctorPage.getByTestId('btn-approve');
      const rejectButton = doctorPage.getByTestId('btn-reject');
      await expect(approveButton).not.toBeVisible();
      await expect(rejectButton).not.toBeVisible();
    });
  });

  test.describe('审核医生权限', () => {
    test('审核医生可以审核待审核报告', async ({ auditorPage }) => {
      const auditPage = new AuditPage(auditorPage);
      await auditPage.goto(pendingReportId);

      // 断言：审核按钮可见可用
      await expect(auditPage.approveButton).toBeVisible();
      await expect(auditPage.approveButton).toBeEnabled();
      await expect(auditPage.rejectButton).toBeVisible();
      await expect(auditPage.rejectButton).toBeEnabled();
    });

    test('审核医生编辑按钮不可用', async ({ auditorPage }) => {
      const detailPage = new ReportDetailPage(auditorPage);
      await detailPage.goto(draftReportId);

      // 断言：编辑按钮不可见或禁用
      const isEditVisible = await detailPage.editButton.isVisible().catch(() => false);
      if (isEditVisible) {
        await expect(detailPage.editButton).toBeDisabled();
      }
    });
  });

  test.describe('管理员权限', () => {
    test('管理员可以发布已审核报告', async ({ adminPage }) => {
      const detailPage = new ReportDetailPage(adminPage);
      await detailPage.goto(auditedReportId);

      // 断言：发布按钮可见可用
      await expect(detailPage.publishButton).toBeVisible();
      await expect(detailPage.publishButton).toBeEnabled();
    });

    test('管理员可以作废已审核报告', async ({ adminPage }) => {
      const detailPage = new ReportDetailPage(adminPage);
      await detailPage.goto(auditedReportId);

      // 断言：作废按钮可见可用
      await expect(detailPage.voidButton).toBeVisible();
      await expect(detailPage.voidButton).toBeEnabled();
    });
  });
});
