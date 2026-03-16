// AI 测试生成系统 - Test Executor Agent
// 职责：执行 Playwright 测试并收集结果

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 测试执行状态
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timed_out' | 'interrupted';

/**
 * 单个测试的执行结果
 */
export interface TestResult {
  /** 测试名称 */
  name: string;
  /** 执行状态 */
  status: TestStatus;
  /** 执行时长（毫秒） */
  duration: number;
  /** 错误信息 */
  error?: {
    message: string;
    stack: string;
    snippet: string;
  };
  /** 失败的步骤 */
  failedStep?: string;
  /** 截图路径 */
  screenshot?: string;
  /** 视频路径 */
  video?: string;
  /** Trace 路径 */
  trace?: string;
  /** 控制台日志 */
  consoleLogs?: string[];
  /** 网络请求日志 */
  networkLogs?: NetworkRequest[];
}

/**
 * 网络请求信息
 */
export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  timestamp: number;
}

/**
 * 测试套件执行结果
 */
export interface TestSuiteResult {
  /** 执行状态 */
  status: 'passed' | 'failed';
  /** 测试总数 */
  total: number;
  /** 通过数量 */
  passed: number;
  /** 失败数量 */
  failed: number;
  /** 跳过数量 */
  skipped: number;
  /** 执行时长（毫秒） */
  duration: number;
  /** 测试结果列表 */
  results: TestResult[];
  /** Playwright 输出日志 */
  output: string;
  /** HTML 报告路径 */
  htmlReportPath?: string;
}

/**
 * Test Executor Agent 配置
 */
export interface TestExecutorConfig {
  /** 项目根目录 */
  projectRoot: string;
  /** Playwright 配置路径 */
  configPath?: string;
  /** 输出目录 */
  outputDir?: string;
  /** 是否录制视频 */
  recordVideo?: boolean;
  /** 是否录制 Trace */
  trace?: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 是否 headed 模式 */
  headed?: boolean;
  /** 慢动作延迟 */
  slowMo?: number;
}

/**
 * Test Executor Agent
 *
 * 职责：
 * 1. 执行 Playwright 测试
 * 2. 收集测试结果和日志
 * 3. 生成执行报告
 *
 * @param testFile - 测试文件路径
 * @param config - 执行配置
 */
