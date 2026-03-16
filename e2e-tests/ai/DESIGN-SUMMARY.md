# AI 自动化测试系统 - 架构设计与实现总结

## 项目概述

本项目实现了一个基于多 Agent 架构的 AI 驱动自动化测试系统，借鉴了 Claude Code 类 Agent 的设计思想，使 AI 能够：

1. ✅ **自动分析**被测系统
2. ✅ **自动生成**Playwright 测试代码
3. ✅ **自动执行**测试
4. ✅ **自动分析**失败原因
5. ✅ **自动修复**测试并重新执行

---

## 多 Agent 架构设计

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI 自动化测试系统                              │
│                                                                       │
│  ┌──────────────┐                                                     │
│  │  用户输入     │                                                     │
│  │  (需求描述)   │                                                     │
│  └──────┬───────┘                                                     │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Test Planner Agent                          │  │
│  │  职责：分析需求、识别测试场景、生成结构化测试计划                 │  │
│  │  输出：JSON 格式的测试计划（场景、步骤、预期结果）                │  │
│  └──────┬──────────────────────────────────────────────────────────┘  │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Test Generator Agent                          │  │
│  │  职责：根据测试计划生成 Playwright 代码                            │  │
│  │  输出：完整的 TypeScript 测试文件                                 │  │
│  └──────┬──────────────────────────────────────────────────────────┘  │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Test Executor Agent                           │  │
│  │  职责：执行 Playwright 测试、收集结果和日志                        │  │
│  │  输出：测试结果（通过/失败）、截图、Trace、日志                   │  │
│  └──────┬──────────────────────────────────────────────────────────┘  │
│         │                                                             │
│         ▼ (如果失败)                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  Failure Analysis Agent                         │  │
│  │  职责：分析失败原因、识别根因分类、提供修复建议                   │  │
│  │  输出：失败分析报告（根因、置信度、修复建议）                     │  │
│  └──────┬──────────────────────────────────────────────────────────┘  │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Self-Healing Agent                            │  │
│  │  职责：根据分析结果自动修复测试代码                              │  │
│  │  输出：修复后的代码、修改说明                                    │  │
│  └──────┬──────────────────────────────────────────────────────────┘  │
│         │                                                             │
│         └──────────────────────────┐                                  │
│                                    │                                  │
│                                    ▼                                  │
│                          ┌──────────────────┐                         │
│                          │   重新执行测试    │                         │
│                          └──────────────────┘                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 五大核心 Agent 详解

### 1. Test Planner Agent（测试规划师）

**文件位置：** `e2e-tests/ai/agents/test-planner.agent.ts`

**核心函数：**
```typescript
export async function testPlannerAgent(
  input: TestPlannerInput,
  context: ProjectContext
): Promise<TestPlan>
```

**输入示例：**
```json
{
  "requirement": "医生审核体检报告，包括通过和退回操作",
  "testType": "smoke"
}
```

**输出示例：**
```json
{
  "feature": "体检报告审核",
  "type": "smoke",
  "scenarios": [
    {
      "name": "医生审核通过报告",
      "priority": "P0",
      "steps": [
        { "action": "登录医生账号", "expected": "登录成功" },
        { "action": "进入待审核列表", "expected": "列表加载完成" },
        { "action": "打开待审核报告", "expected": "报告详情可见" },
        { "action": "点击审核通过", "expected": "审核成功提示" }
      ],
      "expectedResult": "报告审核通过"
    }
  ],
  "recommendedFixtures": ["doctorPage"],
  "recommendedPageObjects": ["ReportListPage", "ReportDetailPage"]
}
```

**Prompt 设计要点：**
- 定义测试设计原则（smoke vs regression）
- 提供项目上下文（Page Objects、Fixtures）
- 要求结构化 JSON 输出

---

### 2. Test Generator Agent（代码生成师）

**文件位置：** `e2e-tests/ai/agents/test-generator.agent.ts`

**核心函数：**
```typescript
export async function testGeneratorAgent(
  input: TestGeneratorInput,
  context: ProjectContext
): Promise<GenerationResult>
```

**生成代码遵循的最佳实践：**
1. 使用 `data-testid` 优先定位元素
2. 避免硬编码 `waitForTimeout`，使用 auto-waiting
3. 使用 `await expect()` 进行断言
4. 使用 `test.step()` 组织步骤
5. 复用 `fixtures` 避免重复登录

**代码验证：**
```typescript
function validateGeneratedCode(code: string, warnings: string[]): boolean {
  // 检查 test 定义
  // 检查 expect 断言
  // 检查硬编码等待
  // 检查 import 语句
}
```

---

### 3. Test Executor Agent（测试执行师）

**文件位置：** `e2e-tests/ai/agents/test-executor.agent.ts`

**核心函数：**
```typescript
export async function testExecutorAgent(
  testFile: string,
  config: TestExecutorConfig
): Promise<TestSuiteResult>
```

