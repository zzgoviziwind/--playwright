# AI 自动化测试系统

> 基于多 Agent 架构的 AI 驱动 Playwright 自动化测试系统

## 功能特性

- 📋 **Test Planner Agent** - 自动分析需求，生成测试计划
- 🤖 **Test Generator Agent** - 自动生成 Playwright 测试代码
- ▶️ **Test Executor Agent** - 自动执行测试并收集结果
- 🔍 **Failure Analysis Agent** - 自动分析失败原因
- 🔧 **Self-Healing Agent** - 自动修复测试代码

## 快速开始

### 1. 环境检查

```bash
# 检查 Node.js 和 npm
node --version
npm --version

# 检查环境配置
cd e2e-tests
./run-ai-test.sh check
```

### 2. 安装依赖

```bash
cd e2e-tests
npm install
npx playwright install chromium
```

### 3. 配置 LLM API

编辑 `.env` 文件：

```env
LLM_API_URL=https://your-api-endpoint.com
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-4
```

### 4. 启动 UI 界面

```bash
# 启动完整的测试管理平台 (Vue + Vite)
cd e2e-tests
npm run ui

# 访问地址：http://localhost:3200
```

UI 界面功能：
- **AI 生成测试** - 输入需求自动生成测试代码，实时显示 5 个 Agent 执行状态
- **测试管理器** - 浏览和管理测试文件
- **测试运行器** - 执行测试并查看实时结果
- **URL 分析器** - 分析页面 URL 生成测试路径
- **可视化构建器** - 可视化方式构建测试用例
- **深色/浅色主题切换** - 点击右上角主题切换按钮

UI 设计特点：
- 统一的渐变紫色 Agent 工作流可视化面板
- 实时显示 5 个 Agent（测试规划师 → 代码生成师 → 测试执行师 → 失败分析师 → 自愈工程师）
- 侧边栏底部显示 Agent 状态指示灯
- 支持深色主题，采用现代暗色渐变设计

详细 UI 使用说明请查看：`dashboard/README.md` (如有)

### 5. 运行演示

```bash
# 运行 AI 生成的示例测试
./run-ai-test.sh demo
```

### 6. 运行完整流水线

```bash
# 生成并执行测试（自动自愈）
./run-ai-test.sh run \
  --requirement "登录和主检评估流程" \
  --type smoke

# 使用有头模式查看执行过程
./run-ai-test.sh run \
  --requirement "体检报告审核功能" \
  --type smoke \
  --headed \
  --slow-mo 100
```

## 使用示例

### 示例 1：生成体检报告审核测试

```bash
npx ts-node ai/pipeline-cli.ts run \
  --requirement "医生审核体检报告，包括通过和退回操作" \
  --type smoke
```

### 示例 2：生成登录功能测试

```bash
npx ts-node ai/pipeline-cli.ts run \
  --requirement "管理员登录系统，验证登录成功后的页面跳转" \
  --type smoke
```

### 示例 3：生成复杂工作流测试

```bash
npx ts-node ai/pipeline-cli.ts run \
  --requirement "体检报告完整流程：创建 - 编辑 - 审核 - 发布 - 查看" \
  --type regression \
  --max-retries 2
```

## 架构说明

```
用户输入 (需求描述)
       │
       ▼
┌─────────────────┐
│ Test Planner    │──> 测试计划 (JSON)
│ Agent           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Test Generator  │──> Playwright 测试代码
│ Agent           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Test Executor   │──> 测试结果 (通过/失败)
│ Agent           │
└────────┬────────┘
         │
         ▼ (如果失败)
┌─────────────────┐
│ Failure Analysis│──> 失败分析报告
│ Agent           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Self-Healing    │──> 修复后的代码
│ Agent           │
└─────────────────┘
```

详细架构文档请查看：[ARCHITECTURE.md](./ARCHITECTURE.md)

## 输出示例

### 测试计划输出

```json
{
  "feature": "体检报告审核",
  "type": "smoke",
  "scenarios": [
    {
      "name": "医生审核报告",
      "priority": "P0",
      "steps": [
        { "action": "登录系统", "expected": "登录成功" },
        { "action": "进入报告列表", "expected": "列表加载完成" },
        { "action": "打开待审核报告", "expected": "报告详情可见" },
        { "action": "点击审核通过", "expected": "审核成功提示" }
      ],
      "expectedResult": "报告审核成功"
    }
  ],
  "recommendedFixtures": ["doctorPage"],
  "recommendedPageObjects": ["ReportListPage", "ReportDetailPage"]
}
```

### 测试执行摘要

```
============================================================
                    测试执行摘要
============================================================
功能模块：体检报告审核
测试类型：smoke
场景数量：3
生成用例：5 个
代码有效：✅

执行结果:
  ✅ 通过：4
  ❌ 失败：1
  ⏭️  跳过：0
  ⏱️  耗时：45.2s

失败分析:
  1. [locator] 页面按钮 class 发生变化
     置信度：95%
     建议：使用 data-testid 定位

自愈结果:
  1. ✅ [locator] 将失效的选择器更新为 data-testid

最终状态：✅ 全部通过
============================================================
```

## 最佳实践

### 1. 需求描述编写

好的需求描述应包含：
- **角色**：谁在执行操作（医生/管理员/审核员）
- **动作**：执行什么操作（登录/查看/审核/编辑）
- **预期**：期望的结果（成功/失败提示）

示例：
```
✅ 好：医生登录系统后查看体检报告列表，并执行审核操作
❌ 差：测试登录和审核
```

### 2. 测试类型选择

| 类型 | 适用场景 | 用例数量 |
|------|----------|----------|
| smoke | 核心功能验证、快速反馈 | 3-5 个 |
| regression | 全面测试、边界情况 | 5-10 个 |

### 3. 自愈配置

- 默认重试 1 次
- 复杂场景可设置 `--max-retries 2`
- 过多重试可能导致时间浪费

## 故障排查

### 问题：LLM API 调用失败

```bash
# 检查 .env 配置
cat .env | grep LLM

# 测试 API 连接
curl -H "Authorization: Bearer $LLM_API_KEY" $LLM_API_URL/chat/completions
```

### 问题：Playwright 浏览器未安装

```bash
npx playwright install chromium
```

### 问题：测试执行超时

增加超时配置：
```bash
npx ts-node ai/pipeline-cli.ts run \
  --requirement "..." \
  --max-retries 0
```

## 项目结构

```
e2e-tests/
├── ai/                         # AI 测试生成系统
│   ├── agents/                 # Agent 模块
│   │   ├── test-planner.agent.ts
│   │   ├── test-generator.agent.ts
│   │   ├── test-executor.agent.ts
│   │   ├── failure-analysis.agent.ts
│   │   ├── self-healing.agent.ts
│   │   ├── auto-test-pipeline.ts
│   │   └── index.ts
│   ├── context-collector.ts    # 上下文收集
│   ├── llm-client.ts           # LLM 客户端
│   ├── pipeline-cli.ts         # CLI 入口
│   ├── ARCHITECTURE.md         # 架构文档
│   ├── README.md               # 本文件
│   └── FAILURE-LOG-EXAMPLE.md  # 失败日志示例
├── dashboard/                  # UI 界面 (Vue + Vite)
│   ├── server/                 # 后端服务器
│   ├── src/                    # 前端 Vue 组件
│   └── views/                  # 视图页面
├── tests/
│   ├── ai-example/             # AI 生成示例
│   ├── smoke/                  # 冒烟测试
│   └── regression/             # 回归测试
├── fixtures/                   # 测试夹具
├── pages/                      # Page Object
└── run-ai-test.sh              # 一键运行脚本
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
