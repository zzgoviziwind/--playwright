// 测试执行服务 — child_process.spawn 执行 Playwright

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { socketManager } from '../ws/socket-manager';

export interface RunOptions {
  projects: string[];
  files?: string[];
  retries?: number;
  workers?: number;
  headed?: boolean;
}

export interface RunStatus {
  isRunning: boolean;
  runId: string | null;
  startedAt: string | null;
}

let currentProcess: ChildProcess | null = null;
let currentRunId: string | null = null;
let currentStartedAt: string | null = null;

export class RunnerService {
  constructor(private projectRoot: string) {}

  getStatus(): RunStatus {
    return {
      isRunning: currentProcess !== null,
      runId: currentRunId,
      startedAt: currentStartedAt,
    };
  }

  start(options: RunOptions): string {
    if (currentProcess) {
      throw new Error('已有测试正在运行，请先停止');
    }

    const runId = `run-${Date.now()}`;
    currentRunId = runId;
    currentStartedAt = new Date().toISOString();

    // 构建命令参数
    const args = ['playwright', 'test'];
    for (const project of options.projects) {
      args.push('--project', project);
    }
    if (options.files && options.files.length > 0) {
      args.push(...options.files);
    }
    if (options.retries !== undefined) {
      args.push('--retries', String(options.retries));
    }
    if (options.workers !== undefined) {
      args.push('--workers', String(options.workers));
    }
    if (options.headed) {
      args.push('--headed');
    }

    // Windows 兼容: 使用 npx，需要 shell: true
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npx' : 'npx';

    const child = spawn(cmd, args, {
      cwd: this.projectRoot,
      shell: isWin,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    currentProcess = child;

    const pushLog = (stream: 'stdout' | 'stderr', data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          socketManager.broadcast('runner', {
            type: 'runner:log',
            runId,
            stream,
            line,
          });
        }
      }
    };

    child.stdout?.on('data', (data) => pushLog('stdout', data));
    child.stderr?.on('data', (data) => pushLog('stderr', data));

    child.on('close', (exitCode) => {
      // 解析结果: 从最后的 stdout 日志中提取统计
      socketManager.broadcast('runner', {
        type: 'runner:done',
        runId,
        exitCode: exitCode ?? 1,
      });

      currentProcess = null;
      currentRunId = null;
      currentStartedAt = null;
    });

    child.on('error', (err) => {
      socketManager.broadcast('runner', {
        type: 'runner:log',
        runId,
        stream: 'stderr',
        line: `进程错误: ${err.message}`,
      });
      currentProcess = null;
      currentRunId = null;
      currentStartedAt = null;
    });

    return runId;
  }

  stop(): void {
    if (!currentProcess) {
      throw new Error('当前没有运行中的测试');
    }
    currentProcess.kill('SIGTERM');
    // Windows fallback
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(currentProcess.pid), '/f', '/t'], { shell: true });
    }
  }
}
