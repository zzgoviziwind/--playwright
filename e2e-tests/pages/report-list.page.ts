import { type Page, type Locator } from '@playwright/test';
import { NavigationPage } from './navigation.page';

export class ReportListPage {
  readonly page: Page;

  // 定位器
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly statusFilter: Locator;
  readonly dateRangeFilter: Locator;
  readonly reportTable: Locator;
  readonly tableRows: Locator;
  readonly emptyState: Locator;
  readonly createButton: Locator;
  readonly paginationInfo: Locator;
  readonly pageNextButton: Locator;
  readonly pagePrevButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('input-search');
    this.searchButton = page.getByTestId('btn-search');
    this.statusFilter = page.getByTestId('select-status');
    this.dateRangeFilter = page.getByTestId('date-range-filter');
    this.reportTable = page.getByTestId('report-table');
    this.tableRows = page.getByTestId('report-table').locator('tbody tr');
    this.emptyState = page.getByTestId('empty-state');
    this.createButton = page.getByTestId('btn-create-report');
    this.paginationInfo = page.getByTestId('pagination-info');
    this.pageNextButton = page.getByTestId('btn-page-next');
    this.pagePrevButton = page.getByTestId('btn-page-prev');
  }

  async goto() {
    // 首先等待页面完全加载
    await this.page.waitForLoadState('domcontentloaded');

    // 检查当前 URL，如果包含登录页则重新导航
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login')) {
      // 已经在登录页，说明会话失效，尝试访问主页
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');
    }

    // 检查是否已经在报告列表页面
    const updatedUrl = this.page.url();
    if (updatedUrl.includes('/reports')) {
      // 已经在报告列表页，只需刷新确保数据最新
      await this.page.reload({ waitUntil: 'networkidle' });
      await this.waitForTableLoaded();
      return;
    }

    // 使用 NavigationPage 通过菜单导航到报告列表
    const navPage = new NavigationPage(this.page);
    await navPage.gotoReportsList();

    // 等待表格加载完成
    await this.waitForTableLoaded();
  }

  /**
   * 等待报告表格加载完成
   */
  private async waitForTableLoaded() {
    // 等待页面加载完成
    await this.page.waitForLoadState('networkidle');

    // 等待任意内容加载，不一定非要特定的 testid
    try {
      await this.page.waitForSelector('[data-testid="report-table"], [data-testid="empty-state"], table, .el-table', {
        state: 'visible',
        timeout: 10000,
      });
    } catch (e) {
      // 如果主要元素未找到，尝试等待一小段时间
      // 使用 request/response 等待而不是固定超时
      try {
        await this.page.waitForResponse(
          (resp) => resp.url().includes('/api/reports') && resp.status() === 200,
          { timeout: 5000 }
        );
      } catch (e2) {
        // 如果 API 响应也未找到，继续执行
      }
    }
  }

  /**
   * 按患者姓名搜索
   */
  async searchByName(name: string) {
    await this.searchInput.fill(name);
    await this.searchButton.click();
    // 等待表格刷新（Vue SPA 局部更新）
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/reports') && resp.status() === 200
    );
  }

  /**
   * 按状态筛选
   */
  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/reports') && resp.status() === 200
    );
  }

  /**
   * 点击查看指定行的报告
   */
  async openReport(index: number) {
    await this.tableRows.nth(index).getByTestId('btn-view').click();
  }

  /**
   * 点击编辑指定行的报告
   */
  async editReport(index: number) {
    await this.tableRows.nth(index).getByTestId('btn-edit').click();
  }

  /**
   * 点击删除指定行的报告
   */
  async deleteReport(index: number) {
    await this.tableRows.nth(index).getByTestId('btn-delete').click();
    // 等待确认弹窗并确认
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  /**
   * 获取当前表格行数
   */
  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * 获取指定行的报告状态
   */
  async getReportStatusInRow(index: number): Promise<string> {
    return (
      (await this.tableRows.nth(index).getByTestId('cell-status').textContent()) ?? ''
    );
  }

  /**
   * 获取指定行的患者姓名
   */
  async getPatientNameInRow(index: number): Promise<string> {
    return (
      (await this.tableRows
        .nth(index)
        .getByTestId('cell-patient-name')
        .textContent()) ?? ''
    );
  }

  /**
   * 点击下一页
   */
  async goToNextPage() {
    await this.pageNextButton.click();
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/reports') && resp.status() === 200
    );
  }

  /**
   * 点击新建报告
   */
  async clickCreate() {
    await this.createButton.click();
  }
}
