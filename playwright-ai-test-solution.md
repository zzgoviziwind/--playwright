# 医院体检报告管理系统 — Playwright AI 自动化测试技术方案

---

# 1 项目目标

## 1.1 自动化测试目标

| 目标 | 说明 |
|------|------|
| 核心流程零漏测 | 体检报告 创建→编辑→提交→审核→发布→查看 全链路自动化覆盖 |
| 冒烟测试 ≤5min | 每次部署后 5 分钟内完成核心功能可用性验证 |
| 回归测试 ≤30min | 每次迭代发布前 30 分钟内完成全量回归 |
| CI/CD 门禁 | 自动化测试作为流水线质量门禁，阻断质量不达标的发布 |

## 1.2 自动化覆盖范围

| 层级 | 覆盖内容 |
|------|----------|
| P0 冒烟 | 登录、报告列表加载、报告详情查看、报告编辑保存、提交审核、审核通过 |
| P1 回归 | 报告状态流转、角色权限控制、查询过滤、报告生成与发布、异常场景 |
| P2 扩展 | 边界值输入、并发编辑冲突、大数据量分页 |

## 1.3 自动化测试 ROI

| 指标 | 当前手工测试 | 自动化后 |
|------|-------------|---------|
| 冒烟测试执行 | 2人×30min/次 | 0人×5min（CI自动执行） |
| 回归测试执行 | 3人×1天/次 | 0人×30min（CI自动执行） |
| 迭代内执行频率 | 1-2次/迭代 | 每次提交自动触发 |
| 人为遗漏率 | 约15% | <1%（固定脚本覆盖） |

## 1.4 自动化测试策略

采用 **金字塔 + 关键路径优先** 策略：

```
          /  E2E 流程测试（本方案核心）  \
         /   覆盖6条核心业务流程          \
        /─────────────────────────────────\
       /   组件/集成测试（前端团队负责）     \
      /    Vue组件单测 + API集成测试         \
     /─────────────────────────────────────\
    /        单元测试（开发团队负责）          \
   /     Java后端服务 + 工具类单测             \
  /─────────────────────────────────────────\
```

**E2E 层优先覆盖原则**：按业务风险排序，P0（阻断性业务）→ P1（核心业务）→ P2（辅助功能）。

---

# 2 自动化测试架构设计

## 2.1 测试系统架构图

```
AI 自动化测试系统
│
├─ Playwright Test Runner          # 测试执行引擎
│   ├─ Chromium / Firefox / WebKit  # 多浏览器执行
│   └─ 并发 Worker 管理              # 并行执行控制
│
├─ 测试用例层 (tests/)              # 按业务模块组织的测试用例
│   ├─ smoke/                       # 冒烟测试集
│   └─ regression/                  # 回归测试集
│
├─ Page Object 层 (pages/)         # 页面对象封装
│   ├─ LoginPage                    # 登录页
│   ├─ ReportListPage               # 报告列表页
│   ├─ ReportDetailPage             # 报告详情页
│   ├─ ReportEditPage               # 报告编辑页
│   └─ AuditPage                    # 审核页
│
├─ Fixtures 层 (fixtures/)         # 测试夹具与上下文管理
│   ├─ auth.fixture.ts              # 登录态管理
│   └─ data.fixture.ts              # 测试数据管理
│
├─ 公共工具层 (utils/)              # 通用工具函数
│   ├─ api-helper.ts                # API 调用辅助（数据准备/清理）
│   ├─ db-helper.ts                 # 数据库直连辅助（测试数据重置）
│   └─ wait-helper.ts               # 智能等待策略
│
├─ 测试数据管理 (data/)             # 测试数据集
│   ├─ users.json                   # 用户角色数据
│   └─ reports.json                 # 体检报告模板数据
│
├─ AI 辅助模块 (ai/)               # AI 测试能力
│   ├─ test-generator.ts            # AI 生成测试用例
│   ├─ script-generator.ts          # AI 生成 Playwright 脚本
│   ├─ failure-analyzer.ts          # AI 分析失败原因
│   └─ locator-healer.ts            # AI 自动修复定位器
│
└─ CI/CD 执行模块                   # 持续集成
    ├─ Jenkinsfile / .gitlab-ci.yml # 流水线配置
    ├─ Docker 执行环境               # 容器化运行
    └─ 报告归档与通知                 # 结果推送
```

## 2.2 模块职责说明

| 模块 | 职责 |
|------|------|
| **Playwright Test Runner** | 测试调度、浏览器生命周期管理、并发控制、失败重试 |
| **测试用例层** | 按冒烟/回归分类组织，每个文件对应一个业务场景 |
| **Page Object 层** | 封装页面元素定位与操作，隔离UI变更对用例的影响 |
| **Fixtures 层** | 管理测试前置条件：登录态注入、测试数据准备、环境初始化 |
| **公共工具层** | 提供 API 数据准备、数据库重置、自定义断言等共享能力 |
| **测试数据管理** | 集中管理用户账号、报告模板等静态测试数据 |
| **AI 辅助模块** | 利用 LLM 实现用例生成、脚本生成、失败分析、定位器自愈 |
| **CI/CD 执行模块** | 自动触发测试、收集报告、通知结果、阻断不合格发布 |

