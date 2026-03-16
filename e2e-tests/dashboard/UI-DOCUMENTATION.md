# Unified Dashboard UI 文档

> AI 自动化测试系统 - 统一用户界面设计文档

## 概述

本 Dashboard 是一个统一的 Vue 3 + Element Plus 前端应用，整合了原有的两个 UI 界面功能，提供统一的 AI 测试生成和管理体验。

## 设计特点

### 1. 双主题支持
- **浅色主题**：明亮专业，适合日间使用
- **深色主题**：现代渐变，适合夜间工作
- 点击右上角日月图标随时切换

### 2. Agent 工作流可视化

#### 顶部工作流面板（AI 生成页面）
当 AI 生成测试时，顶部会显示紫色渐变的工作流可视化面板：

```
┌─────────────────────────────────────────────────────────────┐
│  📡 AI Agent 工作流                              [执行中]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐ │
│  │ 📄   │ →  │ ✨   │ →  │ ▶️   │ →  │ 🔍   │ →  │ 🔄   │ │
│  │测试  │    │代码  │    │测试  │    │失败  │    │自愈  │ │
│  │规划师│    │生成师│    │执行师│    │分析师│    │工程师│ │
│  └──────┘    └──────┘    └──────┘    └──────┘    └──────┘ │
│    完成 ✓     运行中...      等待        等待        等待   │
│                                                             │
│  整体进度 ████████████░░░░░░░░ 45%                         │
└─────────────────────────────────────────────────────────────┘
```

#### 侧边栏 Agent 状态指示灯
侧边栏底部显示 5 个 Agent 的实时状态图标：
- 灰色：空闲/未执行
- 蓝色闪烁：正在运行
- 绿色：已完成
- 红色：失败

### 3. 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  E2E 测试平台                                          [🌙] │
├──────────┬──────────────────────────────────────────────────┤
│ AI 智能  │  生成配置                                        │
│ ├─AI 生成 │ ┌─────────────────────────────────────────────┐ │
│ ├─AI 修改 │  │ 功能描述：[________________]               │ │
│ └─URL 分析│  │ 测试类型：○冒烟 ○回归                      │ │
│          │  │ [生成配置表单]                               │ │
│ 测试管理 │  └─────────────────────────────────────────────┘ │
│ ├─可视化 │                                                  │
│ ├─用例管理│  ┌─────────────────────────────────────────────┐ │
│ ├─用例浏览│  │ 生成进度 / 步骤时间线                        │ │
│ └─执行台 │  │ [实时日志输出]                               │ │
│          │  └─────────────────────────────────────────────┘ │
│ 系统     │                                                  │
│ └─配置管理│  ┌─────────────────────────────────────────────┐ │
│          │  │ 生成结果（代码预览）                         │ │
│ [Agent 状态]│  │ [TypeScript 代码]                            │ │
│ 📄✨▶️🔍🔄 │  └─────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────┘
```

## 文件结构

```
dashboard/
├── src/
│   ├── components/
│   │   ├── ai/
│   │   │   ├── AgentWorkflowStatus.vue    ← 新增：Agent 工作流可视化
│   │   │   ├── CodePreview.vue            ← 代码预览
│   │   │   ├── InteractiveModals.vue      ← 交互式弹窗
│   │   │   ├── ProgressLog.vue            ← 进度日志
│   │   │   ├── StepTimeline.vue           ← 步骤时间线
│   │   │   └── modals/                    ← 各种确认弹窗
│   │   ├── layout/
│   │   │   ├── AppHeader.vue              ← 头部（含主题切换）
│   │   │   └── AppSidebar.vue             ← 侧边栏（含 Agent 状态）
│   │   └── ...
│   ├── stores/
│   │   └── ai.store.ts                    ← AI 状态管理（含 Agent 流水线）
│   ├── types/
│   │   ├── agent.types.ts                 ← Agent 类型定义
│   │   └── interactive.types.ts           ← 交互式类型定义
│   ├── views/
│   │   └── AiGenerateView.vue             ← AI 生成主页面
│   └── App.vue                            ← 应用根组件（主题切换）
```

## 核心组件

### AgentWorkflowStatus.vue

**位置**: `src/components/ai/AgentWorkflowStatus.vue`

**功能**: 可视化显示 5 个 Agent 的执行状态

**Props**:
- `agents`: AgentNode[] - Agent 节点数组
- `currentAgent`: AgentId | null - 当前执行的 Agent
- `overallProgress`: number - 整体进度 (0-100)
- `overallStatus`: AgentStatus - 整体状态

**Events**:
- `agentClick`: 点击 Agent 节点时触发

**视觉效果**:
- 紫色渐变背景 (#667eea → #764ba2)
- 节点间连接线动画
- 运行时进度环
- 状态标记（成功/失败图标）

### AppHeader.vue

**位置**: `src/components/layout/AppHeader.vue`

**功能**:
- 显示当前页面标题
- 显示测试运行/AI 生成状态
- 主题切换按钮

### AppSidebar.vue

**位置**: `src/components/layout/AppSidebar.vue`

**功能**:
- 主导航菜单
- Agent 状态指示灯（底部）

**Agent 状态区域**:
- 5 个图标对应 5 个 Agent
- 运行时蓝色脉冲动画
- 完成/失败颜色指示

### ai.store.ts

**位置**: `src/stores/ai.store.ts`

**新增状态**:
```typescript
agentPipeline: {
  agents: AgentNode[];       // 5 个 Agent 节点
  currentAgent: AgentId | null;
  overallProgress: number;
  overallStatus: AgentStatus;
}
```

**新增方法**:
- `updateAgentStatus(agentId, status, result, duration, error)`
- `setCurrentAgent(agentId)`
- `setAgentProgress(agentId, progress)`
- `setPipelineOverallStatus(status)`
- `setPipelineOverallProgress(progress)`
- `resetAgentPipeline()`

## WebSocket 事件

### 客户端接收的事件

| 事件类型 | 数据 | 说明 |
|---------|------|------|
| `agent:start` | `{ agentId }` | Agent 开始执行 |
| `agent:complete` | `{ agentId, result, duration }` | Agent 执行完成 |
| `agent:failed` | `{ agentId, error }` | Agent 执行失败 |
| `agent:progress` | `{ agentId, progress }` | Agent 进度更新 |
| `pipeline:complete` | `{}` | 整个流水线完成 |

### 客户端发送的事件

| 事件类型 | 数据 | 说明 |
|---------|------|------|
| `subscribe` | `{ channel }` | 订阅频道 |
| `unsubscribe` | `{ channel }` | 取消订阅 |

## Agent 类型定义

### AgentId
```typescript
type AgentId =
  | 'test-planner'        // 测试规划师
  | 'test-generator'      // 代码生成师
  | 'test-executor'       // 测试执行师
  | 'failure-analysis'    // 失败分析师
  | 'self-healing';       // 自愈工程师
