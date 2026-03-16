# AI 自动化测试系统架构文档

## 系统概述

本系统基于多 Agent 架构，实现了完整的 AI 驱动自动化测试流程：
- **自动分析**被测系统
- **自动生成**Playwright 测试代码
- **自动执行**测试
- **自动分析**失败原因
- **自动修复**测试并重新执行

---

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI 自动化测试系统                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   用户输入   │───>│ Test Planner │───>│   测试计划   │         │
│  │  (需求描述)  │    │    Agent    │    │  (JSON)     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                                    │
│                            v                                    │
│                     ┌─────────────┐                             │
│                     │    Test     │                             │
│                     │  Generator  │                             │
│                     │    Agent    │                             │
│                     └─────────────┘                             │
│                            │                                    │
│                            v                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  失败分析    │<───│    Test     │<───│  Playwright │         │
│  │    Agent    │    │  Executor   │    │   测试执行   │         │
│  └─────────────┘    │    Agent    │    └─────────────┘         │
│       │             └─────────────┘          ▲                  │
│       │                   │                  │                  │
│       v                   v                  │                  │
│  ┌─────────────┐    ┌─────────────┐         │                  │
│  │ Self-Healing│───>│  修复后代码  │─────────┘                  │
│  │    Agent    │    │             │                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent 模块详解

### 1. Test Planner Agent（测试规划 Agent）

**职责：**
- 读取需求或页面信息
- 分析测试场景
- 生成结构化测试用例

**输入：**
- 需求描述（中文）
- 可选：页面 URL 和分析结果
- 项目上下文（Page Objects, Fixtures）

**输出：**
```json
{
  "feature": "体检报告审核",
  "type": "smoke",
  "scenarios": [
    {
      "name": "医生审核报告",
      "priority": "P0",
      "preCondition": "已登录医生账号",
      "steps": [
        { "action": "登录系统", "expected": "登录成功" },
        { "action": "进入报告列表", "expected": "列表加载完成" },
        { "action": "打开报告", "expected": "报告详情可见" },
        { "action": "点击审核", "expected": "审核成功" }
      ],
      "expectedResult": "报告审核成功"
    }
  ],
  "recommendedFixtures": ["doctorPage"],
  "recommendedPageObjects": ["ReportListPage", "ReportDetailPage"]
}
```

**文件位置：** `e2e-tests/ai/agents/test-planner.agent.ts`

---

### 2. Test Generator Agent（测试生成 Agent）

**职责：**
- 根据测试计划生成 Playwright 代码
- 使用项目一致的代码风格
- 遵循 Playwright 最佳实践

**输入：**
- 测试计划（来自 Test Planner）
- 项目上下文（现有代码模式、Page Objects）

**输出：**
```typescript
import { test, expect } from '../../fixtures/auth.fixture';
import { ReportListPage } from '../../pages/report-list.page';

test('医生审核报告', async ({ doctorPage }) => {
  const reportListPage = new ReportListPage(doctorPage);

  await test.step('登录系统', async () => {
    // 已通过 fixture 自动登录
  });

  await test.step('进入报告列表', async () => {
    await reportListPage.goto();
    await expect(reportListPage.searchInput).toBeVisible();
  });

  await test.step('执行审核', async () => {
    await reportListPage.queryButton.click();
    const viewBtn = reportListPage.reportTable
      .locator('button:has-text("审核")')
      .first();
    await viewBtn.click();
    await expect(page.locator('.success')).toContainText('审核成功');
  });
});
```

**最佳实践遵循：**
1. 使用 `data-testid` 优先定位元素
2. 避免使用 `sleep`，使用 auto-waiting
3. 使用 `await expect()` 断言
4. 使用 `test.step()` 组织步骤
5. 复用 `fixtures` 避免重复登录

**文件位置：** `e2e-tests/ai/agents/test-generator.agent.ts`

---

### 3. Test Executor Agent（测试执行 Agent）

**职责：**
- 执行 Playwright 测试
- 收集测试结果和日志
- 生成执行报告

**输入：**
- 测试文件路径
- 执行配置（headed/retries/timeout 等）