---

# 3 Playwright 技术方案设计

## 3.1 技术选型

| 选项 | 决策 | 理由 |
|------|------|------|
| 语言 | **TypeScript** | 类型安全、IDE 智能提示、团队维护成本低 |
| 测试框架 | **@playwright/test** | 内置 test runner，原生支持并发、fixture、reporter |
| Node 版本 | ≥18 LTS | Playwright 最低要求 |
| 包管理器 | pnpm | 安装速度快、磁盘占用小 |

## 3.2 浏览器支持策略

| 环境 | 浏览器 | 说明 |
|------|--------|------|
| CI 冒烟测试 | Chromium only | 最快速度完成核心验证 |
| CI 回归测试 | Chromium + Firefox | 覆盖主流内核 |
| 本地开发调试 | Chromium（headed） | 可视化调试 |

配置示例（`playwright.config.ts`）：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'results/junit.xml' }]]
    : [['html']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    // 登录态准备（无浏览器执行）
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'cleanup' },
    { name: 'cleanup', testMatch: /.*\.teardown\.ts/ },

    // 冒烟测试 — 仅 Chromium
    {
      name: 'smoke-chromium',
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // 回归测试 — Chromium + Firefox
    {
      name: 'regression-chromium',
      testMatch: /regression\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'regression-firefox',
      testMatch: /regression\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
  ],
});
```

## 3.3 并发执行策略

| 场景 | Workers 数 | 说明 |
|------|-----------|------|
| CI 冒烟 | 4 | 快速并行，5分钟内完成 |
| CI 回归 | 4 | 按模块并行，用例间数据隔离 |
| 本地调试 | 1 | 串行执行，方便断点 |

数据隔离策略：每个 Worker 使用独立测试账号（如 `doctor_w1`、`doctor_w2`），避免并发冲突。

## 3.4 登录态管理策略

采用 Playwright 原生 **storageState** 机制，一次登录、全局复用：

```typescript
// fixtures/auth.setup.ts
import { test as setup } from '@playwright/test';

const users = {
  doctor: { username: 'doctor01', password: 'Test@1234' },
  auditor: { username: 'auditor01', password: 'Test@1234' },
  admin: { username: 'admin01', password: 'Test@1234' },
};

for (const [role, cred] of Object.entries(users)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('input-username').fill(cred.username);
    await page.getByTestId('input-password').fill(cred.password);
    await page.getByTestId('btn-login').click();
    await page.waitForURL('/dashboard');
    await page.context().storageState({
      path: `./fixtures/.auth/${role}.json`,
    });
  });
}
```

用例中通过 fixture 注入指定角色的登录态：

```typescript
// fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type RoleFixtures = {
  doctorPage: Page;
  auditorPage: Page;
  adminPage: Page;
};

export const test = base.extend<RoleFixtures>({
  doctorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: './fixtures/.auth/doctor.json',
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  auditorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: './fixtures/.auth/auditor.json',
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: './fixtures/.auth/admin.json',
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});
```

## 3.5 项目目录结构

```
e2e-tests/
├── playwright.config.ts           # Playwright 全局配置
├── package.json
├── tsconfig.json
│
├── tests/                         # 测试用例
│   ├── smoke/                     # 冒烟测试
│   │   ├── login.spec.ts          #   登录验证
│   │   ├── report-list.spec.ts    #   报告列表加载
│   │   ├── report-view.spec.ts    #   报告详情查看
│   │   ├── report-edit.spec.ts    #   报告编辑保存
│   │   └── report-audit.spec.ts   #   提交审核 & 审核通过
│   │
│   └── regression/                # 回归测试
│       ├── report-crud.spec.ts    #   报告增删改查
│       ├── report-workflow.spec.ts#   报告状态流转
│       ├── report-query.spec.ts   #   查询过滤排序
│       ├── permission.spec.ts     #   角色权限控制
│       └── report-publish.spec.ts #   报告发布与查看
│
├── pages/                         # Page Object
│   ├── login.page.ts
│   ├── report-list.page.ts
│   ├── report-detail.page.ts
│   ├── report-edit.page.ts
│   └── audit.page.ts
│
├── fixtures/                      # 测试夹具
│   ├── auth.setup.ts              #   登录态准备
│   ├── auth.teardown.ts           #   清理会话
│   ├── auth.fixture.ts            #   角色 fixture
│   ├── data.fixture.ts            #   数据准备 fixture
│   └── .auth/                     #   存储 storageState（gitignore）
│
├── utils/                         # 工具函数
│   ├── api-helper.ts              #   后端 API 调用（数据准备/清理）
│   ├── db-helper.ts               #   MySQL 数据库操作
│   └── wait-helper.ts             #   自定义等待策略
│
├── data/                          # 测试数据
│   ├── users.json                 #   各角色测试账号
│   ├── reports.json               #   报告模板数据
│   └── exam-items.json            #   体检项目数据
│
└── ai/                            # AI 辅助模块
    ├── test-generator.ts          #   用例生成
    ├── script-generator.ts        #   脚本生成
    ├── failure-analyzer.ts        #   失败分析
    └── locator-healer.ts          #   定位器自愈