**执行配置：**
```typescript
interface TestExecutorConfig {
  projectRoot: string;
  recordVideo?: boolean;
  trace?: 'on' | 'off' | 'retain-on-failure';
  headed?: boolean;
  slowMo?: number;
  timeout?: number;
  retries?: number;
}
```

**收集的信息：**
- 测试状态（passed/failed/skipped）
- 执行时长
- 错误信息和堆栈
- 失败步骤
- 截图路径
- Trace 路径
- 控制台日志
- 网络请求日志

---

### 4. Failure Analysis Agent（失败分析师）

**文件位置：** `e2e-tests/ai/agents/failure-analysis.agent.ts`

**核心函数：**
```typescript
export async function failureAnalysisAgent(
  input: FailureAnalysisInput
): Promise<FailureAnalysis>
```

**失败根因分类：**

| 分类 | 描述 | 示例 |
|------|------|------|
| `locator` | 定位器问题 | 元素属性变更、DOM 结构变化 |
| `timing` | 时序问题 | 页面未加载、动画未完成 |
| `network` | 网络问题 | API 请求失败、响应超时 |
| `permission` | 权限问题 | 认证过期、权限不足 |
| `data` | 数据问题 | 测试数据不存在 |
| `logic` | 业务逻辑问题 | 功能行为变更 |
| `environment` | 环境问题 | 服务不可用 |
| `flaky` | 不稳定测试 | 竞态条件、随机失败 |

**输出示例：**
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

---

### 5. Self-Healing Agent（自愈工程师）

**文件位置：** `e2e-tests/ai/agents/self-healing.agent.ts`

**核心函数：**
```typescript
export async function selfHealingAgent(
  input: SelfHealingInput
): Promise<HealingResult>
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

**修复结果：**
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

---

## 主编排引擎

**文件位置：** `e2e-tests/ai/agents/auto-test-pipeline.ts`

**核心流程：**

```typescript
export async function autoTestPipeline(
  config: AutoTestPipelineConfig
): Promise<PipelineResult> {
  // Step 1: 测试计划
  const testPlan = await testPlannerAgent(input, context);

  // Step 2: 代码生成
  const generationResult = await testGeneratorAgent({ testPlan }, context);

  // Step 3: 测试执行
  const executionResult = await testExecutorAgent(outputPath, config);

  // Step 4 & 5: 失败分析和自愈（如果失败）
  if (executionResult.failed > 0 && enableSelfHealing) {
    for (const failedTest of executionResult.results.filter(r => r.status === 'failed')) {
      // 分析失败
      const analysis = await failureAnalysisAgent({ testResult: failedTest, testCode: ... });

      // 自动修复
      const healingResult = await selfHealingAgent({ originalCode, analysis });

      // 重新执行验证
      if (healingResult.success) {
        executionResult = await testExecutorAgent(outputPath, config);
      }
    }
  }

  return { success: executionResult.failed === 0, ... };
}
```

---

## 使用方式

### CLI 命令

```bash
# 运行完整流水线
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

# 运行演示
./run-ai-test.sh demo

# 运行完整流水线
./run-ai-test.sh run \
  --requirement "登录和主检评估流程" \
  --type smoke \
  --headed
```

---

## 文件结构

```
e2e-tests/
├── ai/
│   ├── agents/                        # Agent 模块
│   │   ├── test-planner.agent.ts        ✏️ 测试规划师
│   │   ├── test-generator.agent.ts      🤖 代码生成师
│   │   ├── test-executor.agent.ts       ▶️ 测试执行师
│   │   ├── failure-analysis.agent.ts    🔍 失败分析师
│   │   ├── self-healing.agent.ts        🔧 自愈工程师
│   │   ├── auto-test-pipeline.ts        🎯 主编排引擎
│   │   └── index.ts                     📦 统一导出
│   ├── context-collector.ts             # 项目上下文收集
│   ├── llm-client.ts                    # LLM API 客户端
│   ├── pipeline-cli.ts                  # CLI 入口
│   ├── ARCHITECTURE.md                  # 架构文档
│   ├── README.md                        # 使用说明
│   └── FAILURE-LOG-EXAMPLE.md           # 失败日志示例
├── tests/
│   ├── ai-example/                      # AI 生成示例
│   │   └── report-view-ai.spec.ts
│   ├── smoke/                           # 冒烟测试
│   └── regression/                      # 回归测试
├── fixtures/                            # 测试夹具
│   ├── auth.fixture.ts
│   └── data.fixture.ts
├── pages/                               # Page Object
│   ├── report-list.page.ts
│   └── report-detail.page.ts
├── run-ai-test.sh                       # 一键运行脚本
└── playwright.config.ts                 # Playwright 配置
```

---

## 测试日志示例

### 成功执行

```
🚀 启动 AI 自动化测试流水线...