**输出：**
```json
{
  "status": "failed",
  "total": 5,
  "passed": 3,
  "failed": 2,
  "skipped": 0,
  "duration": 45000,
  "results": [
    {
      "name": "医生审核报告",
      "status": "failed",
      "duration": 12000,
      "error": {
        "message": "TimeoutError: locator.click: Timeout 15000ms exceeded",
        "stack": "...",
        "snippet": "at ReportAuditPage.clickAuditButton..."
      },
      "failedStep": "执行审核",
      "screenshot": "test-failed-1.png",
      "trace": "trace.zip"
    }
  ],
  "output": "Playwright 执行日志...",
  "htmlReportPath": "playwright-report/index.html"
}
```

**收集的信息：**
- 测试是否通过
- 失败步骤
- 控制台日志
- Playwright trace
- Screenshot
- 网络请求日志

**文件位置：** `e2e-tests/ai/agents/test-executor.agent.ts`

---

### 4. Failure Analysis Agent（失败分析 Agent）

**职责：**
- 分析测试失败原因
- 识别根因分类
- 提供修复建议

**分析维度：**

| 分类 | 描述 | 示例 |
|------|------|------|
| `locator` | 定位器问题 | 元素属性变更、DOM 结构变化 |
| `timing` | 时序问题 | 页面未加载、动画未完成 |
| `network` | 网络问题 | API 失败、响应超时 |
| `permission` | 权限问题 | 认证过期、权限不足 |
| `data` | 数据问题 | 测试数据不存在 |
| `logic` | 逻辑问题 | 功能行为变更 |
| `environment` | 环境问题 | 服务不可用 |
| `flaky` | 不稳定测试 | 竞态条件、随机失败 |

**输入：**
- 测试结果（来自 Test Executor）
- 测试代码
- 可选：页面 HTML 快照、控制台日志、网络日志

**输出：**
```json
{
  "category": "locator",
  "description": "页面按钮 class 发生变化",
  "rootCause": "选择器 'button.audit-btn' 不再匹配目标元素",
  "suggestion": "使用 data-testid 定位：getByTestId('audit-button')",
  "fixCode": "await page.getByTestId('audit-button').click();",
  "confidence": 0.95,
  "elementInfo": {
    "originalSelector": "button.audit-btn",
    "suggestedSelector": "[data-testid='audit-button']",
    "elementType": "button"
  }
}
```

**文件位置：** `e2e-tests/ai/agents/failure-analysis.agent.ts`

---

### 5. Self-Healing Agent（自愈 Agent）

**职责：**
- 根据分析结果自动修复测试代码
- 更新定位器
- 调整等待策略
- 修复断言逻辑

**输入：**
- 原始测试代码
- 失败分析结果（来自 Failure Analysis）
- 可选：页面上下文（可用元素列表）

**输出：**
```json
{
  "fixedCode": "// 修复后的完整代码",
  "fixDescription": "将失效的选择器更新为 data-testid",
  "fixType": "locator",
  "changes": [
    "~ 修改：\"await page.locator('button.audit-btn').click();\"",
    "~ 修改：\"await page.getByTestId('audit-button').click();\""
  ],
  "success": true
}
```

**修复策略：**

1. **定位器修复**
   - 使用 `data-testid` 优先
   - 使用 `getByRole + name` 组合
   - 避免使用易变的 class 名

2. **时序修复**
   - 使用 `await expect()` 等待元素
   - 使用 `waitForLoadState` 等待页面
   - 使用 `waitForResponse` 等待 API

3. **逻辑修复**
   - 调整操作步骤顺序
   - 修正断言条件
   - 更新业务逻辑

**文件位置：** `e2e-tests/ai/agents/self-healing.agent.ts`

---

## 主编排引擎

**Auto Test Pipeline** 整合 5 个 Agent 形成完整流程：

```
1. 收集项目上下文（Page Objects, Fixtures）
2. Test Planner -> 生成测试计划
3. Test Generator -> 生成测试代码
4. Test Executor -> 执行测试
5. IF 失败 AND 启用自愈:
   a. Failure Analyzer -> 分析失败原因
   b. Self-Healing Agent -> 自动修复代码
   c. 重新执行测试验证
6. 输出测试摘要报告
```