```

| 目录 | 作用 |
|------|------|
| `tests/smoke/` | 冒烟测试用例，每次部署后执行，验证核心功能可用 |
| `tests/regression/` | 回归测试用例，迭代发布前执行，覆盖全量业务场景 |
| `pages/` | Page Object 封装，一个页面对应一个文件，隔离 UI 变更 |
| `fixtures/` | 测试前置/后置条件管理，包括登录态、数据准备 |
| `utils/` | 跨用例共享工具：API 调用、数据库操作、等待策略 |
| `data/` | 静态测试数据集，JSON 格式，版本控制 |
| `ai/` | AI 辅助能力实现代码 |

---

# 4 冒烟测试设计

## 4.1 冒烟测试策略

| 项目 | 说明 |
|------|------|
| 触发时机 | 每次代码部署到测试环境后自动触发 |
| 执行时间 | ≤5 分钟 |
| 覆盖范围 | 仅 P0 核心路径，6 个场景 |
| 浏览器 | 仅 Chromium |
| 失败策略 | 任一失败即阻断，通知团队 |

## 4.2 冒烟测试场景

| 编号 | 场景 | 验证点 | 预期结果 |
|------|------|--------|---------|
| SM-01 | 医生登录系统 | 输入正确账号密码，点击登录 | 跳转至首页/仪表盘 |
| SM-02 | 打开体检报告列表 | 访问报告列表页 | 列表加载成功，显示报告数据 |
| SM-03 | 查看报告详情 | 点击列表中某条报告 | 详情页加载，显示体检项目结果 |
| SM-04 | 编辑报告 | 修改体检项目数值并保存 | 保存成功提示，数据持久化 |
| SM-05 | 提交审核 | 编辑完成后点击提交审核 | 报告状态变为"待审核" |
| SM-06 | 审核通过 | 审核医生登录，审核并通过 | 报告状态变为"已审核" |

## 4.3 冒烟测试 E2E 流程

```
SM-01 医生登录
  │
  ▼
SM-02 打开报告列表 ──→ 断言：列表非空
  │
  ▼
SM-03 点击查看详情 ──→ 断言：详情页核心字段显示
  │
  ▼
SM-04 编辑并保存 ──→ 断言：保存成功 Toast
  │
  ▼
SM-05 提交审核 ──→ 断言：状态="待审核"
  │
  ▼
（切换角色：审核医生）
  │
  ▼
SM-06 审核通过 ──→ 断言：状态="已审核"
```

---

# 5 回归测试设计

## 5.1 回归测试策略

| 项目 | 说明 |
|------|------|
| 触发时机 | 迭代发布前 / 合并到主分支时 |
| 执行时间 | ≤30 分钟 |
| 覆盖范围 | P0 + P1 全量场景 |
| 浏览器 | Chromium + Firefox |
| 失败策略 | 生成详细报告，失败用例附截图+视频 |

## 5.2 回归测试分类

| 分类 | 用例文件 | 场景 |
|------|---------|------|
| **报告增删改查** | `report-crud.spec.ts` | 创建报告、编辑报告、删除草稿报告、保存草稿 |
| **报告状态流转** | `report-workflow.spec.ts` | 草稿→待审核→已审核→已发布；退回重编辑；作废 |
| **查询过滤** | `report-query.spec.ts` | 按姓名搜索、按日期范围过滤、按状态过滤、分页翻页 |
| **角色权限控制** | `permission.spec.ts` | 医生不可审核；审核医生不可编辑他人报告；管理员全权限 |
| **报告发布与查看** | `report-publish.spec.ts` | 已审核报告发布、用户端查看已发布报告、未发布不可查看 |

## 5.3 测试用例组织方式

```typescript
// tests/regression/report-workflow.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';

