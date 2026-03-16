// AI 测试生成系统 - 共享类型定义

/** Page Object 类的结构化描述 */
export interface PageObjectInfo {
  className: string;
  filePath: string;
  locators: Array<{
    name: string;
    selector: string;
  }>;
  methods: Array<{
    name: string;
    params: string;
    returnType: string;
    description: string;
  }>;
}

/** Fixture 描述 */
export interface FixtureInfo {
  name: string;
  type: string;
  description: string;
  sourceFile: string;
}

/** 数据 Fixture 描述 */
export interface DataFixtureInfo extends FixtureInfo {
  setupDescription: string;
  autoCleanup: boolean;
}

/** 现有测试模式 */
export interface TestPatternInfo {
  filePath: string;
  imports: string[];
  fixturesUsed: string[];
  pageObjectsUsed: string[];
  fullContent: string;
}

/** 聚合的完整项目上下文 */
export interface ProjectContext {
  pageObjects: PageObjectInfo[];
  authFixtures: FixtureInfo[];
  dataFixtures: DataFixtureInfo[];
  testPatterns: TestPatternInfo[];
  testDataSchemas: Array<{ filePath: string; summary: string }>;
  utilFunctions: Array<{
    name: string;
    signature: string;
    description: string;
  }>;
}

/** generate 命令参数 */
export interface GenerateOptions {
  feature: string;
  type: 'smoke' | 'regression';
  output?: string;
  dryRun?: boolean;
}

/** modify 命令参数 */
export interface ModifyOptions {
  file: string;
  change: string;
}

/** extend 命令参数 */
export interface ExtendOptions {
  file: string;
  add: string;
}

/** 后处理结果 */
export interface ProcessResult {
  code: string;
  warnings: string[];
  isValid: boolean;
}

// ==================== URL 分析相关类型 ====================

/** 表单字段信息 */
export interface FormFieldInfo {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder: string;
  selector: string;
}

/** 表单信息 */
export interface FormInfo {
  selector: string;
  fields: FormFieldInfo[];
  submitButton: { text: string; selector: string } | null;
}

/** 导航链接信息 */
export interface NavInfo {
  text: string;
  href: string;
  selector: string;
}

/** 表格信息 */
export interface TableInfo {
  selector: string;
  headers: string[];
  rowCount: number;
}

/** 按钮信息 */
export interface ButtonInfo {
  text: string;
  selector: string;
  type: string;
}

/** 输入框信息 */
export interface InputInfo {
  label: string;
  selector: string;
  type: string;
  placeholder: string;
}

/** 页面分析结果 */
export interface PageAnalysis {
  url: string;
  title: string;
  screenshot: string;
  meta: {
    description: string;
    loadTime: number;
  };
  forms: FormInfo[];
  navigation: NavInfo[];
  tables: TableInfo[];
  buttons: ButtonInfo[];
  inputs: InputInfo[];
  /** 录制视频路径（如果有） */
  videoPath?: string;
}

/** URL 分析选项 */
export interface AnalyzeOptions {
  auth?: {
    cookies?: Array<{ name: string; value: string; domain: string }>;
    localStorage?: Record<string, string>;
  };
  waitTime?: number;
  onProgress?: (message: string) => void;
  /** 是否使用 headed 模式（默认 false） */
  headed?: boolean;
  /** 是否录制视频（默认 false） */
  recordVideo?: boolean;
  /** 视频保存目录 */
  videoDir?: string;
  /** 慢动作延迟毫秒数 */
  slowMo?: number;
}

/** URL 测试生成参数 */
export interface UrlGenerateOptions {
  url: string;
  description?: string;
  type: 'smoke' | 'regression';
  output?: string;
  dryRun?: boolean;
  auth?: {
    cookies?: Array<{ name: string; value: string; domain: string }>;
    localStorage?: Record<string, string>;
  };
  waitTime?: number;
}
