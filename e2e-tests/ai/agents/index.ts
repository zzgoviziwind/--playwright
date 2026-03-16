// AI 测试生成系统 - Agent 导出

export {
  // Test Planner Agent
  testPlannerAgent,
  testPlannerFromURL,
  type TestPlannerInput,
  type TestPlan,
  type TestScenario,
  type TestCaseStep,
} from './test-planner.agent';

export {
  // Test Generator Agent
  testGeneratorAgent,
  generateTestForScenario,
  modifyTestCode,
  extendTestCode,
  type TestGeneratorInput,
  type GenerationResult,
} from './test-generator.agent';

export {
  // Test Executor Agent
  testExecutorAgent,
  readTestScreenshot,
  readTraceFile,
  type TestExecutorConfig,
  type TestSuiteResult,
  type TestResult,
  type TestStatus,
} from './test-executor.agent';

export {
  // Failure Analysis Agent
  failureAnalysisAgent,
  analyzeFailures,
  generateFailureReport,
  type FailureAnalysisInput,
  type FailureAnalysis,
  type FailureCategory,
} from './failure-analysis.agent';

export {
  // Self-Healing Agent
  selfHealingAgent,
  healMultipleTests,
  validateHealedCode,
  type SelfHealingInput,
  type HealingResult,
} from './self-healing.agent';

export {
  // Auto Test Pipeline
  autoTestPipeline,
  printTestSummary,
  type AutoTestPipelineConfig,
  type PipelineResult,
  type PipelineStep,
} from './auto-test-pipeline';
