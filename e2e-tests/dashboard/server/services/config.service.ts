// 配置管理服务 — .env 和 JSON 数据文件读写

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const SENSITIVE_KEYS = ['LLM_API_KEY', 'DB_PASSWORD'];

export class ConfigService {
  constructor(private projectRoot: string) {}

  /** 读取 .env 为键值对，敏感值脱敏 */
  readEnv(): Record<string, string> {
    const envPath = path.join(this.projectRoot, '.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf-8');
    const parsed = dotenv.parse(content);
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = SENSITIVE_KEYS.includes(key)
        ? value.substring(0, 6) + '***'
        : value;
    }
    return result;
  }

  /** 读取 .env 原始值（不脱敏，内部用） */
  private readEnvRaw(): Record<string, string> {
    const envPath = path.join(this.projectRoot, '.env');
    if (!fs.existsSync(envPath)) return {};
    return dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
  }

  /** 更新 .env 变量 */
  updateEnv(updates: Record<string, string>): void {
    const envPath = path.join(this.projectRoot, '.env');
    const current = this.readEnvRaw();

    // 合并更新（跳过以 *** 结尾的值 — 表示用户未修改脱敏字段）
    for (const [key, value] of Object.entries(updates)) {
      if (value.endsWith('***')) continue;
      current[key] = value;
    }

    // 读取原始文件保留注释
    const originalContent = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, 'utf-8')
      : '';
    const lines = originalContent.split('\n');
    const updatedKeys = new Set<string>();
    const result: string[] = [];

    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match && match[1] in current) {
        result.push(`${match[1]}=${current[match[1]]}`);
        updatedKeys.add(match[1]);
      } else {
        result.push(line);
      }
    }

    // 追加新的键
    for (const [key, value] of Object.entries(current)) {
      if (!updatedKeys.has(key)) {
        result.push(`${key}=${value}`);
      }
    }

    fs.writeFileSync(envPath, result.join('\n'), 'utf-8');

    // 重新加载到 process.env
    dotenv.config({ path: envPath, override: true });
  }

  /** 读取 data/*.json */
  readDataFile(fileName: string): unknown {
    const allowed = ['users.json', 'reports.json', 'exam-items.json'];
    if (!allowed.includes(fileName)) {
      throw new Error(`不允许读取: ${fileName}`);
    }
    const filePath = path.join(this.projectRoot, 'data', fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: data/${fileName}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  /** 更新 data/*.json */
  updateDataFile(fileName: string, data: unknown): void {
    const allowed = ['users.json', 'reports.json', 'exam-items.json'];
    if (!allowed.includes(fileName)) {
      throw new Error(`不允许写入: ${fileName}`);
    }
    const filePath = path.join(this.projectRoot, 'data', fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  /** 读取 playwright.config.ts（只读返回源码） */
  readPlaywrightConfig(): string {
    const configPath = path.join(this.projectRoot, 'playwright.config.ts');
    if (!fs.existsSync(configPath)) return '';
    return fs.readFileSync(configPath, 'utf-8');
  }
}