test.describe('报告状态流转', () => {

  test.describe('正向流程', () => {
    test('草稿 → 待审核：医生提交审核', async ({ doctorPage }) => { /* ... */ });
    test('待审核 → 已审核：审核医生通过', async ({ auditorPage }) => { /* ... */ });
    test('已审核 → 已发布：管理员发布报告', async ({ adminPage }) => { /* ... */ });
  });

  test.describe('逆向流程', () => {
    test('待审核 → 草稿：审核医生退回', async ({ auditorPage }) => { /* ... */ });
    test('已审核 → 已作废：管理员作废报告', async ({ adminPage }) => { /* ... */ });
  });

  test.describe('异常场景', () => {
    test('草稿状态不可直接发布', async ({ adminPage }) => { /* ... */ });
    test('已发布状态不可编辑', async ({ doctorPage }) => { /* ... */ });
  });
});
```

---

# 6 Playwright 测试代码结构设计

## 6.1 Page Object Model 设计

原则：
- 每个页面一个 PO 类
- PO 只封装**定位器**和**操作方法**，不包含断言
- 断言在测试用例中编写，保持 PO 的复用性

## 6.2 页面元素定位策略

优先级（从高到低）：

| 优先级 | 定位方式 | 示例 | 适用场景 |
|--------|---------|------|---------|
| 1 | `data-testid` | `[data-testid="btn-submit-audit"]` | 首选，不受 UI 重构影响 |
| 2 | `aria-label` / Role | `getByRole('button', { name: '提交审核' })` | 语义化元素 |
| 3 | 文本内容 | `getByText('保存成功')` | 提示信息、按钮文字 |
| 4 | 稳定 CSS 选择器 | `.report-table .status-tag` | 以上方式均不可用时 |

**Vue 项目稳定定位策略**：

在 Vue 组件中添加 `data-testid`，通过构建配置确保生产环境剥离：

```vue
<!-- ReportEditForm.vue -->
<template>
  <el-form data-testid="form-report-edit">
    <el-input v-model="form.patientName" data-testid="input-patient-name" />
    <el-input v-model="form.bloodPressure" data-testid="input-blood-pressure" />
    <el-button @click="save" data-testid="btn-save">保存</el-button>
    <el-button @click="submitAudit" data-testid="btn-submit-audit">提交审核</el-button>
  </el-form>
</template>
```

生产环境剥离配置（`vite.config.ts`）：

```typescript
export default defineConfig({
  plugins: [
    vue(),
    // 生产环境移除 data-testid
    process.env.NODE_ENV === 'production' && {
      name: 'remove-testid',
      transform(code, id) {
        if (id.endsWith('.vue')) {
          return code.replace(/\s*data-testid="[^"]*"/g, '');
        }
      },
    },
  ].filter(Boolean),
});
```

## 6.3 Page Object 示例代码

```typescript
// pages/report-edit.page.ts
import { type Page, type Locator } from '@playwright/test';

export class ReportEditPage {
  readonly page: Page;

  // 定位器
  readonly patientNameInput: Locator;
  readonly bloodPressureInput: Locator;
  readonly heartRateInput: Locator;
  readonly bloodSugarInput: Locator;
  readonly doctorCommentInput: Locator;
  readonly saveButton: Locator;
  readonly submitAuditButton: Locator;
  readonly successToast: Locator;
  readonly statusTag: Locator;

  constructor(page: Page) {
    this.page = page;
    this.patientNameInput = page.getByTestId('input-patient-name');
    this.bloodPressureInput = page.getByTestId('input-blood-pressure');
    this.heartRateInput = page.getByTestId('input-heart-rate');
    this.bloodSugarInput = page.getByTestId('input-blood-sugar');
    this.doctorCommentInput = page.getByTestId('input-doctor-comment');
    this.saveButton = page.getByTestId('btn-save');
    this.submitAuditButton = page.getByTestId('btn-submit-audit');
    this.successToast = page.getByText('保存成功');
    this.statusTag = page.getByTestId('report-status');
  }

  async goto(reportId: string) {
    await this.page.goto(`/reports/${reportId}/edit`);
  }

  async fillExamResults(data: {
    bloodPressure?: string;
    heartRate?: string;
    bloodSugar?: string;
    comment?: string;
  }) {
    if (data.bloodPressure) {
      await this.bloodPressureInput.clear();
      await this.bloodPressureInput.fill(data.bloodPressure);
    }
    if (data.heartRate) {
      await this.heartRateInput.clear();
      await this.heartRateInput.fill(data.heartRate);
    }
    if (data.bloodSugar) {
      await this.bloodSugarInput.clear();
      await this.bloodSugarInput.fill(data.bloodSugar);
    }
    if (data.comment) {
      await this.doctorCommentInput.clear();
      await this.doctorCommentInput.fill(data.comment);
    }
  }

  async save() {
    await this.saveButton.click();
    await this.successToast.waitFor({ state: 'visible' });
  }

  async submitForAudit() {
    await this.submitAuditButton.click();
    // 等待确认弹窗并确认
    await this.page.getByRole('button', { name: '确认' }).click();
  }

  async getStatus(): Promise<string> {
    return (await this.statusTag.textContent()) ?? '';
  }
}
```

```typescript
// pages/report-list.page.ts
import { type Page, type Locator } from '@playwright/test';

