// API 请求/响应类型定义

export interface TestFileMeta {
  filePath: string;
  fileName: string;
  category: 'smoke' | 'regression';
  testCount: number;
  testNames: string[];
  size: number;
  modifiedAt: string;
  hasBackup: boolean;
}

export interface RunStatus {
  isRunning: boolean;
  runId: string | null;
  startedAt: string | null;
}

export interface AiContextSummary {
  pageObjects: Array<{
    className: string;
    filePath: string;
    locatorCount: number;
    methodCount: number;
    methods: string[];
  }>;
  authFixtures: Array<{ name: string; type: string; description: string }>;
  dataFixtures: Array<{ name: string; type: string; description: string }>;
  testDataSchemas: Array<{ filePath: string; summary: string }>;
  utilFunctions: Array<{ name: string; signature: string }>;
}
