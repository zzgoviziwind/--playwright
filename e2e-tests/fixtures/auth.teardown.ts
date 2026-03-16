import { test as teardown } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// 使用与 setup 和 fixture 相同的路径
const authDir = path.join(process.cwd(), 'fixtures', '.auth');

teardown('cleanup auth states', async () => {
  console.log(`Cleaning up auth state from: ${authDir}`);
  // 临时禁用清理，以便调试
  /*
  // 清理 .auth 目录下的所有 storageState 文件
  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir);
    console.log(`Files in auth dir: ${files}`);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(authDir, file));
        console.log(`Deleted: ${file}`);
      }
    }
  }
  */
  console.log('Cleanup disabled for debugging');
});