```

### AgentStatus
```typescript
type AgentStatus =
  | 'idle'       // 空闲
  | 'running'    // 运行中
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'skipped';   // 跳过
```

### AgentNode 接口
```typescript
interface AgentNode {
  id: AgentId;
  name: string;
  description: string;
  status: AgentStatus;
  icon: string;
  progress?: number;     // 0-100
  duration?: number;     // ms
  error?: string;
  result?: any;
}
```

## 主题切换

### CSS 变量

```css
/* 浅色主题（默认） */
:root {
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --text-primary: #303133;
  --text-secondary: #606266;
  --border-color: #e4e7ed;
  --aside-bg: #1d1e1f;
  --aside-text: #bfcbd9;
}

/* 深色主题 */
:root.dark-theme {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --border-color: #2d3748;
  --aside-bg: #0f0f1a;
  --aside-text: #a0aec0;
}
```

### 使用方法

```vue
<script setup>
import { ref } from 'vue';
const isDarkTheme = ref(false);

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value;
  if (isDarkTheme.value) {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
}
</script>
```

## 动画效果

### 脉冲动画（运行中的 Agent）
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

### 进度环动画
```css
.circular-progress .progress-bar {
  transition: stroke-dasharray 0.3s ease;
}
```

### 连接线流动动画
```svg
<circle class="active-dot">
  <animate attributeName="cx" from="60" to="140" dur="1s" repeatCount="indefinite" />
</circle>
```

## 响应式布局

AI 生成页面使用 Element Plus 的栅格系统：

- **非生成状态**: 左侧 10 列，右侧 14 列
- **生成状态**: 左侧 8 列，右侧 16 列（为工作流可视化腾出空间）

```vue
<el-row :gutter="20" :class="{ 'with-agent-workflow': isGenerating }">
  <el-col :span="isGenerating ? 8 : 10">...</el-col>
  <el-col :span="isGenerating ? 16 : 14">...</el-col>
</el-row>
```

## 扩展指南

### 添加新的 Agent

1. 在 `types/agent.types.ts` 中添加新的 `AgentId`
2. 在 `ai.store.ts` 的 `resetAgentPipeline` 中添加新的 Agent 节点
3. 在 `AgentWorkflowStatus.vue` 的 `getAgentIcon` 中添加图标映射
4. 在后端 Agent 实现中发送对应的 WebSocket 事件

### 添加新的页面视图

1. 在 `views/` 目录创建新的 `.vue` 文件
2. 在 `router/index.ts`（如有）或 `AppSidebar.vue` 中添加路由
3. 在 `AppHeader.vue` 的 `titleMap` 中添加页面标题映射

## 最佳实践

1. **组件复用**: 将通用 UI 逻辑提取为组合式函数（composables）
2. **状态管理**: 使用 Pinia store 集中管理跨组件状态
3. **类型安全**: 所有 props、emits、store 状态都使用 TypeScript
4. **响应式**: 使用 `computed` 属性而非手动更新
5. **性能**: 大列表使用虚拟滚动，避免 DOM 过多

## 故障排查

### 主题切换不生效
- 检查 `document.documentElement.classList` 是否正确添加/移除 `dark-theme`
- 检查 CSS 变量是否在所有组件中正确使用

### Agent 状态不更新
- 检查 WebSocket 连接状态
- 检查事件名称是否匹配（大小写敏感）
- 确认 store 方法是响应式更新

### 组件样式不生效
- 检查 `<style scoped>` 是否需要 `:deep()` 选择器
- 检查 CSS 变量是否在全局定义

## 版本历史

- **v2.0** (2026-03): 整合两个 UI，添加 Agent 工作流可视化
- **v1.0**: 初始版本，基础 Dashboard 功能
