# GitLab CI配置

<cite>
**本文档引用的文件**
- [.gitlab-ci.yml](file://e2e-tests/.gitlab-ci.yml)
- [package.json](file://e2e-tests/package.json)
- [playwright.config.ts](file://e2e-tests/playwright.config.ts)
- [Jenkinsfile](file://e2e-tests/Jenkinsfile)
- [login.spec.ts](file://e2e-tests/tests/smoke/login.spec.ts)
- [auth.setup.ts](file://e2e-tests/fixtures/auth.setup.ts)
- [auth.fixture.ts](file://e2e-tests/fixtures/auth.fixture.ts)
- [tsconfig.json](file://e2e-tests/tsconfig.json)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介

本指南提供了针对医院体检报告管理系统端到端测试的GitLab CI配置完整实施指南。该配置基于Playwright框架，实现了从冒烟测试到回归测试的完整测试流水线，支持多浏览器并行执行、测试报告生成和通知集成。

项目采用现代化的测试架构，包含登录态管理、页面对象模式和AI辅助测试功能，通过GitLab CI实现自动化持续集成和部署。

## 项目结构

项目采用模块化组织结构，主要包含以下关键目录：

```mermaid
graph TB
subgraph "根目录"
Root[项目根目录]
end
subgraph "e2e-tests 根目录"
E2E[e2e-tests/]
Config[配置文件]
Tests[测试文件]
Pages[页面对象]
Fixtures[测试夹具]
Utils[工具函数]
Reports[测试报告]
end
subgraph "配置文件"
GitLab[.gitlab-ci.yml]
Package[package.json]
Playwright[playwright.config.ts]
TSConfig[tsconfig.json]
end
subgraph "测试文件"
Smoke[smoke/]
Regression[regression/]
Login[login.spec.ts]
CRUD[report-crud.spec.ts]
Workflow[report-workflow.spec.ts]
end
subgraph "页面对象"
LoginPage[login.page.ts]
AuditPage[audit.page.ts]
ReportList[report-list.page.ts]
ReportDetail[report-detail.page.ts]
ReportEdit[report-edit.page.ts]
end
subgraph "测试夹具"
AuthFixture[auth.fixture.ts]
AuthSetup[auth.setup.ts]
AuthTeardown[auth.teardown.ts]
DataFixture[data.fixture.ts]
end
Root --> E2E
E2E --> Config
E2E --> Tests
E2E --> Pages
E2E --> Fixtures
E2E --> Utils
E2E --> Reports
Config --> GitLab
Config --> Package
Config --> Playwright
Config --> TSConfig
Tests --> Smoke
Tests --> Regression
Smoke --> Login
Regression --> CRUD
Regression --> Workflow
```

**图表来源**
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)

**章节来源**
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)

## 核心组件

### 流水线阶段定义

项目定义了五个核心阶段，每个阶段都有明确的职责和触发条件：

| 阶段名称 | 阶段编号 | 职责描述 | 触发条件 |
|---------|---------|---------|---------|
| build | 1 | 构建环境准备 | 所有提交 |
| deploy-test | 2 | 测试环境部署 | 所有提交 |
| smoke-test | 3 | 冒烟测试执行 | 推送事件 |
| regression-test | 4 | 回归测试执行 | 主分支推送 |
| report | 5 | 报告发布与通知 | 始终执行 |

### 作业配置

每个作业都配置了标准化的执行环境和输出：

```mermaid
flowchart TD
Start([作业开始]) --> StageCheck{检查阶段类型}
StageCheck --> |冒烟测试| SmokeJob[smoke-test作业]
StageCheck --> |回归测试| RegJob[regression-test作业]
StageCheck --> |报告发布| ReportJob[publish-report作业]
SmokeJob --> InstallDeps[安装依赖]
RegJob --> InstallDeps
InstallDeps --> RunTests[执行测试]
RunTests --> GenerateReports[生成测试报告]
GenerateReports --> ArchiveArtifacts[归档制品]
ArchiveArtifacts --> End([作业结束])
ReportJob --> SendNotification[发送通知]
SendNotification --> End
```

**图表来源**
- [.gitlab-ci.yml:12-67](file://e2e-tests/.gitlab-ci.yml#L12-L67)

**章节来源**
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)

## 架构概览

### CI/CD流水线架构

```mermaid
graph TB
subgraph "Git仓库"
Git[Git仓库]
Branches[分支管理]
end
subgraph "GitLab Runner"
Runner[GitLab Runner]
Docker[Docker容器]
Cache[缓存层]
end
subgraph "测试执行"
Playwright[Playwright测试框架]
Projects[测试项目配置]
Artifacts[测试制品]
end
subgraph "报告与通知"
HTMLReport[HTML报告]
JUnitXML[JUnit XML]
Allure[Allure报告]
Notification[通知系统]
end
Git --> Runner
Runner --> Docker
Docker --> Playwright
Playwright --> Projects
Projects --> Artifacts
Artifacts --> HTMLReport
Artifacts --> JUnitXML
Artifacts --> Allure
HTMLReport --> Notification
JUnitXML --> Notification
Allure --> Notification
```

**图表来源**
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)

### 测试项目架构

```mermaid
classDiagram
class PlaywrightConfig {
+testDir : string
+timeout : number
+workers : number
+retries : number
+projects : Project[]
+use : TestUse
}
class Project {
+name : string
+testMatch : RegExp
+use : Device
+dependencies : string[]
}
class TestUse {
+baseURL : string
+screenshot : string
+video : string
+trace : string
}
class SetupFixture {
+authenticateAsDoctor() : void
+authenticateAsAuditor() : void
+authenticateAsAdmin() : void
}
class LoginPage {
+goto() : Promise<void>
+login(username, password) : Promise<void>
+attemptLogin(username, password) : Promise<void>
+errorMessage : Locator
}
PlaywrightConfig --> Project : "包含多个"
Project --> SetupFixture : "依赖"
SetupFixture --> LoginPage : "使用"
LoginPage --> TestUse : "配置"
```

**图表来源**
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)
- [auth.setup.ts:1-28](file://e2e-tests/fixtures/auth.setup.ts#L1-L28)
- [auth.fixture.ts:1-40](file://e2e-tests/fixtures/auth.fixture.ts#L1-L40)
- [login.spec.ts:1-25](file://e2e-tests/tests/smoke/login.spec.ts#L1-L25)

**章节来源**
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)
- [auth.setup.ts:1-28](file://e2e-tests/fixtures/auth.setup.ts#L1-L28)
- [auth.fixture.ts:1-40](file://e2e-tests/fixtures/auth.fixture.ts#L1-L40)
- [login.spec.ts:1-25](file://e2e-tests/tests/smoke/login.spec.ts#L1-L25)

## 详细组件分析

### GitLab CI配置详解

#### 阶段定义与执行顺序

项目采用严格的阶段顺序确保测试流程的完整性：

```mermaid
sequenceDiagram
participant Git as Git推送
participant Runner as GitLab Runner
participant Build as 构建阶段
participant Deploy as 部署阶段
participant Smoke as 冒烟测试
participant Regression as 回归测试
participant Report as 报告阶段
Git->>Runner : 推送代码
Runner->>Build : 执行构建
Build->>Deploy : 部署测试环境
Deploy->>Smoke : 执行冒烟测试
Smoke->>Regression : 条件执行回归测试
Regression->>Report : 生成测试报告
Report->>Git : 归档制品并发送通知
```

**图表来源**
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)

#### 冒烟测试作业配置

冒烟测试作业配置了专门的执行环境和输出策略：

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 镜像 | mcr.microsoft.com/playwright:v1.50.0-jammy | 使用官方Playwright镜像 |
| 工作目录 | e2e-tests | 指定测试目录 |
| 依赖安装 | pnpm install --frozen-lockfile | 使用锁定文件确保版本一致 |
| 测试执行 | playwright test --project=smoke-chromium | 仅执行冒烟测试项目 |
| 艺术品归档 | playwright-report, test-results, results | 归档所有测试相关文件 |
| 过期时间 | 7天 | 控制制品存储期限 |

#### 回归测试作业配置

回归测试作业具有更严格的要求和更长的保留策略：

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 触发条件 | 仅在main分支 | 确保只有主分支变更才执行 |
| 允许失败 | false | 失败将阻止后续阶段 |
| 浏览器支持 | Chromium + Firefox | 多浏览器兼容性验证 |
| 保留时间 | 30天 | 更长的报告保留期 |

**章节来源**
- [.gitlab-ci.yml:12-46](file://e2e-tests/.gitlab-ci.yml#L12-L46)

### Playwright配置分析

#### 测试项目配置

项目定义了三个核心测试项目，每个项目都有特定的用途和配置：

```mermaid
flowchart LR
subgraph "测试项目层次"
Setup[setup项目<br/>登录态准备]
subgraph "冒烟测试"
SmokeChromium[smoke-chromium<br/>Chrome浏览器]
end
subgraph "回归测试"
RegChromium[regression-chromium<br/>Chrome浏览器]
RegFirefox[regression-firefox<br/>Firefox浏览器]
end
end
Setup --> SmokeChromium
Setup --> RegChromium
Setup --> RegFirefox
```

**图表来源**
- [playwright.config.ts:31-66](file://e2e-tests/playwright.config.ts#L31-L66)

#### 测试执行策略

```mermaid
flowchart TD
Start([测试开始]) --> ParallelCheck{并行执行?}
ParallelCheck --> |是| EnableParallel[启用完全并行]
ParallelCheck --> |否| DisableParallel[串行执行]
EnableParallel --> Workers[设置工作进程数]
Workers --> Retries[配置重试次数]
Retries --> Reporter[选择报告器]
DisableParallel --> SingleWorker[单工作进程]
SingleWorker --> NoRetries[无重试]
NoRetries --> SimpleReporter[简单报告器]
Reporter --> Output[生成多种格式报告]
SimpleReporter --> Output
Output --> End([测试结束])
```

**图表来源**
- [playwright.config.ts:12-22](file://e2e-tests/playwright.config.ts#L12-L22)

**章节来源**
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)

### 测试夹具与登录态管理

#### 认证夹具设计

认证夹具提供了角色化的测试环境隔离：

| 角色 | 存储状态文件 | 页面上下文 | 用途 |
|------|-------------|-----------|------|
| doctor | doctor.json | doctorPage | 医生权限测试 |
| auditor | auditor.json | auditorPage | 审计员权限测试 |
| admin | admin.json | adminPage | 管理员权限测试 |

#### 登录态持久化机制

```mermaid
sequenceDiagram
participant Setup as 认证设置
participant Browser as 浏览器实例
participant Storage as 存储状态
participant Fixture as 测试夹具
Setup->>Browser : 创建新上下文
Browser->>Browser : 导航到登录页
Browser->>Browser : 输入用户名密码
Browser->>Browser : 提交登录表单
Browser->>Browser : 等待重定向到仪表盘
Browser->>Storage : 保存存储状态
Storage->>Fixture : 提供给测试用例
Fixture->>Fixture : 注入到测试页面
```

**图表来源**
- [auth.setup.ts:17-26](file://e2e-tests/fixtures/auth.setup.ts#L17-L26)
- [auth.fixture.ts:10-37](file://e2e-tests/fixtures/auth.fixture.ts#L10-L37)

**章节来源**
- [auth.setup.ts:1-28](file://e2e-tests/fixtures/auth.setup.ts#L1-L28)
- [auth.fixture.ts:1-40](file://e2e-tests/fixtures/auth.fixture.ts#L1-L40)

### 测试用例设计

#### 冒烟测试用例

冒烟测试专注于核心功能验证，确保系统基本可用性：

```mermaid
flowchart TD
subgraph "冒烟测试场景"
LoginSuccess[登录成功场景]
LoginFailure[登录失败场景]
end
LoginSuccess --> NavigateDashboard[导航到仪表盘]
LoginFailure --> ShowErrorMessage[显示错误信息]
NavigateDashboard --> VerifyURL[验证URL包含/dashboard]
ShowErrorMessage --> VerifyErrorVisible[验证错误信息可见]
```

**图表来源**
- [login.spec.ts:4-24](file://e2e-tests/tests/smoke/login.spec.ts#L4-L24)

**章节来源**
- [login.spec.ts:1-25](file://e2e-tests/tests/smoke/login.spec.ts#L1-L25)

## 依赖关系分析

### 项目依赖图

```mermaid
graph TB
subgraph "运行时依赖"
Node[Node.js >= 18]
PNPM[pnpm包管理器]
Playwright[Playwright ^1.50.0]
Typescript[TypeScript ^5.3.0]
end
subgraph "开发依赖"
Allure[Allure命令行]
AllurePlaywright[Allure Playwright]
Dotenv[dotenv ^16.4.0]
MySQL2[mysql2 ^3.9.0]
TypesNode[@types/node ^20.11.0]
end
subgraph "测试依赖"
TestFramework[Playwright测试框架]
PageObjects[页面对象模式]
Fixtures[测试夹具]
AIAssistant[AI辅助测试]
end
PNPM --> Playwright
PNPM --> Typescript
PNPM --> Allure
PNPM --> AllurePlaywright
PNPM --> Dotenv
PNPM --> MySQL2
PNPM --> TypesNode
Playwright --> TestFramework
TestFramework --> PageObjects
PageObjects --> Fixtures
Fixtures --> AIAssistant
```

**图表来源**
- [package.json:1-27](file://e2e-tests/package.json#L1-L27)

### 环境变量管理

项目使用dotenv进行环境变量管理，支持不同环境的配置分离：

| 环境变量 | 默认值 | 用途 | GitLab CI中的配置 |
|----------|--------|------|-------------------|
| BASE_URL | http://localhost:8080 | 应用基础URL | 在.gitlab-ci.yml中设置 |
| CI | 环境检测 | CI环境标识 | 自动检测 |
| NODE_ENV | development | Node环境 | 可在CI中设置 |

**章节来源**
- [package.json:1-27](file://e2e-tests/package.json#L1-L27)
- [playwright.config.ts:24-29](file://e2e-tests/playwright.config.ts#L24-L29)

## 性能考虑

### 并行执行优化

项目在CI环境中启用了多项性能优化：

```mermaid
flowchart TD
subgraph "性能优化策略"
Parallel[完全并行执行]
Workers[4个工作进程]
Retries[2次重试]
Cleanup[自动清理]
end
subgraph "资源管理"
Timeout[30秒测试超时]
Screenshot[失败时截图]
Video[失败时录制视频]
Trace[失败时捕获trace]
end
Parallel --> Workers
Workers --> Retries
Retries --> Cleanup
Timeout --> Screenshot
Screenshot --> Video
Video --> Trace
```

**图表来源**
- [playwright.config.ts:12-29](file://e2e-tests/playwright.config.ts#L12-L29)

### 缓存策略

虽然当前配置未显式配置缓存，但建议在GitLab CI中实现以下缓存策略：

| 缓存类型 | 缓存路径 | 缓存键 | 有效期 |
|----------|----------|--------|--------|
| Node模块缓存 | e2e-tests/node_modules | node-modules-${CI_COMMIT_SHORT_SHA} | 1周 |
| Playwright浏览器缓存 | ~/.cache/ms-playwright | playwright-${PLAYWRIGHT_VERSION} | 1个月 |
| 测试报告缓存 | e2e-tests/playwright-report | test-reports-${CI_COMMIT_SHORT_SHA} | 7天 |

**章节来源**
- [playwright.config.ts:12-15](file://e2e-tests/playwright.config.ts#L12-L15)

## 故障排除指南

### 常见问题诊断

#### 测试执行失败

```mermaid
flowchart TD
TestFail[测试执行失败] --> CheckTimeout{检查超时设置}
CheckTimeout --> TimeoutTooShort[超时过短]
CheckTimeout --> TimeoutTooLong[超时过长]
TimeoutTooShort --> IncreaseTimeout[增加超时时间]
TimeoutTooLong --> DecreaseTimeout[减少超时时间]
TestFail --> CheckBrowser{检查浏览器状态}
CheckBrowser --> BrowserNotInstalled[浏览器未安装]
CheckBrowser --> BrowserVersionMismatch[浏览器版本不匹配]
BrowserNotInstalled --> InstallBrowser[安装Playwright浏览器]
BrowserVersionMismatch --> UpdatePlaywright[更新Playwright版本]
TestFail --> CheckNetwork{检查网络连接}
CheckNetwork --> NetworkTimeout[网络超时]
CheckNetwork --> BaseURLIncorrect[基础URL错误]
NetworkTimeout --> CheckProxy[检查代理设置]
BaseURLIncorrect --> VerifyBaseURL[验证基础URL]
```

#### 艺术品归档问题

```mermaid
flowchart TD
ArtifactIssue[艺术品归档问题] --> CheckPaths{检查归档路径}
CheckPaths --> PathExists[路径存在]
CheckPaths --> PathMissing[路径不存在]
PathExists --> CheckPermissions{检查文件权限}
CheckPermissions --> PermissionDenied[权限不足]
CheckPermissions --> PermissionOK[权限正常]
PathMissing --> CreatePath[创建缺失路径]
PermissionDenied --> FixPermissions[修复文件权限]
ArtifactIssue --> CheckExpiration{检查过期设置}
CheckExpiration --> ExpireTooSoon[过期时间过短]
CheckExpiration --> ExpireTooLate[过期时间过长]
ExpireTooSoon --> IncreaseExpire[增加过期时间]
ExpireTooLate --> DecreaseExpire[减少过期时间]
```

**章节来源**
- [.gitlab-ci.yml:19-46](file://e2e-tests/.gitlab-ci.yml#L19-L46)
- [playwright.config.ts:16-22](file://e2e-tests/playwright.config.ts#L16-L22)

### 错误处理与重试策略

项目实现了多层次的错误处理机制：

| 错误类型 | 处理策略 | 重试次数 | 最大等待时间 |
|----------|----------|----------|-------------|
| 网络超时 | 自动重试 | 2次 | 60秒 |
| 测试失败 | 重试执行 | 2次 | 60秒 |
| 环境问题 | 重新构建 | 1次 | 30秒 |
| 资源不足 | 降级执行 | 0次 | 立即失败 |

**章节来源**
- [playwright.config.ts:14-15](file://e2e-tests/playwright.config.ts#L14-L15)

### 通知配置

项目集成了企业微信通知机制，支持测试结果的实时通知：

```mermaid
sequenceDiagram
participant CI as GitLab CI
participant Script as 通知脚本
participant WeChat as 企业微信
participant Team as 开发团队
CI->>Script : 测试完成后执行
Script->>Script : 检查WECHAT_WEBHOOK_URL变量
Script->>WeChat : 发送Markdown通知
WeChat->>Team : 推送测试结果
Team->>Team : 查看测试报告链接
```

**图表来源**
- [.gitlab-ci.yml:53-64](file://e2e-tests/.gitlab-ci.yml#L53-L64)

**章节来源**
- [.gitlab-ci.yml:49-67](file://e2e-tests/.gitlab-ci.yml#L49-L67)

## 结论

本GitLab CI配置为医院体检报告管理系统提供了完整的端到端测试解决方案。通过精心设计的流水线阶段、多浏览器测试支持和智能通知机制，确保了测试流程的可靠性、可维护性和可观测性。

关键优势包括：
- **模块化架构**：清晰的阶段划分和作业配置
- **多环境支持**：冒烟测试和回归测试的差异化配置
- **自动化报告**：多种格式的测试报告生成
- **智能通知**：实时测试结果通知机制
- **性能优化**：并行执行和资源管理策略

建议在实际部署中进一步完善缓存策略、监控指标和告警机制，以提升整体CI/CD流程的效率和稳定性。

## 附录

### 配置最佳实践清单

#### 环境配置
- [ ] 设置BASE_URL环境变量
- [ ] 配置WECHAT_WEBHOOK_URL通知URL
- [ ] 验证Node.js版本要求
- [ ] 确认Playwright浏览器版本

#### 缓存优化
- [ ] 实现Node模块缓存
- [ ] 配置Playwright浏览器缓存
- [ ] 设置适当的制品保留策略
- [ ] 优化测试执行时间

#### 监控与告警
- [ ] 配置测试成功率阈值
- [ ] 设置失败通知渠道
- [ ] 实现测试报告质量检查
- [ ] 建立性能基准监控

#### 安全考虑
- [ ] 使用GitLab CI变量管理敏感信息
- [ ] 实施最小权限原则
- [ ] 定期轮换访问令牌
- [ ] 启用审计日志记录