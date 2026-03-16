import { test, expect } from '../../fixtures/auth.fixture';
import { AuditPage } from '../../pages/audit.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('冒烟测试 - 审核流程 (SM-06)', () => {
  let reportId: string;

  test.beforeEach(async () => {
    // 通过 API 创建一条"待审核"状态的报告
    reportId = await createTestReport({
      patientName: '审核测试患者',
      status: 'pending_audit',
      examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
    });
  });

  test.afterEach(async () => {
    await deleteTestReport(reportId).catch(() => {});
  });

  test('SM-06: 审核医生审核通过报告', async ({ auditorPage }) => {
    const auditPage = new AuditPage(auditorPage);
    await auditPage.goto(reportId);

    // 验证报告内容可见
    await expect(auditPage.patientName).toHaveText('审核测试患者');
    await expect(auditPage.bloodPressure).toHaveText('120/80');

    // 审核通过
    await auditPage.approve('审核通过，结果无异常');

    // 断言：状态变为已审核
    await expect(auditPage.statusTag).toHaveText('已审核');
  });
});
