import { test, expect } from '@playwright/test';

test('录制的测试', async ({ page }) => {
  await page.goto('http://10.20.3.2:9942/');
  await page.click('input.active');
  await page.fill('input.active', 'admin');
  await page.click('input.active');
  await page.fill('input.active', 'helian@2025');
  await page.click('div#app > div > div > div > div > span');
  await page.goto('http://10.20.3.2:9942/#/reservation/company');
  await page.click('span.menu');
  await page.goto('http://10.20.3.2:9942/#/inspectionmanage/general-list');
  await page.click('div#app > div > div > div > div > div > table > tbody > tr > td > div > button > span');
  await page.click('button.el-button.el-button--default.el-button--small.el-button--primary');
  await page.goto('http://10.20.3.2:9942/#/inspectionmanage/general?idPatient=46221&type=1');
  await page.click('div#app > div > div > div > div > div > button > span');
  await page.click('button.el-button--default.el-button--small.el-button--primary');
  await page.click('div#app > div > div > div > div > div > button > span');
});