export class ReportListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly statusFilter: Locator;
  readonly reportTable: Locator;
  readonly tableRows: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('input-search');
    this.searchButton = page.getByTestId('btn-search');
    this.statusFilter = page.getByTestId('select-status');
    this.reportTable = page.getByTestId('report-table');
    this.tableRows = page.getByTestId('report-table').locator('tbody tr');
    this.emptyState = page.getByTestId('empty-state');
  }

  async goto() {
    await this.page.goto('/reports');
    await this.reportTable.waitFor({ state: 'visible' });
  }

  async searchByName(name: string) {
    await this.searchInput.fill(name);
    await this.searchButton.click();
    // 等待表格刷新（Vue SPA 局部更新）
    await this.page.waitForResponse(resp =>
      resp.url().includes('/api/reports') && resp.status() === 200
    );
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.page.waitForResponse(resp =>
      resp.url().includes('/api/reports') && resp.status() === 200
    );
  }

  async openReport(index: number) {
    await this.tableRows.nth(index).getByTestId('btn-view').click();
  }

  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }
}
```

## 6.4 测试用例示例代码

```typescript
// tests/smoke/report-edit.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { ReportEditPage } from '../../pages/report-edit.page';
import { ReportListPage } from '../../pages/report-list.page';
import { createTestReport } from '../../utils/api-helper';

test.describe('冒烟测试 - 报告编辑保存', () => {

  let reportId: string;

  test.beforeEach(async ({ doctorPage }) => {
    // 通过 API 预创建测试报告
    reportId = await createTestReport({
      patientName: '冒烟测试患者',
      status: 'draft',
    });
  });

  test('医生编辑体检结果并保存', async ({ doctorPage }) => {
    const editPage = new ReportEditPage(doctorPage);
    await editPage.goto(reportId);

    // 填写体检结果
    await editPage.fillExamResults({
      bloodPressure: '120/80',
      heartRate: '72',
      bloodSugar: '5.6',
      comment: '各项指标正常',
    });

    // 保存
    await editPage.save();

    // 断言：保存成功
    await expect(editPage.successToast).toBeVisible();

    // 刷新页面验证数据持久化
    await editPage.goto(reportId);
    await expect(editPage.bloodPressureInput).toHaveValue('120/80');
    await expect(editPage.heartRateInput).toHaveValue('72');
  });

  test('医生提交审核后状态变更', async ({ doctorPage }) => {
    const editPage = new ReportEditPage(doctorPage);
    await editPage.goto(reportId);

    await editPage.fillExamResults({
      bloodPressure: '130/85',
      heartRate: '78',
      bloodSugar: '6.1',
      comment: '血压偏高，建议复查',
    });
    await editPage.save();
    await editPage.submitForAudit();

    // 断言：状态变为待审核
    await expect(editPage.statusTag).toHaveText('待审核');
  });
});
```

```typescript
// tests/smoke/report-audit.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { AuditPage } from '../../pages/audit.page';
import { createTestReport } from '../../utils/api-helper';

test.describe('冒烟测试 - 审核流程', () => {

  let reportId: string;

  test.beforeEach(async () => {
    // 通过 API 创建一条"待审核"状态的报告
    reportId = await createTestReport({
      patientName: '审核测试患者',
      status: 'pending_audit',
      examData: { bloodPressure: '120/80', heartRate: '72' },
    });
  });

  test('审核医生审核通过报告', async ({ auditorPage }) => {
    const auditPage = new AuditPage(auditorPage);
    await auditPage.goto(reportId);

    // 验证报告内容可见
    await expect(auditPage.patientName).toHaveText('审核测试患者');
    await expect(auditPage.bloodPressure).toHaveText('120/80');

    // 审核通过
    await auditPage.approve('审核通过，结果无异常');

    // 断言：状态变为已审核
    await expect(auditPage.statusTag).toHaveText('已审核');
  });
});
```

---

# 7 医疗业务关键测试场景

## 7.1 报告编辑保存

| 场景 | 操作 | 验证点 |
|------|------|--------|
| 正常保存 | 填写所有体检项目 → 保存 | 保存成功，数据持久化 |
| 部分保存 | 仅填写部分项目 → 保存 | 允许保存草稿，未填项为空 |
| 必填校验 | 不填写必填项 → 保存 | 提示必填字段不可为空 |
| 数值范围校验 | 输入异常值（如心率=500） | 提示数值超出合理范围 |
| 并发编辑 | 两个医生同时编辑同一报告 | 后保存者提示冲突或覆盖 |

## 7.2 审核流程正确性

| 场景 | 操作 | 验证点 |
|------|------|--------|
| 正常审核通过 | 审核医生查看 → 通过 | 状态变为"已审核"，记录审核人和时间 |
| 审核退回 | 审核医生查看 → 退回 | 状态退回"草稿"，退回原因记录 |
| 必填审核意见 | 不填审核意见 → 提交 | 提示审核意见不可为空 |
| 重复审核 | 已审核报告再次审核 | 操作不可用或提示已审核 |

## 7.3 角色权限验证

| 场景 | 角色 | 操作 | 预期 |
|------|------|------|------|
| 医生编辑自己的报告 | 医生 | 编辑自己创建的报告 | 允许 |
| 医生编辑他人报告 | 医生 | 编辑他人创建的报告 | 拒绝/不可见 |
| 医生审核报告 | 医生 | 尝试审核操作 | 无审核按钮或操作被拒 |
| 审核医生编辑报告 | 审核医生 | 尝试编辑报告内容 | 编辑按钮不可用 |
| 管理员发布报告 | 管理员 | 发布已审核报告 | 允许，状态变为"已发布" |

## 7.4 报告状态流转

完整状态机验证：

```
                 ┌───────── 退回 ─────────┐
                 │                        │
                 ▼                        │
