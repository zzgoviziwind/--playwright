import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const users = {
  admin: { username: 'admin', password: 'helian@2025' },
};

// 使用绝对路径
const authDir = path.join(process.cwd(), 'fixtures', '.auth');

// 确保 .auth 目录存在
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

for (const [role, cred] of Object.entries(users)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    console.log(`\n========== Starting login for ${role} ==========`);
    await page.goto('/login');
    console.log(`Current URL after goto /login: ${page.url()}`);
    
    await page.getByPlaceholder('请输入账号').fill(cred.username);
    await page.getByPlaceholder('请输入密码').fill(cred.password);
    await page.getByText('登录').click();
    
    console.log(`Waiting for URL change...`);
    await page.waitForURL('**/reservation/company**', { timeout: 10000 });
    console.log(`Current URL after login: ${page.url()}`);
    
    // 等待网络请求完成，确保认证完成
    await page.waitForLoadState('networkidle');
    // 额外等待，确保 localStorage 已设置
    await page.waitForTimeout(2000);
    
    // 检查所有存储内容
    const allStorage = await page.evaluate(() => {
      const data: any = {
        localStorage: {} as Record<string, string>,
        sessionStorage: {} as Record<string, string>,
      };
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            data.localStorage[key] = value;
          }
        }
      }
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key !== null) {
          const value = sessionStorage.getItem(key);
          if (value !== null) {
            data.sessionStorage[key] = value;
          }
        }
      }
      
      return data;
    });
    
    console.log(`LocalStorage keys: ${Object.keys(allStorage.localStorage).length}`);
    console.log(`SessionStorage keys: ${Object.keys(allStorage.sessionStorage).length}`);
    if (Object.keys(allStorage.localStorage).length > 0) {
      console.log(`LocalStorage content (first 3 keys):`);
      Object.entries(allStorage.localStorage).slice(0, 3).forEach(([key, value]) => {
        console.log(`  ${key}: ${(value as string).substring(0, 100)}...`);
      });
    }
    if (Object.keys(allStorage.sessionStorage).length > 0) {
      console.log(`SessionStorage content (first 3 keys):`);
      Object.entries(allStorage.sessionStorage).slice(0, 3).forEach(([key, value]) => {
        console.log(`  ${key}: ${(value as string).substring(0, 100)}...`);
      });
    }
    
    // 检查 cookies
    const cookies = await page.context().cookies();
    console.log(`\nCookies count: ${cookies.length}`);
    if (cookies.length > 0) {
      console.log('Cookies:');
      cookies.forEach((cookie, i) => {
        console.log(`  [${i}] ${cookie.name} = ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain})`);
      });
    }
    
    const authPath = path.join(authDir, `${role}.json`);
    console.log(`\nSaving auth state to: ${authPath}`);
    
    // 保存完整的 storage state（包含 localStorage 和 sessionStorage）
    const storageState = await page.context().storageState();
    console.log(`Storage state - Cookies: ${storageState.cookies.length}, Origins: ${storageState.origins.length}`);
    if (storageState.origins.length > 0) {
      console.log(`Origins: ${storageState.origins.map((o: any) => o.origin).join(', ')}`);
    }
    
    // 手动保存 localStorage 和 sessionStorage 数据
    const fullAuthData = {
      ...storageState,
      localStorage: allStorage.localStorage,
      sessionStorage: allStorage.sessionStorage,
    };
    
    // 手动写入文件
    const fs = require('fs');
    fs.writeFileSync(authPath, JSON.stringify(fullAuthData, null, 2));
    console.log(`File written: ${authPath} (exists: ${fs.existsSync(authPath)})`);
    console.log(`SessionStorage saved: ${Object.keys(allStorage.sessionStorage).length} keys`);
    console.log(`========== Completed login for ${role} ==========\n`);
  });
}