**文件位置：** `e2e-tests/ai/agents/auto-test-pipeline.ts`

---

## 使用指南

### CLI 命令

```bash
# 运行完整流水线（生成 + 执行 + 自愈）
npx ts-node ai/pipeline-cli.ts run \
  --requirement "登录和主检评估流程" \
  --type smoke

# 仅生成测试计划
npx ts-node ai/pipeline-cli.ts plan \
  --requirement "体检报告审核功能"

# 修复失败的测试
npx ts-node ai/pipeline-cli.ts heal \
  --file tests/smoke/login-ai.spec.ts \
  --error "TimeoutError: locator.click"
```

### 一键运行脚本

```bash
# 检查环境
./run-ai-test.sh check

# 运行演示示例
./run-ai-test.sh demo

# 运行完整流水线
./run-ai-test.sh run \
  --requirement "登录和主检评估流程" \
  --type smoke \
  --headed  # 可选：有头模式
```

---

## 失败日志示例

### 测试执行输出

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

    Error Context: test-results/error-context.md
    Screenshot: test-failed-1.png

  2) 测试名称：P2-医生可使用报告预览功能

    AssertionError: expected dialog to be visible
    Location: report-view-ai.spec.ts:89
```

### 失败分析报告

```markdown
# 测试失败分析报告

## 测试信息
- 测试名称：P1-医生可通过姓名搜索报告
- 失败分类：locator
- 置信度：95%

## 失败原因
页面按钮 class 发生变化，原选择器 'button.query-btn' 不再匹配

## 根因分析
前端重构后，查询按钮的 class 从 'query-btn' 改为 'el-button--primary'

## 修复建议
使用 data-testid 定位：getByTestId('query-button')
或结合角色和文本：getByRole('button', { name: '查询' })

## 建议修复代码
await page.getByRole('button', { name: '查询' }).click();
```

---

## 项目结构

```
e2e-tests/ai/
├── agents/                    # Agent 模块
│   ├── test-planner.agent.ts    # 测试规划 Agent
│   ├── test-generator.agent.ts  # 测试生成 Agent
│   ├── test-executor.agent.ts   # 测试执行 Agent
│   ├── failure-analysis.agent.ts # 失败分析 Agent
│   ├── self-healing.agent.ts     # 自愈 Agent
│   ├── auto-test-pipeline.ts     # 主编排引擎
│   └── index.ts                  # 统一导出
├── context-collector.ts       # 项目上下文收集
├── llm-client.ts              # LLM API 客户端
├── pipeline-cli.ts            # CLI 入口
├── prompt-templates.ts        # Prompt 模板
└── types.ts                   # 类型定义

e2e-tests/tests/
├── ai-example/                # AI 生成测试示例
│   └── report-view-ai.spec.ts
├── smoke/                     # 冒烟测试
└── regression/                # 回归测试
```

---

## 扩展与定制

### 添加新的 Agent

1. 在 `agents/` 目录创建新文件
2. 实现 Agent 核心逻辑
3. 在 `agents/index.ts` 导出

### 自定义 Prompt 模板

编辑 `prompt-templates.ts` 调整 AI 输出风格

### 集成 CI/CD

```yaml
# GitLab CI 示例
ai-test:
  stage: test
  script:
    - cd e2e-tests
    - npm install
    - npx playwright install chromium
    - npx ts-node ai/pipeline-cli.ts run --requirement "核心功能验证" --type smoke
```

---

## 注意事项

1. **LLM API 配置**：确保 `.env` 文件中配置 `LLM_API_URL` 和 `LLM_API_KEY`
2. **浏览器安装**：首次运行需要 `npx playwright install chromium`
3. **自愈限制**：建议最多重试 1-2 次，避免无限循环
4. **代码审查**：AI 生成的代码应经过人工审查后再提交

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0 | 2026-03-16 | 初始版本，实现 5 个核心 Agent |