[草稿] ──提交审核──→ [待审核] ──审核通过──→ [已审核] ──发布──→ [已发布]
  │                   │                      │
  │                   │                      │
  └──── 删除 ────→ [已删除]    [已作废] ◄─── 作废
```

测试矩阵：

| 当前状态 | 操作 | 目标状态 | 是否合法 |
|----------|------|----------|---------|
| 草稿 | 提交审核 | 待审核 | ✅ |
| 草稿 | 删除 | 已删除 | ✅ |
| 草稿 | 发布 | - | ❌ 不允许 |
| 待审核 | 审核通过 | 已审核 | ✅ |
| 待审核 | 退回 | 草稿 | ✅ |
| 待审核 | 发布 | - | ❌ 不允许 |
| 已审核 | 发布 | 已发布 | ✅ |
| 已审核 | 作废 | 已作废 | ✅ |
| 已审核 | 编辑 | - | ❌ 不允许 |
| 已发布 | 编辑 | - | ❌ 不允许 |
| 已发布 | 删除 | - | ❌ 不允许 |

---

# 8 AI 辅助自动化测试能力设计

## 8.1 AI 能力矩阵

| 能力 | 输入 | 输出 | 实现方式 |
|------|------|------|---------|
| AI 生成测试用例 | 需求文档 / 页面截图 | 结构化测试用例列表 | LLM Prompt + 模板 |
| AI 生成 Playwright 脚本 | 测试用例描述 + PO 接口 | 可执行的 .spec.ts 文件 | LLM Prompt + 代码模板 |
| AI 自动修复定位器 | 失败截图 + 旧定位器 + 页面DOM | 修复后的定位器 | LLM 分析 DOM 变更 |
| AI 分析失败日志 | 错误日志 + 截图 + trace | 失败根因分析报告 | LLM 日志分析 |

## 8.2 AI 工作流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  需求/页面变更  │────→│  AI 分析变更   │────→│  生成/更新用例  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  人工 Review   │◄────│  AI 生成脚本   │◄────│  确认用例      │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CI 执行测试   │────→│  失败用例      │────→│  AI 分析失败   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                          ┌──────────────┐
                                          │  AI 修复定位器  │
                                          │  或提交 Bug    │
                                          └──────────────┘
```

## 8.3 AI 生成测试用例 — 示例 Prompt

```
你是一名资深测试工程师，正在为医院体检报告管理系统编写测试用例。

## 待测功能
功能名称：体检报告审核
功能描述：审核医生查看待审核的体检报告，可以选择"通过"或"退回"，
通过时需填写审核意见，退回时需填写退回原因。

## 系统角色
- 医生：创建和编辑报告
- 审核医生：审核报告
- 管理员：发布和管理报告

## 输出要求
请生成测试用例，格式如下：
- 用例编号
- 用例名称
- 前置条件
- 操作步骤（编号列表）
- 预期结果
- 优先级（P0/P1/P2）
- 所属分类（正向/逆向/边界/权限）

请覆盖：正向流程、逆向流程、边界条件、权限控制。
```

## 8.4 AI 生成 Playwright 脚本 — 示例 Prompt

```
你是一名 Playwright 自动化测试工程师。请根据以下测试用例和 Page Object 接口，
生成可执行的 Playwright TypeScript 测试脚本。

## 测试用例
用例名称：审核医生退回体检报告
前置条件：存在一条状态为"待审核"的报告
操作步骤：
1. 审核医生登录系统
2. 打开该报告的审核页面
3. 填写退回原因："血压数据疑似异常，请复查"
4. 点击"退回"按钮
预期结果：报告状态变为"草稿"

## 可用的 Page Object 接口
```typescript
class AuditPage {
  goto(reportId: string): Promise<void>
  readonly statusTag: Locator
  readonly rejectReasonInput: Locator
  approve(comment: string): Promise<void>
  reject(reason: string): Promise<void>
}
```

## 可用的 Fixture
- auditorPage：已登录审核医生角色的 Page 实例
- createTestReport(options)：API 创建测试报告

## 要求
- 使用 test.describe 组织
- 使用 fixture 获取登录态
- 使用 beforeEach 准备数据
- 断言使用 expect
```

## 8.5 AI 分析失败日志 — 示例 Prompt

```
你是一名自动化测试失败分析专家。请分析以下 Playwright 测试失败信息，
给出失败根因和修复建议。

## 失败信息
测试用例：审核医生审核通过报告
错误信息：
  TimeoutError: locator.click: Timeout 30000ms exceeded.
  Call log:
    - waiting for getByTestId('btn-approve')

## 页面截图
（附截图）

## 最近代码变更
- AuditForm.vue: 按钮从 `data-testid="btn-approve"` 改为 `data-testid="btn-audit-approve"`

## 请回答
1. 失败根因分类（定位器失效 / 业务逻辑变更 / 环境问题 / 数据问题）
2. 具体原因描述
3. 修复建议（给出修复后的代码）
```

