import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false, // 禁用并行执行以避免 fixture 冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'results/junit-report.xml' }],
        ['allure-playwright'],
      ]
    : [['html', { open: 'on-failure', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    navigationTimeout: 30000, // 页面导航超时
    actionTimeout: 15000, // 操作超时
  },

  projects: [
    // 冒烟测试 — 仅 Chromium
    {
      name: 'smoke-chromium',
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 录制的测试
    {
      name: 'recorded',
      testMatch: /recorded\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // AI 生成测试示例
    {
      name: 'ai-example',
      testMatch: /ai-example\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 回归测试 — Chromium + Firefox
    {
      name: 'regression-chromium',
      testMatch: /regression\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-firefox',
      testMatch: /regression\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
