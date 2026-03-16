import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // 定位器
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder('请输入账号');
    this.passwordInput = page.getByPlaceholder('请输入密码');
    this.loginButton = page.getByText('登录');
    this.errorMessage = page.locator('.login-error, [class*="error"]').first();
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]').first();
  }

  async goto() {
    await this.page.goto('/login');
  }

  /**
   * 执行完整登录流程：填写凭证 → 点击登录 → 等待跳转到仪表盘
   */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/reservation/company**');
  }

  /**
   * 仅填写凭证并点击登录（不等待跳转，用于测试失败场景）
   */
  async attemptLogin(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * 获取错误提示文本
   */
  async getErrorText(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? '';
  }
}
