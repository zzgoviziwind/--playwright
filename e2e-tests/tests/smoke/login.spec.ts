// AI 生成 - 2026-03-16
// 测试流程：登录 - 总检 - 主检评估 - 开始主检 - 总检

import { test, expect } from '../../fixtures/data.fixture';

test.describe('登录 - 总检 - 主检评估流程测试', () => {
  test('验证管理员可成功登录系统', async ({ adminPage }) => {
    // 登录成功后验证 URL 包含预约页面
    await expect(adminPage).toHaveURL(/.*reservation.*/);
    await expect(adminPage.locator('text=武汉光谷医院')).toBeVisible();
  });

  test('验证管理员可访问主检评估页面', async ({ adminPage }) => {
    // 直接导航到主检评估页面
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 验证 URL 包含主检评估路径
    await expect(adminPage).toHaveURL(/.*general-list.*/);

    // 验证页面加载成功，包含搜索框（使用 placeholder 定位）
    await expect(adminPage.locator('input[placeholder*="姓名"], input[placeholder*="卡号"], input[placeholder*="单位名"]').first()).toBeVisible();
  });

  test('验证管理员可查询待评估列表', async ({ adminPage }) => {
    // 导航到主检评估页面
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    // 点击查询按钮
    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    // 验证列表加载成功（表格应该有数据）
    const table = adminPage.locator('table').nth(1);
    await expect(table).toBeVisible();
  });

  test('验证管理员可开始主检', async ({ adminPage }) => {
    // 导航到主检评估页面
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    // 点击查询按钮加载数据
    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    // 点击第一个"开始主检"按钮
    const startBtn = adminPage.getByRole('button', { name: '开始主检' }).first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 等待页面跳转到主检详情页
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 验证 URL 包含主检详情路径
    await expect(adminPage).toHaveURL(/.*inspectionmanage\/general.*/);

    // 验证页面加载成功，包含患者信息
    await expect(adminPage.locator('text=客户资料')).toBeVisible();
  });

  test('验证主检详情页可访问报告预览', async ({ adminPage }) => {
    // 导航到主检评估页面并开始主检
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    await adminPage.getByRole('button', { name: '开始主检' }).first().click();
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 验证报告预览按钮存在（使用精确匹配）
    const previewBtn = adminPage.getByRole('button', { name: '报告预览', exact: true });
    await expect(previewBtn).toBeVisible();
  });

  test('验证主检详情页可返回总检列表', async ({ adminPage }) => {
    // 导航到主检评估页面并开始主检
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    await adminPage.getByRole('button', { name: '开始主检' }).first().click();
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 点击返回列表按钮
    const backBtn = adminPage.getByText('返回列表');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // 等待页面跳转回列表
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    // 验证 URL 包含总检列表路径
    await expect(adminPage).toHaveURL(/.*general-list.*/);
  });

  test('验证主检详情页可执行总检操作（总检按钮存在）', async ({ adminPage }) => {
    // 导航到主检评估页面并开始主检
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    await adminPage.getByRole('button', { name: '开始主检' }).first().click();
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 验证总检按钮存在（快捷键 ALT+S）
    const generalInspectionBtn = adminPage.locator('button:has-text("总检")').first();
    await expect(generalInspectionBtn).toBeVisible();
  });

  test('验证完整流程：登录 -> 总检 -> 主检评估 -> 开始主检 -> 查看总检按钮', async ({ adminPage }) => {
    // 1. 登录 - 已通过 fixture 完成

    // 2. 导航到总检管理页面（点击总检菜单）
    await adminPage.getByText('总检').click();
    await adminPage.waitForTimeout(1000);

    // 3. 直接导航到主检评估页面
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    // 4. 查询待评估列表
    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    // 5. 开始主检
    await adminPage.getByRole('button', { name: '开始主检' }).first().click();
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 6. 验证总检按钮存在且可用
    const generalInspectionBtn = adminPage.locator('button:has-text("总检")').first();
    await expect(generalInspectionBtn).toBeVisible();

    // 7. 验证页面包含必要元素
    await expect(adminPage.locator('text=客户资料')).toBeVisible();
    await expect(adminPage.getByRole('button', { name: '报告预览', exact: true })).toBeVisible();
    await expect(adminPage.getByText('返回列表')).toBeVisible();
  });

  test('验证总检流程：开始主检后可看到总检相关操作', async ({ adminPage }) => {
    // 导航到主检评估页面
    await adminPage.goto('#/inspectionmanage/general-list');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(500);

    // 查询数据
    await adminPage.getByRole('button', { name: '查询' }).click();
    await adminPage.waitForLoadState('networkidle');

    // 开始主检
    await adminPage.getByRole('button', { name: '开始主检' }).first().click();
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);

    // 验证可以看到总检相关操作按钮
    // 取消总检按钮
    await expect(adminPage.getByText('取消总检')).toBeVisible();

    // 解锁按钮
    await expect(adminPage.getByText('解锁')).toBeVisible();

    // 驳回分科按钮
    await expect(adminPage.getByText('驳回分科')).toBeVisible();
  });
});
