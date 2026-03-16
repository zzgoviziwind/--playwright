# CI/CD集成

<cite>
**本文引用的文件**
- [.gitlab-ci.yml](file://e2e-tests/.gitlab-ci.yml)
- [Jenkinsfile](file://e2e-tests/Jenkinsfile)
- [package.json](file://e2e-tests/package.json)
- [playwright.config.ts](file://e2e-tests/playwright.config.ts)
- [login.spec.ts](file://e2e-tests/tests/smoke/login.spec.ts)
- [auth.setup.ts](file://e2e-tests/fixtures/auth.setup.ts)
- [auth.fixture.ts](file://e2e-tests/fixtures/auth.fixture.ts)
- [api-helper.ts](file://e2e-tests/utils/api-helper.ts)
- [report-crud.spec.ts](file://e2e-tests/tests/regression/report-crud.spec.ts)
- [login.page.ts](file://e2e-tests/pages/login.page.ts)
- [data.fixture.ts](file://e2e-tests/fixtures/data.fixture.ts)
- [tsconfig.json](file://e2e-tests/tsconfig.json)
- [script-generator.ts](file://e2e-tests/ai/script-generator.ts)
- [test-generator.ts](file://e2e-tests/ai/test-generator.ts)
- [auth.teardown.ts](file://e2e-tests/fixtures/auth.teardown.ts)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考量](#性能考量)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本指南面向DevOps工程师与测试工程师，提供基于GitLab CI与Jenkins的端到端自动化测试（E2E）CI/CD集成实施指南。文档围绕以下目标展开：
- GitLab CI流水线设计：构建、冒烟测试、回归测试、报告归档与通知
- Jenkins集成：阶段化安装、冒烟与回归测试、报告与制品归档
- Playwright测试调度、并行执行与资源管理
- 测试数据准备与清理、API辅助工具与环境变量管理
- 密钥安全与部署策略建议
- 监控、故障排除与性能优化

## 项目结构
本仓库采用“特性+层”混合组织方式，核心目录与职责如下：
- e2e-tests：端到端测试工程，包含测试用例、页面对象、夹具、工具与CI配置
  - tests：按套件组织的测试用例（smoke与regression）
  - pages：页面对象封装
  - fixtures：登录态夹具与数据夹具
  - utils：API辅助工具
  - ai：AI驱动的测试用例与脚本生成工具
  - playwright.config.ts：Playwright配置（项目、报告器、并发与重试等）
  - package.json：脚本与依赖
  - .gitlab-ci.yml：GitLab流水线
  - Jenkinsfile：Jenkins流水线

```mermaid
graph TB
subgraph "e2e-tests"
A["tests/"]
B["pages/"]
C["fixtures/"]
D["utils/"]
E["ai/"]
F["playwright.config.ts"]
G["package.json"]
H[".gitlab-ci.yml"]
I["Jenkinsfile"]
end
A --> F
B --> F
C --> F
D --> F
E --> F
F --> G
H --> F
I --> F
```

图表来源
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)

章节来源
- [playwright.config.ts:1-68](file://e2e-tests/playwright.config.ts#L1-L68)
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)

## 核心组件
- Playwright配置与项目
  - 项目定义：setup、cleanup、smoke-chromium、regression-chromium、regression-firefox
  - 并发与重试：CI环境下启用并行与重试，本地开发关闭
  - 报告器：CI环境下输出HTML、JUnit与Allure；本地仅HTML
  - 基础URL：从环境变量读取，支持不同环境
- 测试用例与页面对象
  - 冒烟测试：登录场景验证
  - 回归测试：CRUD与工作流场景
  - 页面对象：Login、Report等页面交互封装
- 夹具与数据准备
  - 登录态夹具：按角色注入storageState
  - 数据夹具：自动创建/清理测试数据
- API辅助工具
  - 管理员身份认证上下文、报告创建/更新/删除、批量清理
- CI配置
  - GitLab：多阶段流水线、制品归档、通知
  - Jenkins：Docker Agent、阶段化执行、报告与制品归档

章节来源
- [playwright.config.ts:31-66](file://e2e-tests/playwright.config.ts#L31-L66)
- [login.spec.ts:1-25](file://e2e-tests/tests/smoke/login.spec.ts#L1-L25)
- [report-crud.spec.ts:1-122](file://e2e-tests/tests/regression/report-crud.spec.ts#L1-L122)
- [login.page.ts:1-52](file://e2e-tests/pages/login.page.ts#L1-L52)
- [auth.fixture.ts:1-40](file://e2e-tests/fixtures/auth.fixture.ts#L1-L40)
- [data.fixture.ts:1-57](file://e2e-tests/fixtures/data.fixture.ts#L1-L57)
- [api-helper.ts:1-172](file://e2e-tests/utils/api-helper.ts#L1-L172)
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)

## 架构总览
下图展示CI/CD在GitLab与Jenkins中的执行路径、测试运行与报告产出。

```mermaid
graph TB
subgraph "GitLab CI"
GL1["触发器<br/>push/main"]
GL2["stage: build"]
GL3["stage: deploy-test"]
GL4["stage: smoke-test"]
GL5["stage: regression-test"]
GL6["stage: report"]
GL4 --> GLArt["制品: playwright-report/test-results/results"]
GL6 --> GLNoti["通知: 企业微信(可选)"]
end
subgraph "Jenkins"
J1["Agent Docker<br/>mcr.microsoft.com/playwright:v1.50.0-jammy"]
J2["Install 阶段"]
J3["Smoke Test 阶段"]
J4["Regression Test 阶段(仅main)"]
J5["post: always 归档报告/制品"]
end
subgraph "Playwright"
P1["项目: setup/cleanup"]
P2["项目: smoke-chromium"]
P3["项目: regression-chromium/firefox"]
P4["报告器: HTML/JUnit/Allure"]
end
GL1 --> GL4
GL1 --> GL5
GL4 --> GLArt
GL5 --> GLArt
GL6 --> GLNoti
J2 --> J3 --> J4 --> J5
J3 --> P2
J4 --> P3
J5 --> P4
GL4 --> P2
GL5 --> P3
GLArt --> P4
```

图表来源
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)
- [playwright.config.ts:31-66](file://e2e-tests/playwright.config.ts#L31-L66)

## 详细组件分析

### GitLab CI流水线设计
- 阶段划分
  - build：镜像拉取与准备（由Playwright镜像完成）
  - deploy-test：部署测试环境（占位，当前未实现具体步骤）
  - smoke-test：冒烟测试（Chromium）
  - regression-test：回归测试（Chromium + Firefox）
  - report：报告归档与通知
- 触发规则
  - 冒烟测试：push事件触发
  - 回归测试：main分支触发
- 制品归档
  - playwright-report、test-results、results
  - 归档保留期：冒烟7天，回归30天
- 通知机制
  - 通过Webhook发送Markdown消息至企业微信（可配置）

```mermaid
sequenceDiagram
participant Dev as "开发者"
participant GL as "GitLab Runner"
participant PW as "Playwright"
participant ART as "Artifacts"
participant WX as "企业微信"
Dev->>GL : 推送代码
GL->>PW : 运行冒烟测试(smoke-chromium)
PW-->>ART : 生成报告与结果
GL->>GL : 归档制品(7天)
GL->>WX : 发送通知(可选)
Dev->>GL : 合并到main
GL->>PW : 运行回归测试(Chromium+Firefox)
PW-->>ART : 生成报告与结果
GL->>GL : 归档制品(30天)
```

图表来源
- [.gitlab-ci.yml:11-67](file://e2e-tests/.gitlab-ci.yml#L11-L67)
- [playwright.config.ts:16-22](file://e2e-tests/playwright.config.ts#L16-L22)

章节来源
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)

### Jenkins流水线设计
- Agent与环境
  - Docker Agent：mcr.microsoft.com/playwright:v1.50.0-jammy
  - 环境变量：BASE_URL
- 阶段
  - Install：安装依赖（pnpm）
  - Smoke Test：执行smoke-chromium
  - Regression Test：仅main分支执行regression-chromium与regression-firefox
- 结果处理
  - post.always：发布HTML报告、归档test-results与results
  - post.failure：失败时输出日志（可扩展钉钉/企业微信通知）

```mermaid
sequenceDiagram
participant J as "Jenkins"
participant AG as "Docker Agent"
participant SH as "Shell"
participant PW as "Playwright"
participant HTML as "HTML报告"
participant AR as "制品归档"
J->>AG : 拉取Playwright镜像
J->>SH : 执行Install阶段(pnpm install)
J->>SH : 执行Smoke Test(npx playwright test --project=smoke-chromium)
SH->>PW : 运行冒烟测试
PW-->>HTML : 生成报告
J->>AR : 归档报告与结果
J->>SH : 条件执行Regression Test(仅main)
SH->>PW : 运行回归测试
PW-->>HTML : 生成报告
J->>AR : 归档报告与结果
```

图表来源
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)
- [playwright.config.ts:16-22](file://e2e-tests/playwright.config.ts#L16-L22)

章节来源
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)

### Playwright测试调度与并行执行
- 项目与依赖
  - setup/cleanup：准备与清理登录态
  - smoke-chromium：冒烟测试专用
  - regression-chromium/firefox：跨浏览器回归
- 并发与重试
  - CI环境：fullyParallel开启，workers=4，retries=2
  - 本地：关闭并行与重试，便于调试
- 报告器
  - CI：HTML、JUnit、Allure；本地：HTML
- 基础URL
  - 从BASE_URL读取，支持不同环境

```mermaid
flowchart TD
Start(["开始"]) --> LoadCfg["加载Playwright配置"]
LoadCfg --> DecideEnv{"是否CI环境?"}
DecideEnv --> |是| Parallel["启用fullyParallel<br/>workers=4<br/>retries=2"]
DecideEnv --> |否| Local["关闭并行<br/>retries=0"]
Parallel --> Projects["选择项目: setup/cleanup/smoke/regression"]
Local --> Projects
Projects --> RunTests["执行测试"]
RunTests --> Reporter{"报告器类型"}
Reporter --> |CI| CIReport["HTML/JUnit/Allure"]
Reporter --> |本地| LocalReport["HTML"]
CIReport --> End(["结束"])
LocalReport --> End
```

图表来源
- [playwright.config.ts:12-22](file://e2e-tests/playwright.config.ts#L12-L22)
- [playwright.config.ts:31-66](file://e2e-tests/playwright.config.ts#L31-L66)

章节来源
- [playwright.config.ts:12-22](file://e2e-tests/playwright.config.ts#L12-L22)
- [playwright.config.ts:31-66](file://e2e-tests/playwright.config.ts#L31-L66)

### 测试数据准备与清理
- 登录态准备
  - auth.setup.ts：按角色登录并存储storageState到fixtures/.auth
  - auth.teardown.ts：清理storageState文件
  - auth.fixture.ts：为doctor/auditor/admin注入已登录上下文
- 数据夹具
  - data.fixture.ts：自动创建不同状态的报告并在用例后清理
- API辅助
  - api-helper.ts：统一API上下文（含管理员鉴权）、创建/更新/删除/查询/清理

```mermaid
sequenceDiagram
participant S as "setup"
participant U as "用户"
participant FS as "fixtures/.auth"
participant F as "auth.fixture"
participant D as "data.fixture"
participant API as "api-helper"
S->>U : 登录
U-->>FS : 存储storageState
F->>FS : 读取对应角色storageState
D->>API : 创建测试报告
D->>API : 清理测试报告
S->>FS : 清理storageState
```

图表来源
- [auth.setup.ts:1-30](file://e2e-tests/fixtures/auth.setup.ts#L1-L30)
- [auth.teardown.ts:1-18](file://e2e-tests/fixtures/auth.teardown.ts#L1-L18)
- [auth.fixture.ts:1-40](file://e2e-tests/fixtures/auth.fixture.ts#L1-L40)
- [data.fixture.ts:1-57](file://e2e-tests/fixtures/data.fixture.ts#L1-L57)
- [api-helper.ts:1-172](file://e2e-tests/utils/api-helper.ts#L1-L172)

章节来源
- [auth.setup.ts:1-30](file://e2e-tests/fixtures/auth.setup.ts#L1-L30)
- [auth.teardown.ts:1-18](file://e2e-tests/fixtures/auth.teardown.ts#L1-L18)
- [auth.fixture.ts:1-40](file://e2e-tests/fixtures/auth.fixture.ts#L1-L40)
- [data.fixture.ts:1-57](file://e2e-tests/fixtures/data.fixture.ts#L1-L57)
- [api-helper.ts:1-172](file://e2e-tests/utils/api-helper.ts#L1-L172)

### AI驱动的测试用例与脚本生成
- test-generator.ts：输入功能描述，输出结构化测试用例JSON
- script-generator.ts：输入测试用例+PO接口+Fixture，输出可执行的.spec.ts脚本
- 依赖LLM：需配置LLM_API_URL、LLM_API_KEY、LLM_MODEL

```mermaid
flowchart TD
A["输入: 功能描述/角色"] --> B["调用LLM生成测试用例(JSON)"]
B --> C["输入: 用例+PO接口+Fixture"]
C --> D["调用LLM生成.spec.ts脚本"]
D --> E["输出: 可执行测试脚本"]
```

图表来源
- [test-generator.ts:67-106](file://e2e-tests/ai/test-generator.ts#L67-L106)
- [script-generator.ts:63-109](file://e2e-tests/ai/script-generator.ts#L63-L109)

章节来源
- [test-generator.ts:1-107](file://e2e-tests/ai/test-generator.ts#L1-L107)
- [script-generator.ts:1-110](file://e2e-tests/ai/script-generator.ts#L1-L110)

## 依赖关系分析
- Playwright配置对测试与报告的影响
  - 项目定义决定测试集划分与执行顺序
  - 报告器影响制品与可视化
  - 并发与重试影响资源占用与稳定性
- CI配置对执行的影响
  - GitLab：阶段化与制品保留策略
  - Jenkins：Docker Agent与阶段化执行
- 工具链依赖
  - Playwright镜像版本固定，确保一致性
  - pnpm锁定依赖，保证可重复性

```mermaid
graph LR
CFG["playwright.config.ts"] --> PRJ["项目定义"]
CFG --> REP["报告器"]
CFG --> CON["并发/重试"]
PRJ --> TEST["tests/*"]
REP --> ART["artifacts/*"]
CON --> RES["资源消耗"]
GL["GitLab CI"] --> ART
JEN["Jenkins"] --> ART
```

图表来源
- [playwright.config.ts:16-22](file://e2e-tests/playwright.config.ts#L16-L22)
- [.gitlab-ci.yml:19-46](file://e2e-tests/.gitlab-ci.yml#L19-L46)
- [Jenkinsfile:41-50](file://e2e-tests/Jenkinsfile#L41-L50)

章节来源
- [playwright.config.ts:16-22](file://e2e-tests/playwright.config.ts#L16-L22)
- [.gitlab-ci.yml:19-46](file://e2e-tests/.gitlab-ci.yml#L19-L46)
- [Jenkinsfile:41-50](file://e2e-tests/Jenkinsfile#L41-L50)

## 性能考量
- 并行与重试
  - CI环境启用并行与重试可提升稳定性，但会增加资源消耗
  - 建议根据Runner资源调整workers数量与retries
- 报告器选择
  - HTML适合快速定位问题；JUnit/Allure适合持续集成报告聚合
- 制品归档
  - 控制保留期，避免磁盘压力
- 网络与外部服务
  - LLM调用需考虑超时与重试；API调用需考虑鉴权与幂等
- 缓存与依赖
  - pnpm锁定文件与Playwright镜像缓存可显著缩短构建时间

## 故障排除指南
- 环境变量缺失
  - BASE_URL未设置导致页面访问失败
  - LLM相关变量未配置导致AI功能不可用
- 登录态问题
  - storageState过期或缺失导致用例失败
  - 确保setup与cleanup流程正确执行
- 报告与制品
  - Jenkins：确认HTML报告发布与制品归档步骤执行
  - GitLab：检查制品保留期与通知Webhook配置
- 并发冲突
  - 多浏览器并行时注意共享资源竞争（数据库、文件系统）
- API调用失败
  - 检查API_BASE_URL、鉴权头与网络连通性
  - 对幂等性不足的操作增加重试或去重逻辑

章节来源
- [playwright.config.ts:24-29](file://e2e-tests/playwright.config.ts#L24-L29)
- [api-helper.ts:45-77](file://e2e-tests/utils/api-helper.ts#L45-L77)
- [auth.setup.ts:18-28](file://e2e-tests/fixtures/auth.setup.ts#L18-L28)
- [auth.teardown.ts:7-17](file://e2e-tests/fixtures/auth.teardown.ts#L7-L17)
- [.gitlab-ci.yml:51-66](file://e2e-tests/.gitlab-ci.yml#L51-L66)
- [Jenkinsfile:41-56](file://e2e-tests/Jenkinsfile#L41-L56)

## 结论
本项目通过GitLab CI与Jenkins实现了端到端测试的自动化流水线，结合Playwright的项目化与报告器体系，提供了稳定可重复的测试执行与结果可视化。配合登录态与数据夹具、API辅助工具以及AI驱动的测试生成能力，能够高效支撑日常冒烟与回归测试，并为后续扩展（如更多浏览器、更多环境、更多报告器）提供良好基础。

## 附录

### 环境变量与密钥管理
- 必要变量
  - BASE_URL：前端或后端服务地址
  - API_BASE_URL：后端API地址（用于api-helper）
  - WECHAT_WEBHOOK_URL：企业微信通知Webhook（GitLab）
  - LLM_API_URL/LLM_API_KEY/LLM_MODEL：AI生成测试用例与脚本所需
- 安全建议
  - 将敏感变量配置在CI系统的受保护变量中
  - 限制Webhook URL的访问范围与权限
  - 定期轮换密钥与令牌

章节来源
- [playwright.config.ts:24-25](file://e2e-tests/playwright.config.ts#L24-L25)
- [api-helper.ts](file://e2e-tests/utils/api-helper.ts#L6)
- [.gitlab-ci.yml:55-63](file://e2e-tests/.gitlab-ci.yml#L55-L63)
- [test-generator.ts:5-7](file://e2e-tests/ai/test-generator.ts#L5-L7)
- [script-generator.ts:6-8](file://e2e-tests/ai/script-generator.ts#L6-L8)

### 部署策略与最佳实践
- GitLab
  - 将deploy-test阶段用于部署测试环境（占位，当前未实现）
  - 使用制品归档与通知机制闭环反馈
- Jenkins
  - 使用Docker Agent隔离环境
  - 在post阶段统一发布报告与归档制品
- 最佳实践
  - 明确冒烟与回归的触发策略
  - 控制并发度与重试次数，平衡速度与稳定性
  - 使用路径别名与模块化组织代码，提升可维护性

章节来源
- [.gitlab-ci.yml:1-67](file://e2e-tests/.gitlab-ci.yml#L1-L67)
- [Jenkinsfile:1-59](file://e2e-tests/Jenkinsfile#L1-L59)
- [tsconfig.json:14-20](file://e2e-tests/tsconfig.json#L14-L20)