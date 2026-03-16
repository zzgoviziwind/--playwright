import { type Page, type Locator } from '@playwright/test';

export class ReportDetailPage {
  readonly page: Page;

  // 基本信息定位器
  readonly patientName: Locator;
  readonly patientId: Locator;
  readonly examDate: Locator;
  readonly statusTag: Locator;

  // 体检结果定位器
  readonly bloodPressure: Locator;
  readonly heartRate: Locator;
  readonly bloodSugar: Locator;
  readonly doctorComment: Locator;

  // 操作按钮
  readonly editButton: Locator;
  readonly publishButton: Locator;
  readonly printButton: Locator;
  readonly backButton: Locator;
  readonly voidButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // 基本信息
    this.patientName = page.getByTestId('detail-patient-name');
    this.patientId = page.getByTestId('detail-patient-id');
    this.examDate = page.getByTestId('detail-exam-date');
    this.statusTag = page.getByTestId('report-status');

    // 体检结果
    this.bloodPressure = page.getByTestId('detail-blood-pressure');
    this.heartRate = page.getByTestId('detail-heart-rate');
    this.bloodSugar = page.getByTestId('detail-blood-sugar');
    this.doctorComment = page.getByTestId('detail-doctor-comment');

    // 操作按钮
    this.editButton = page.getByTestId('btn-edit');
    this.publishButton = page.getByTestId('btn-publish');
    this.printButton = page.getByTestId('btn-print');
    this.backButton = page.getByTestId('btn-back');
    this.voidButton = page.getByTestId('btn-void');
  }

  async goto(reportId: string) {
    if (!reportId || reportId === 'undefined') {
      throw new Error('Report ID is required and cannot be undefined');
    }
    await this.page.goto(`/reports/${reportId}`);
    // 等待页面加载完成，使用更短的超时时间
    await this.patientName.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 点击编辑按钮，进入编辑页面
   */
  async clickEdit() {
    await this.editButton.click();
  }

  /**
   * 点击发布按钮
   */
  async clickPublish() {
    await this.publishButton.click();
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  /**
   * 点击作废按钮
   */
  async clickVoid() {
    await this.voidButton.click();
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  /**
   * 获取当前报告状态
   */
  async getStatus(): Promise<string> {
    return (await this.statusTag.textContent()) ?? '';
  }

  /**
   * 获取所有体检数据
   */
  async getExamData(): Promise<{
    bloodPressure: string;
    heartRate: string;
    bloodSugar: string;
    doctorComment: string;
  }> {
    return {
      bloodPressure: (await this.bloodPressure.textContent()) ?? '',
      heartRate: (await this.heartRate.textContent()) ?? '',
      bloodSugar: (await this.bloodSugar.textContent()) ?? '',
      doctorComment: (await this.doctorComment.textContent()) ?? '',
    };
  }

  /**
   * 返回列表页
   */
  async goBack() {
    await this.backButton.click();
  }
}
