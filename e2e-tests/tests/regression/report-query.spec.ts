import { test, expect } from '../../fixtures/auth.fixture';
import { ReportListPage } from '../../pages/report-list.page';
import { createTestReport, deleteTestReport } from '../../utils/api-helper';

test.describe('回归测试 - 查询过滤排序', () => {
  const reportIds: string[] = [];

  test.beforeAll(async () => {
    // 预创建多条不同状态/姓名的报告供查询测试使用
    reportIds.push(
      await createTestReport({
        patientName: '查询测试_张三',
        status: 'draft',
      })
    );
    reportIds.push(
      await createTestReport({
        patientName: '查询测试_李四',
        status: 'pending_audit',
        examData: { bloodPressure: '120/80', heartRate: '72', bloodSugar: '5.6' },
      })
    );
    reportIds.push(
      await createTestReport({
        patientName: '查询测试_王五',
        status: 'audited',
        examData: { bloodPressure: '130/85', heartRate: '78', bloodSugar: '6.1' },
      })
    );
    reportIds.push(
      await createTestReport({
        patientName: '查询测试_张伟',
        status: 'draft',
      })
    );
  });

  test.afterAll(async () => {
    for (const id of reportIds) {
      await deleteTestReport(id).catch(() => {});
    }
  });

  test.describe('按姓名搜索', () => {
    test('搜索结果只包含匹配项', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();
      await listPage.searchByName('查询测试_张');

      // 断言：搜索结果中的患者姓名包含"张"
      const rowCount = await listPage.getRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < rowCount; i++) {
        const name = await listPage.getPatientNameInRow(i);
        expect(name).toContain('张');
      }
    });

    test('搜索无结果时显示空状态', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();
      await listPage.searchByName('不存在的患者名称XYZ');

      // 断言：显示空状态或行数为 0
      const rowCount = await listPage.getRowCount().catch(() => 0);
      expect(rowCount).toBe(0);
    });
  });

  test.describe('按状态过滤', () => {
    test('过滤草稿状态报告', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();
      await listPage.filterByStatus('草稿');

      const rowCount = await listPage.getRowCount();
      expect(rowCount).toBeGreaterThan(0);

      // 断言：所有行状态均为草稿
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const status = await listPage.getReportStatusInRow(i);
        expect(status).toBe('草稿');
      }
    });

    test('过滤待审核状态报告', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();
      await listPage.filterByStatus('待审核');

      const rowCount = await listPage.getRowCount();
      expect(rowCount).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const status = await listPage.getReportStatusInRow(i);
        expect(status).toBe('待审核');
      }
    });
  });

  test.describe('分页', () => {
    test('翻页后数据变化', async ({ doctorPage }) => {
      const listPage = new ReportListPage(doctorPage);
      await listPage.goto();

      // 获取第一页第一行患者姓名
      const firstPageName = await listPage.getPatientNameInRow(0);

      // 如果有下一页按钮可用则翻页
      const isNextEnabled = await listPage.pageNextButton.isEnabled().catch(() => false);
      if (isNextEnabled) {
        await listPage.goToNextPage();

        // 断言：翻页后第一行数据变化
        const secondPageName = await listPage.getPatientNameInRow(0);
        expect(secondPageName).not.toBe(firstPageName);
      }
    });
  });
});
