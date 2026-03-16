import { test as base, type Page } from '@playwright/test';

type RoleFixtures = {
  doctorPage: Page;
  auditorPage: Page;
  adminPage: Page;
};

// 登录凭据
const credentials = {
  admin: { username: 'admin', password: 'helian@2025' },
  doctor: { username: 'doctor', password: 'helian@2025' },
  auditor: { username: 'auditor', password: 'helian@2025' },
};

// 登录函数
async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByText('登录').click();
  await page.waitForURL('**/reservation/company**', { timeout: 15000 });
}

export const test = base.extend<RoleFixtures>({
  doctorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, credentials.doctor.username, credentials.doctor.password);
    await use(page);
    await ctx.close();
  },

  auditorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, credentials.auditor.username, credentials.auditor.password);
    await use(page);
    await ctx.close();
  },

  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, credentials.admin.username, credentials.admin.password);
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
