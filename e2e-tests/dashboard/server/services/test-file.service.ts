// 测试文件管理服务 — 扫描/CRUD/元数据提取

import fs from 'fs';
import path from 'path';

export interface TestFileMeta {
  filePath: string;       // 相对路径, e.g. "tests/smoke/login.spec.ts"
  fileName: string;
  category: 'smoke' | 'regression';
  testCount: number;
  testNames: string[];
  size: number;
  modifiedAt: string;
  hasBackup: boolean;
}

export class TestFileService {
  private testsDir: string;

  constructor(private projectRoot: string) {
    this.testsDir = path.join(projectRoot, 'tests');
  }

  /** 获取所有测试文件列表 + 元数据 */
  listFiles(): TestFileMeta[] {
    const results: TestFileMeta[] = [];
    const categories = ['smoke', 'regression'] as const;

    for (const category of categories) {
      const dir = path.join(this.testsDir, category);
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.spec.ts'));
      for (const fileName of files) {
        const absPath = path.join(dir, fileName);
        const relPath = `tests/${category}/${fileName}`;
        const stat = fs.statSync(absPath);
        const content = fs.readFileSync(absPath, 'utf-8');

        // 提取测试名称
        const testNames: string[] = [];
        const testRegex = /test(?:\.only)?\(\s*['"`]([^'"`]+)['"`]/g;
        let match: RegExpExecArray | null;
        while ((match = testRegex.exec(content)) !== null) {
          testNames.push(match[1]);
        }

        results.push({
          filePath: relPath,
          fileName,
          category,
          testCount: testNames.length,
          testNames,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          hasBackup: fs.existsSync(absPath + '.bak'),
        });
      }
    }

    return results;
  }

  /** 读取文件内容 */
  readFile(relPath: string): string {
    this.validatePath(relPath);
    const absPath = path.join(this.projectRoot, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`文件不存在: ${relPath}`);
    }
    return fs.readFileSync(absPath, 'utf-8');
  }

  /** 更新文件内容（自动备份） */
  updateFile(relPath: string, content: string): void {
    this.validatePath(relPath);
    const absPath = path.join(this.projectRoot, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`文件不存在: ${relPath}`);
    }

    // 备份
    const original = fs.readFileSync(absPath, 'utf-8');
    fs.writeFileSync(absPath + '.bak', original, 'utf-8');

    fs.writeFileSync(absPath, content, 'utf-8');
  }

  /** 删除文件 */
  deleteFile(relPath: string): void {
    this.validatePath(relPath);
    const absPath = path.join(this.projectRoot, relPath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
    // 也删除备份
    if (fs.existsSync(absPath + '.bak')) {
      fs.unlinkSync(absPath + '.bak');
    }
  }

  /** 路径安全校验 — 只允许 tests/ 下的 .spec.ts 文件 */
  private validatePath(relPath: string): void {
    const normalized = path.normalize(relPath).replace(/\\/g, '/');
    if (!normalized.startsWith('tests/') || !normalized.endsWith('.spec.ts')) {
      throw new Error(`路径不合法: ${relPath}`);
    }
    if (normalized.includes('..')) {
      throw new Error(`路径不合法: ${relPath}`);
    }
  }
}