[📋 测试计划] 开始分析需求：登录和主检评估流程
[📋 测试计划] 已收集 5 个 Page Object
[📋 测试计划] 已收集 3 个角色 Fixture
[📋 测试计划] 生成 4 个测试场景

[🤖 代码生成] 开始生成测试代码...
[🤖 代码生成] 生成 4 个测试用例
[🤖 代码生成] 代码已保存：tests/smoke/auto-login-ai.spec.ts

[▶️ 测试执行] 开始执行测试...
[▶️ 测试执行] 执行完成：4 通过，0 失败，0 跳过

============================================================
                    测试执行摘要
============================================================
功能模块：登录 - 总检 - 主检评估
测试类型：smoke
场景数量：4
生成用例：4 个
代码有效：✅

执行结果:
  ✅ 通过：4
  ❌ 失败：0
  ⏭️  跳过：0
  ⏱️  耗时：32.5s

最终状态：✅ 全部通过
============================================================
```

### 失败自愈

```
[▶️ 测试执行] 执行完成：2 通过，2 失败，0 跳过

[🔍 失败分析] 发现 2 个失败测试，开始分析...

[🔧 自愈循环] === 第 1 次自愈循环 ===
[🔍 失败分析] 分析失败：P1-医生可通过姓名搜索报告
[🔍 失败分析] 根因：timing - 按钮被隐藏，需要先展开面板
[🔍 失败分析] 置信度：95%
[🔧 自愈修复] 尝试修复：P1-医生可通过姓名搜索报告
[🔧 自愈修复] 修复成功，修改内容：
  + 新增：const advancedSearchBtn = page.getByText('高级搜索');
  + 新增：if (await advancedSearchBtn.isVisible()) {
  ~ 修改：等待 300ms => 等待面板展开动画

[✅ 验证修复] 重新执行测试...
[✅ 验证修复] 验证结果：3 通过，1 失败

[🔍 失败分析] 分析失败：P2-医生可使用报告预览功能
[🔧 自愈修复] 尝试修复...
[🔧 自愈修复] 修复成功

[✅ 验证修复] 重新执行测试...
[✅ 验证修复] 验证结果：4 通过，0 失败
[✅ 验证修复] ✅ 所有测试通过！

============================================================
                    测试执行摘要
============================================================
功能模块：体检报告查看
测试类型：smoke
场景数量：5
生成用例：5 个

执行结果:
  ✅ 通过：5
  ❌ 失败：0 (初始 2 个，已自愈修复)
  ⏱️  耗时：53.7s (含自愈循环)

失败分析:
  1. [timing] 查询按钮被隐藏，需要先展开面板
  2. [timing] 弹窗动画未完成

自愈结果:
  1. ✅ [timing] 添加展开搜索面板步骤
  2. ✅ [timing] 增加弹窗等待逻辑

最终状态：✅ 全部通过
============================================================
```

---

## 技术亮点

1. **多 Agent 协作**：5 个 Agent 各司其职，形成完整闭环
2. **自愈能力**：自动分析失败原因并修复，减少人工干预
3. **上下文感知**：收集项目 Page Objects、Fixtures，生成符合项目风格的代码
4. **可追溯性**：详细的日志输出和失败分析报告
5. **可扩展性**：模块化设计，易于添加新的 Agent 或功能

---

## 最佳实践遵循

### Playwright 最佳实践

- ✅ 使用 `data-testid` 优先定位元素
- ✅ 避免硬编码等待，使用 auto-waiting
- ✅ 使用 `await expect()` 断言
- ✅ 使用 `test.step()` 组织步骤
- ✅ 复用 `fixtures` 避免重复登录
- ✅ 录制 Trace 便于调试

### 代码质量

- ✅ TypeScript 类型安全
- ✅ 模块化设计
- ✅ 统一的错误处理
- ✅ 详细的注释和文档

---

## 后续扩展方向

1. **视觉回归测试**：集成截图对比功能
2. **性能测试**：集成 Lighthouse 等性能检测
3. **测试数据管理**：自动生成和管理测试数据
4. **CI/CD 集成**：与 GitLab CI、Jenkins 深度集成
5. **报告增强**：生成更丰富的 HTML 报告
6. **自然语言测试**：支持直接用中文编写测试用例

---

## 总结

本系统成功实现了基于多 Agent 架构的 AI 驱动自动化测试系统，包含：

- **5 个核心 Agent**：测试规划、代码生成、测试执行、失败分析、自动修复
- **完整的自动化流程**：从需求到执行到自愈的全流程自动化
- **详细的文档**：架构文档、使用说明、失败日志示例
- **示例代码**：可直接运行的示例测试
- **一键运行脚本**：简化的 CLI 和运行脚本

系统遵循 Playwright 最佳实践，采用模块化设计，易于扩展和维护。
