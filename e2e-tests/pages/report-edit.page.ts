import { type Page, type Locator } from '@playwright/test';

export class ReportEditPage {
  readonly page: Page;

  // 定位器
  readonly patientNameInput: Locator;
  readonly bloodPressureInput: Locator;
  readonly heartRateInput: Locator;
  readonly bloodSugarInput: Locator;
  readonly doctorCommentInput: Locator;
  readonly saveButton: Locator;
  readonly submitAuditButton: Locator;
  readonly successToast: Locator;
  readonly statusTag: Locator;
  readonly formValidationErrors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.patientNameInput = page.getByTestId('input-patient-name');
    this.bloodPressureInput = page.getByTestId('input-blood-pressure');
    this.heartRateInput = page.getByTestId('input-heart-rate');
    this.bloodSugarInput = page.getByTestId('input-blood-sugar');
    this.doctorCommentInput = page.getByTestId('input-doctor-comment');
    this.saveButton = page.getByTestId('btn-save');
    this.submitAuditButton = page.getByTestId('btn-submit-audit');
    this.successToast = page.getByText('保存成功');
    this.statusTag = page.getByTestId('report-status');
    this.formValidationErrors = page.locator('.el-form-item__error');
  }

  async goto(reportId: string) {
    if (!reportId || reportId === 'undefined') {
      throw new Error('Report ID is required and cannot be undefined');
    }
    await this.page.goto(`/reports/${reportId}/edit`);
    // 等待编辑页面加载完成
    await this.patientNameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 填写体检结果（支持部分填写）
   */
  async fillExamResults(data: {
    bloodPressure?: string;
    heartRate?: string;
    bloodSugar?: string;
    comment?: string;
  }) {
    if (data.bloodPressure) {
      await this.bloodPressureInput.clear();
      await this.bloodPressureInput.fill(data.bloodPressure);
    }
    if (data.heartRate) {
      await this.heartRateInput.clear();
      await this.heartRateInput.fill(data.heartRate);
    }
    if (data.bloodSugar) {
      await this.bloodSugarInput.clear();
      await this.bloodSugarInput.fill(data.bloodSugar);
    }
    if (data.comment) {
      await this.doctorCommentInput.clear();
      await this.doctorCommentInput.fill(data.comment);
    }
  }

  /**
   * 保存报告并等待成功提示
   */
  async save() {
    await this.saveButton.click();
    await this.successToast.waitFor({ state: 'visible' });
  }

  /**
   * 提交审核（含确认弹窗处理）
   */
  async submitForAudit() {
    await this.submitAuditButton.click();
    // 等待确认弹窗并确认
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  /**
   * 获取报告当前状态
   */
  async getStatus(): Promise<string> {
    return (await this.statusTag.textContent()) ?? '';
  }

  /**
   * 获取表单校验错误数量
   */
  async getValidationErrorCount(): Promise<number> {
    return await this.formValidationErrors.count();
  }
}
