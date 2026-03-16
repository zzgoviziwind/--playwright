import { type Page, type Locator } from '@playwright/test';

export class AuditPage {
  readonly page: Page;

  // 报告内容（只读展示）
  readonly patientName: Locator;
  readonly patientId: Locator;
  readonly bloodPressure: Locator;
  readonly heartRate: Locator;
  readonly bloodSugar: Locator;
  readonly doctorComment: Locator;

  // 审核操作
  readonly auditCommentInput: Locator;
  readonly rejectReasonInput: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly statusTag: Locator;
  readonly auditHistoryList: Locator;

  constructor(page: Page) {
    this.page = page;

    // 报告内容
    this.patientName = page.getByTestId('audit-patient-name');
    this.patientId = page.getByTestId('audit-patient-id');
    this.bloodPressure = page.getByTestId('audit-blood-pressure');
    this.heartRate = page.getByTestId('audit-heart-rate');
    this.bloodSugar = page.getByTestId('audit-blood-sugar');
    this.doctorComment = page.getByTestId('audit-doctor-comment');

    // 审核操作
    this.auditCommentInput = page.getByTestId('input-audit-comment');
    this.rejectReasonInput = page.getByTestId('input-reject-reason');
    this.approveButton = page.getByTestId('btn-approve');
    this.rejectButton = page.getByTestId('btn-reject');
    this.statusTag = page.getByTestId('report-status');
    this.auditHistoryList = page.getByTestId('audit-history');
  }

  async goto(reportId: string) {
    await this.page.goto(`/reports/${reportId}/audit`);
    await this.patientName.waitFor({ state: 'visible' });
  }

  /**
   * 审核通过：填写审核意见 → 点击通过 → 确认
   */
  async approve(comment: string) {
    await this.auditCommentInput.fill(comment);
    await this.approveButton.click();
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  /**
   * 审核退回：填写退回原因 → 点击退回 → 确认
   */
  async reject(reason: string) {
    await this.rejectReasonInput.fill(reason);
    await this.rejectButton.click();
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  /**
   * 获取报告当前状态
   */
  async getStatus(): Promise<string> {
    return (await this.statusTag.textContent()) ?? '';
  }
}
