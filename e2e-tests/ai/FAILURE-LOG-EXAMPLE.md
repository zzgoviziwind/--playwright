# AI 自动化测试 - 失败日志示例

本文档展示 AI 自动化测试系统的失败分析日志示例。

---

## 测试执行日志

### 执行命令

```bash
npx ts-node ai/pipeline-cli.ts run \
  --requirement "医生审核体检报告" \
  --type smoke \
  --headed
```

### Playwright 执行输出

```
Running 5 tests using 1 worker

  ✓  P0-医生可查看体检报告列表 (3.2s)
  ✓  P0-医生可查看体检报告详情 (4.1s)
  ✕  P1-医生可通过姓名搜索报告 (15.3s)
  ✓  P1-医生可查看报告结论和建议 (3.8s)
  ✕  P2-医生可使用报告预览功能 (12.1s)


  1) 测试名称：P1-医生可通过姓名搜索报告

    TimeoutError: locator.click: Timeout 15000ms exceeded.
    Call log:
      - waiting for getByText('查询')
      - element is not visible

      32 |
      33 |   await test.step('执行查询', async () => {
    > 34 |     await reportListPage.queryButton.click();
         |                                    ^
      35 |     await reportListPage.reportTable.waitFor({ state: 'visible' });
      36 |   });
      37 |
        at D:\AITest\AutoTestQoder\e2e-tests\tests\ai-example\report-view-ai.spec.ts:34:36

    attachment #1: screenshot (image/png) ────────────────────────────────────────
    test-results\report-view-ai-P1-医生可通过姓名搜索报告\test-failed-1.png
    ──────────────────────────────────────────────────────────────────────────────

    attachment #2: trace (application/zip) ───────────────────────────────────────
    test-results\report-view-ai-P1-医生可通过姓名搜索报告\trace.zip
    Usage:
        npx playwright show-trace test-results\...\trace.zip
    ──────────────────────────────────────────────────────────────────────────────

  2) 测试名称：P2-医生可使用报告预览功能

    AssertionError: expected dialog to be visible
    Location: report-view-ai.spec.ts:89
    Matcher: await expect(previewDialog).toBeVisible();
    Timeout: 5000ms

    Received: hidden
    Call log:
      - waiting for dialog to be visible
      - element is not visible

      87 |     await test.step('验证预览窗口打开', async () => {
      88 |       const previewDialog = doctorPage.locator('[role="dialog"]');
    > 89 |       await expect(previewDialog).toBeVisible();
         |                                   ^
      90 |     });
      91 |   });
      92 | });
        at D:\AITest\AutoTestQoder\e2e-tests\tests\ai-example\report-view-ai.spec.ts:89:35


  2 failed
    - P1-医生可通过姓名搜索报告
    - P2-医生可使用报告预览功能
  3 passed
  (45.2s)
```

---

## 失败分析报告

### 失败测试 1：P1-医生可通过姓名搜索报告

```markdown
# 测试失败分析报告

## 测试信息
- 测试名称：P1-医生可通过姓名搜索报告
- 失败分类：**locator**
- 置信度：95%

## 失败原因
页面查询按钮在当前状态下不可见。分析页面 HTML 快照发现，
查询按钮被隐藏在展开的搜索面板中，需要先点击"高级搜索"展开面板。

## 根因分析
前端 UI 重构后，查询按钮从默认可见状态改为需要展开"高级搜索"面板后才可见。
原有代码假设查询按钮始终可见。

## 修复建议
1. 在点击查询按钮前，先展开搜索面板
2. 使用 waitFor 等待面板展开完成

## 建议修复代码
await test.step('展开搜索面板', async () => {
  const advancedSearchBtn = page.getByText('高级搜索');
  if (await advancedSearchBtn.isVisible()) {
    await advancedSearchBtn.click();
    await page.waitForTimeout(300); // 等待展开动画
  }
});

await test.step('执行查询', async () => {
  await reportListPage.queryButton.click();
  await reportListPage.reportTable.waitFor({ state: 'visible' });
});
```

---

### 失败测试 2：P2-医生可使用报告预览功能

```markdown
# 测试失败分析报告

## 测试信息
- 测试名称：P2-医生可使用报告预览功能
- 失败分类：**timing**
- 置信度：85%

## 失败原因
报告预览弹窗打开需要时间，断言执行时弹窗尚未完成动画。

## 根因分析
报告预览功能调用了一个异步 API，在弹窗完全显示之前测试就已经执行了断言。
这是典型的时序问题（timing issue）。

## 修复建议
1. 使用 waitForSelector 等待弹窗出现
2. 增加显式等待，确保弹窗动画完成

## 建议修复代码
await test.step('验证预览窗口打开', async () => {
  // 等待预览对话框出现并完成动画
  const previewDialog = doctorPage.locator('[role="dialog"]');
  await previewDialog.waitFor({ state: 'visible', timeout: 5000 });

  // 额外等待以确保动画完成
  await doctorPage.waitForTimeout(300);

  await expect(previewDialog).toBeVisible();

  // 验证对话框包含预期内容
  await expect(previewDialog.getByText('报告预览')).toBeVisible();
});
```

---

## 自愈结果摘要

### 第一次自愈循环

| 测试 | 根因 | 修复类型 | 结果 |
|------|------|----------|------|
| P1-医生可通过姓名搜索报告 | 按钮被隐藏 | timing | ✅ 修复成功 |
| P2-医生可使用报告预览功能 | 弹窗动画未完成 | timing | ✅ 修复成功 |

### 修复后重新执行

```
Running 2 tests using 1 worker

  ✓  P1-医生可通过姓名搜索报告 (4.1s)
  ✓  P2-医生可使用报告预览功能 (3.8s)

  2 passed
  (8.5s)
```

---

## 最终测试摘要

```
============================================================
                    测试执行摘要
============================================================
功能模块：体检报告查看
测试类型：smoke
场景数量：5
生成用例：5 个
代码有效：✅

执行结果:
  ✅ 通过：5
  ❌ 失败：0 (初始 2 个，已自愈修复)
  ⏭️  跳过：0
  ⏱️  耗时：53.7s (含自愈循环)

失败分析:
  1. [timing] 查询按钮被隐藏，需要先展开面板
     置信度：95%
     修复：添加展开面板步骤

  2. [timing] 弹窗动画未完成
     置信度：85%
     修复：增加显式等待

自愈结果:
  1. ✅ [timing] 添加展开搜索面板步骤
  2. ✅ [timing] 增加弹窗等待逻辑

最终状态：✅ 全部通过
============================================================
```

---

## Trace 文件查看

使用以下命令查看失败的 Trace 文件：

```bash
npx playwright show-trace test-results/report-view-ai-P1-医生可通过姓名搜索报告/trace.zip
```

Trace 文件包含：
- 页面截图
- DOM 快照
- 网络请求
- 控制台日志
- 操作步骤时间线

---

## 常见问题分类

| 分类 | 占比 | 典型场景 |
|------|------|----------|
| locator | 40% | 元素属性变更、DOM 重构 |
| timing | 25% | 页面加载、动画未完成 |
| network | 15% | API 失败、数据加载超时 |
| data | 10% | 测试数据不存在 |
| logic | 5% | 业务逻辑变更 |
| other | 5% | 环境问题、权限问题 |

---

## 改进建议

1. **增加显式等待**：避免依赖硬编码的 `waitForTimeout`
2. **使用稳定选择器**：优先使用 `data-testid`
3. **添加前置条件检查**：确保元素可见后再操作
4. **完善错误处理**：使用 try-catch 处理可选元素
