import { type Page } from '@playwright/test';

export class NavigationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 导航到报告列表页面（通过菜单）
   */
  async gotoReportsList() {
    // 等待页面加载完成
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500);

    // 检查当前 URL，如果包含登录页则尝试访问主页
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login')) {
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }

    // 尝试点击"报告管理"或相关菜单项
    // 使用更宽松的匹配策略
    const reportMenuSelectors = [
      'text=报告管理',
      'text=报告',
      'text=体检报告',
      'text=报告列表',
      '[data-testid="menu-reports"]',
      '[data-testid="menu-report-management"]',
    ];

    for (const selector of reportMenuSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click({ timeout: 5000 });
          await this.page.waitForLoadState('networkidle');
          await this.page.waitForTimeout(1000); // 等待 SPA 路由更新
          return;
        }
      } catch (e) {
        continue;
      }
    }

    // 尝试展开可能的菜单分组
    const menuGroups = ['体检登记', '报告中心', '体检管理'];
    for (const groupText of menuGroups) {
      try {
        const groupMenu = this.page.getByText(groupText, { exact: true }).first();
        if (await groupMenu.count() > 0) {
          await groupMenu.click({ timeout: 5000 });
          await this.page.waitForTimeout(500);

          // 在展开的子菜单中查找报告相关选项
          const submenuOptions = ['报告', '报告列表', '报告管理', '体检报告'];
          for (const submenuText of submenuOptions) {
            try {
              const submenu = this.page.getByText(submenuText, { exact: true }).first();
              if (await submenu.count() > 0) {
                await submenu.click({ timeout: 5000 });
                await this.page.waitForLoadState('networkidle');
                await this.page.waitForTimeout(1000);
                return;
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    // 如果所有菜单尝试都失败，尝试访问主页然后再试
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // 最后一次尝试直接访问（可能需要先通过主页认证）
    await this.page.goto('/reports');
    await this.page.waitForLoadState('networkidle');
  }
}