## 8.6 AI 定位器自愈实现

```typescript
// ai/locator-healer.ts
import { type Page } from '@playwright/test';

interface HealResult {
  originalLocator: string;
  newLocator: string;
  confidence: number;
  strategy: string;
}

export async function healLocator(
  page: Page,
  failedLocator: string,
  elementDescription: string
): Promise<HealResult> {
  // 1. 获取当前页面 DOM 快照
  const domSnapshot = await page.evaluate(() => {
    return document.body.innerHTML.substring(0, 5000);
  });

  // 2. 构建 Prompt 发送给 LLM
  const prompt = `
    页面DOM片段：${domSnapshot}
    失败的定位器：${failedLocator}
    元素描述：${elementDescription}
    请分析DOM，找到该元素的新定位器，返回JSON：
    { "locator": "新定位器", "confidence": 0.95, "strategy": "testid变更" }
  `;

  // 3. 调用 LLM API 获取新定位器
  const response = await callLLM(prompt);

  return {
    originalLocator: failedLocator,
    newLocator: response.locator,
    confidence: response.confidence,
    strategy: response.strategy,
  };
}
```

---

# 9 CI/CD 集成方案

## 9.1 CI 流程设计

```
代码提交 (git push)
  │
  ▼
┌─────────────────────────────────┐
│  阶段1：构建部署                   │
│  - 后端 mvn package              │
│  - 前端 npm run build            │
│  - 部署到测试环境                  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  阶段2：冒烟测试                   │
│  - npx playwright test --project │
│    smoke-chromium                 │
│  - 失败 → 阻断流水线 & 通知       │
│  - 通过 → 继续                    │
└─────────────┬───────────────────┘
              │（仅 merge 到 main 分支触发）
              ▼
┌─────────────────────────────────┐
│  阶段3：回归测试                   │
│  - npx playwright test --project │
│    regression-chromium           │
│  - npx playwright test --project │
│    regression-firefox            │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  阶段4：报告归档与通知             │
│  - 上传 HTML Report 到制品库      │
│  - 上传 Allure Report            │
│  - 发送企业微信/钉钉通知          │
└─────────────────────────────────┘
```

## 9.2 GitLab CI 配置示例

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy-test
  - smoke-test
  - regression-test
  - report

variables:
  BASE_URL: "http://test-server:8080"

# 冒烟测试
smoke-test:
  stage: smoke-test
  image: mcr.microsoft.com/playwright:v1.50.0-jammy
  script:
    - cd e2e-tests
    - pnpm install --frozen-lockfile
    - npx playwright test --project=smoke-chromium
  artifacts:
    when: always
    paths:
      - e2e-tests/playwright-report/
      - e2e-tests/test-results/
    expire_in: 7 days
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push"'

# 回归测试
regression-test:
  stage: regression-test
  image: mcr.microsoft.com/playwright:v1.50.0-jammy
  script:
    - cd e2e-tests
    - pnpm install --frozen-lockfile
    - npx playwright test --project=regression-chromium --project=regression-firefox
  artifacts:
    when: always
    paths:
      - e2e-tests/playwright-report/
      - e2e-tests/test-results/
    expire_in: 30 days
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  allow_failure: false

# 测试报告
publish-report:
  stage: report
  script:
    - echo "报告已归档到制品库"
    # 发送通知（示例：企业微信 Webhook）
    - |
      curl -X POST "$WECHAT_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
          \"msgtype\": \"markdown\",
          \"markdown\": {
            \"content\": \"## E2E测试报告\n> 分支：${CI_COMMIT_BRANCH}\n> 状态：${CI_JOB_STATUS}\n> [查看报告](${CI_JOB_URL}/artifacts/browse)\"
          }
        }"
  rules:
    - when: always
```

## 9.3 Jenkins Pipeline 配置示例

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.50.0-jammy'
        }
    }

    environment {
        BASE_URL = "http://test-server:8080"
    }

    stages {
        stage('Install') {
            steps {
                dir('e2e-tests') {
                    sh 'pnpm install --frozen-lockfile'
                }
            }
        }

        stage('Smoke Test') {
            steps {
                dir('e2e-tests') {
                    sh 'npx playwright test --project=smoke-chromium'
                }
            }
        }

        stage('Regression Test') {
            when {
                branch 'main'
            }
            steps {
                dir('e2e-tests') {
                    sh 'npx playwright test --project=regression-chromium --project=regression-firefox'
                }
            }
        }
    }

    post {
        always {
            publishHTML(target: [
                reportDir: 'e2e-tests/playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])
            archiveArtifacts artifacts: 'e2e-tests/test-results/**', allowEmptyArchive: true
        }
        failure {
            // 发送通知
            script {
                sendDingTalkNotification("E2E测试失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
            }
        }
    }
}
```

---

# 10 测试报告与结果分析

## 10.1 报告方案

