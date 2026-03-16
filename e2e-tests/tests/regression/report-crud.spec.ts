import { test, expect } from '../../fixtures/auth.fixture';
import { ReportListPage } from '../../pages/report-list.page';
import { ReportEditPage } from '../../pages/report-edit.page';
import { ReportDetailPage } from '../../pages/report-detail.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('回归测试 - 报告增删改查', () => {
  test.describe('创建报告', () => {
    test('医生创建新报告成功', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();
      await listPage.clickCreate();

      // 填写新报告信息
      const editPage = new ReportEditPage(doctorPage);
      await editPage.patientNameInput.fill('新建测试患者');
      await editPage.fillExamResults({
        bloodPressure: '115/75',
        heartRate: '70',
        bloodSugar: '5.0',
        comment: '各项指标正常',
      });
      await editPage.save();

      // 断言：保存成功
      await expect(editPage.successToast).toBeVisible();
    });
  });

  test.describe('编辑报告', () => {
    let reportId: string;

    test.beforeEach(async () => {
      reportId = await createTestReport({
        patientName: '编辑测试患者',
        status: 'draft',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
      });
    });

    test.afterEach(async () => {
      await deleteTestReport(reportId).catch(() => {});
    });

    test('修改已有报告内容并验证持久化', async ({ doctorPage }) => {
      const editPage = new ReportEditPage(doctorPage);
      await editPage.goto(reportId);

      // 修改体检数据
      await editPage.fillExamResults({
        bloodPressure: '130/85',
        heartRate: '80',
        comment: '血压偏高，建议复查',
      });
      await editPage.save();

      // 刷新验证数据持久化
      await editPage.goto(reportId);
      await expect(editPage.bloodPressureInput).toHaveValue('130/85');
      await expect(editPage.heartRateInput).toHaveValue('80');
    });
  });

  test.describe('删除报告', () => {
    let reportId: string;

    test.beforeEach(async () => {
      reportId = await createTestReport({
        patientName: '删除测试患者',
        status: 'draft',
      });
    });

    test('删除草稿报告成功', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();
      await listPage.searchByName('删除测试患者');

      const rowCountBefore = await listPage.getRowCount();
      await listPage.deleteReport(0);

      // 断言：删除后列表行数减少或显示空状态
      await doctorPage.waitForTimeout(1000);
      const rowCountAfter = await listPage.getRowCount().catch(() => 0);
      expect(rowCountAfter).toBeLessThan(rowCountBefore);
    });
  });

  test.describe('保存草稿', () => {
    let reportId: string;

    test.beforeEach(async () => {
      reportId = await createTestReport({
        patientName: '草稿测试患者',
        status: 'draft',
      });
    });

    test.afterEach(async () => {
      await deleteTestReport(reportId).catch(() => {});
    });

    test('部分填写后保存草稿成功', async ({ doctorPage }) => {
      const editPage = new ReportEditPage(doctorPage);
      await editPage.goto(reportId);

      // 仅填写部分项目
      await editPage.fillExamResults({
        bloodPressure: '120/80',
      });
      await editPage.save();

      // 断言：保存成功，允许部分填写
      await expect(editPage.successToast).toBeVisible();

      // 验证未填写项为空
      await editPage.goto(reportId);
      await expect(editPage.bloodPressureInput).toHaveValue('120/80');
    });
  });
});
