import { test, expect } from '../../fixtures/auth.fixture';
import { ReportEditPage } from '../../pages/report-edit.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('冒烟测试 - 报告编辑保存 (SM-04/SM-05)', () => {
  let reportId: string;

  test.beforeEach(async () => {
    // 通过 API 预创建测试报告
    reportId = await createTestReport({
      patientName: '冒烟测试患者',
      status: 'draft',
    });
  });

  test.afterEach(async () => {
    await deleteTestReport(reportId).catch(() => {});
  });

  test('SM-04: 医生编辑体检结果并保存', async ({ doctorPage }) => {
    const editPage = new ReportEditPage(doctorPage);
    await editPage.goto(reportId);

    // 填写体检结果
    await editPage.fillExamResults({
      bloodPressure: '120/80',
      heartRate: '72',
      bloodSugar: '5.6',
      comment: '各项指标正常',
    });

    // 保存
    await editPage.save();

    // 断言：保存成功
    await expect(editPage.successToast).toBeVisible();

    // 刷新页面验证数据持久化
    await editPage.goto(reportId);
    await expect(editPage.bloodPressureInput).toHaveValue('120/80');
    await expect(editPage.heartRateInput).toHaveValue('72');
  });

  test('SM-05: 医生提交审核后状态变更', async ({ doctorPage }) => {
    const editPage = new ReportEditPage(doctorPage);
    await editPage.goto(reportId);

    await editPage.fillExamResults({
      bloodPressure: '130/85',
      heartRate: '78',
      bloodSugar: '6.1',
      comment: '血压偏高，建议复查',
    });
    await editPage.save();
    await editPage.submitForAudit();

    // 断言：状态变为待审核
    await expect(editPage.statusTag).toHaveText('待审核');
  });
});