| 报告类型 | 工具 | 用途 |
|----------|------|------|
| **HTML Report** | Playwright 内置 | 开发自查，本地快速浏览 |
| **Allure Report** | allure-playwright | 团队协作，历史趋势分析 |
| **JUnit XML** | Playwright junit reporter | CI 平台集成（Jenkins/GitLab） |

Playwright 配置多报告输出：

```typescript
// playwright.config.ts
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['junit', { outputFile: 'results/junit-report.xml' }],
  ['allure-playwright'],
],
```

## 10.2 失败诊断信息

| 诊断素材 | 配置 | 用途 |
|----------|------|------|
| 失败截图 | `screenshot: 'only-on-failure'` | 快速定位 UI 问题 |
| 失败视频 | `video: 'retain-on-failure'` | 回放操作过程 |
| Trace 文件 | `trace: 'retain-on-failure'` | Playwright Trace Viewer 逐步调试 |

Trace Viewer 使用：

```bash
# 本地查看 trace 文件
npx playwright show-trace test-results/xxx/trace.zip
```

## 10.3 Allure 报告集成

安装：

```bash
pnpm add -D allure-playwright
pnpm add -D allure-commandline
```

在测试用例中添加 Allure 标签：

```typescript
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

test('审核医生审核通过报告', async ({ page }) => {
  await allure.epic('体检报告管理');
  await allure.feature('报告审核');
  await allure.story('审核通过');
  await allure.severity('critical');

  // 测试步骤...
});
```

生成报告：

```bash
npx allure generate allure-results -o allure-report --clean
npx allure open allure-report
```

---

# 11 项目实施计划

## 阶段划分

### 阶段 1：自动化框架搭建

**目标**：完成技术基座，跑通第一个端到端用例。

| 任务 | 产出 |
|------|------|
| 初始化 Playwright 项目 | `playwright.config.ts`、`package.json`、`tsconfig.json` |
| 搭建项目目录结构 | `tests/`、`pages/`、`fixtures/`、`utils/`、`data/` |
| 实现登录态管理 | `auth.setup.ts`、`auth.fixture.ts`，三个角色的 storageState |
| 编写 API/DB Helper | `api-helper.ts`（测试数据准备）、`db-helper.ts`（数据重置） |
| 第一个冒烟用例跑通 | `login.spec.ts` 成功执行 |
| 前端添加 data-testid | 核心页面元素添加 `data-testid` 属性 |

### 阶段 2：实现冒烟测试

**目标**：完成 6 个 P0 冒烟测试场景，集成 CI。

| 任务 | 产出 |
|------|------|
| 编写核心页面 Page Object | `login.page.ts`、`report-list.page.ts`、`report-edit.page.ts`、`audit.page.ts` |
| 编写 6 个冒烟用例 | `smoke/` 目录下 5 个 `.spec.ts` 文件 |
| CI 冒烟流水线 | GitLab CI / Jenkins 冒烟阶段配置 |
| 报告输出 | HTML Report + JUnit XML |

### 阶段 3：扩展回归测试

**目标**：覆盖 P1 回归场景，完善测试覆盖。

| 任务 | 产出 |
|------|------|
| 报告 CRUD 用例 | `regression/report-crud.spec.ts` |
| 状态流转用例 | `regression/report-workflow.spec.ts` |
| 查询过滤用例 | `regression/report-query.spec.ts` |
| 权限控制用例 | `regression/permission.spec.ts` |
| 报告发布用例 | `regression/report-publish.spec.ts` |
| CI 回归流水线 | main 分支合并触发回归测试 |
| Allure 报告集成 | 历史趋势分析 |

### 阶段 4：引入 AI 辅助能力

**目标**：通过 AI 提升测试效率和维护效率。

| 任务 | 产出 |
|------|------|
| AI 用例生成工具 | `ai/test-generator.ts`，输入需求文档输出用例 |
| AI 脚本生成工具 | `ai/script-generator.ts`，输入用例描述 + PO 接口输出脚本 |
| AI 失败分析工具 | `ai/failure-analyzer.ts`，自动分析失败日志生成报告 |
| AI 定位器自愈 | `ai/locator-healer.ts`，CI 失败后自动尝试修复定位器 |
| Prompt 模板库 | 标准化 Prompt 模板集 |

---

## 附录：关键技术决策记录

| 决策项 | 决策 | 理由 |
|--------|------|------|
| 语言选择 | TypeScript | 类型安全、IDE 支持好、团队维护成本低 |
| 定位策略 | data-testid 优先 | 不受样式重构影响，Vue 组件可控 |
| 登录态管理 | storageState | Playwright 原生方案，无需每个用例重复登录 |
| 数据准备 | API 调用为主 | 比 UI 操作快 10 倍，不受前端变更影响 |
| 数据隔离 | 每 Worker 独立账号 | 并发执行时避免数据冲突 |
| AI 集成 | LLM API + Prompt 工程 | 灵活度高，可适配不同 LLM 提供商 |
| CI 镜像 | 官方 Playwright Docker | 浏览器预装，环境一致性保证 |