export async function testExecutorAgent(
  testFile: string,
  config: TestExecutorConfig
): Promise<TestSuiteResult> {
  const startTime = Date.now();

  // 构建 Playwright 命令
  const command = buildPlaywrightCommand(testFile, config);

  console.log(`[Executor] 执行命令：${command}`);

  try {
    // 执行命令
    const { stdout, stderr } = await execAsync(command, {
      cwd: config.projectRoot,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // 解析输出
    const results = parsePlaywrightOutput(stdout, stderr);

    const duration = Date.now() - startTime;

    return {
      status: results.failed > 0 ? 'failed' : 'passed',
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      duration,
      results: results.testResults,
      output: stdout,
      htmlReportPath: path.join(config.projectRoot, 'playwright-report', 'index.html'),
    };
  } catch (error) {
    // 执行失败时也要解析输出
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    const results = parsePlaywrightOutput(
      execError.stdout || '',
      execError.stderr || ''
    );

    const duration = Date.now() - startTime;

    return {
      status: 'failed',
      total: results.total,
      passed: results.passed,
      failed: results.failed + (results.total === 0 ? 1 : 0),
      skipped: results.skipped,
      duration,
      results: results.testResults,
      output: execError.stderr || execError.stdout || '',
      htmlReportPath: path.join(config.projectRoot, 'playwright-report', 'index.html'),
    };
  }
}

/**
 * 构建 Playwright 命令
 */
function buildPlaywrightCommand(testFile: string, config: TestExecutorConfig): string {
  const args: string[] = ['npx playwright test'];

  // 测试文件
  args.push(testFile);

  // 配置文件
  if (config.configPath) {
    args.push(`--config=${config.configPath}`);
  }

  // 项目选择
  args.push('--project=smoke-chromium');

  // 超时
  if (config.timeout) {
    args.push(`--timeout=${config.timeout}`);
  }

  // 重试次数
  if (config.retries !== undefined) {
    args.push(`--retries=${config.retries}`);
  }

  // headed 模式
  if (config.headed) {
    args.push('--headed');
  }

  // 慢动作
  if (config.slowMo) {
    args.push(`--slow-mo=${config.slowMo}`);
  }

  // 录制选项
  if (config.recordVideo) {
    args.push('--video=retain-on-failure');
  }

  if (config.trace) {
    args.push(`--trace=${config.trace}`);
  }

  // 报告生成
  args.push('--reporter=html,line');

  return args.join(' ');
}

/**
 * 解析 Playwright 输出
 */
function parsePlaywrightOutput(
  stdout: string,
  stderr: string
): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  testResults: TestResult[];
} {
  const output = stdout + stderr;
  const testResults: TestResult[] = [];

  // 解析测试状态
  const testPattern = /[✓✔] ([^(]+) \(([^)]+)\)/g;
  const failPattern = /[✕×] ([^(]+) \(([^)]+)\)/g;
  const skipPattern = /[-] ([^(]+) \(([^)]+)\)/g;

  let match: RegExpExecArray | null;

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // 解析通过测试
  while ((match = testPattern.exec(output)) !== null) {
    passed++;
    testResults.push({
      name: match[1].trim(),
      status: 'passed',
      duration: parseDuration(match[2]),
    });
  }

  // 解析失败测试
  failPattern.lastIndex = 0;
  while ((match = failPattern.exec(output)) !== null) {
    failed++;
    const testName = match[1].trim();

    // 提取错误信息
    const errorInfo = extractErrorInfo(output, testName);

    testResults.push({
      name: testName,
      status: 'failed',
      duration: parseDuration(match[2]),
      error: errorInfo.error,
      failedStep: errorInfo.failedStep,
      screenshot: errorInfo.screenshot,
      trace: errorInfo.trace,
    });
  }

  // 解析跳过测试
  skipPattern.lastIndex = 0;
  while ((match = skipPattern.exec(output)) !== null) {
    skipped++;
    testResults.push({
      name: match[1].trim(),
      status: 'skipped',
      duration: parseDuration(match[2]),
    });
  }

  // 如果未解析出结果，尝试使用 Summary 行
  if (testResults.length === 0) {
    const summaryMatch = output.match(/(\d+) passed, (\d+) failed, (\d+) skipped/);
    if (summaryMatch) {
      passed = parseInt(summaryMatch[1], 10);
      failed = parseInt(summaryMatch[2], 10);
      skipped = parseInt(summaryMatch[3], 10);
    }
  }

  return {
    total: passed + failed + skipped,
    passed,
    failed,
    skipped,
    testResults,
  };
}

/**
 * 从输出中提取错误信息
 */
function extractErrorInfo(
  output: string,
  testName: string
): {
  error?: { message: string; stack: string; snippet: string };
  failedStep?: string;
  screenshot?: string;
  trace?: string;
} {
  const result: ReturnType<typeof extractErrorInfo> = {};

  // 提取错误消息
  const errorMatch = output.match(
    new RegExp(`${escapeRegex(testName)}[\\s\\S]*?(?=Error:|TimeoutError:|Error Context:)`)
  );

  if (errorMatch) {
    const errorSection = errorMatch[0];

    // 提取错误类型和消息
    const errorMsgMatch = errorSection.match(/(Error|TimeoutError):\s*([^\n]+)/);
    if (errorMsgMatch) {
      result.error = {
        message: errorMsgMatch[2].trim(),
        stack: errorMsgMatch[0],
        snippet: errorSection.substring(0, 500),
      };

      // 尝试提取失败步骤
      const stepMatch = errorSection.match(/at.*?\.step\(['"]([^'"]+)['"]/);
      if (stepMatch) {
        result.failedStep = stepMatch[1];
      }
    }
  }

  // 提取截图路径
  const screenshotMatch = output.match(/screenshot.*?([\w-]+\.png)/i);
  if (screenshotMatch) {
    result.screenshot = screenshotMatch[1];
  }

  // 提取 Trace 路径
  const traceMatch = output.match(/trace.*?(trace\.zip)/i);
  if (traceMatch) {
    result.trace = traceMatch[1];
  }

  return result;
}

/**
 * 解析时长字符串
 */
function parseDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+(?:\.\d+)?)(ms|s)/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  return match[2] === 's' ? value * 1000 : value;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 读取测试结果的截图
 */
export function readTestScreenshot(resultDir: string): Buffer | null {
  const screenshotPattern = /test-failed-\d+\.png/;
  const files = fs.readdirSync(resultDir);
  const screenshotFile = files.find((f) => screenshotPattern.test(f));

  if (screenshotFile) {
    return fs.readFileSync(path.join(resultDir, screenshotFile));
  }

  return null;
}

/**
 * 读取 Trace 文件
 */
export function readTraceFile(resultDir: string): string | null {
  const tracePath = path.join(resultDir, 'trace.zip');
  if (fs.existsSync(tracePath)) {
    return tracePath;
  }
  return null;
}
