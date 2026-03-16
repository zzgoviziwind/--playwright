// 测试录制器 API 路由

import { Router } from 'express';
import { testRecorder } from '../services/recorder.service';

export function recorderRoutes(): Router {
  const router = Router();

  // POST /api/recorder/start
  router.post('/start', async (req, res) => {
    try {
      const config = req.body;
      if (!config.baseUrl) {
        return res.status(400).json({ error: '缺少 baseUrl 参数' });
      }

      await testRecorder.start({
        baseUrl: config.baseUrl,
        browser: config.browser || 'chrome',
        headless: config.headless ?? false,
        timeout: config.timeout ?? 300,
      });

      res.json({ success: true, message: '录制已启动' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/stop
  router.post('/stop', async (req, res) => {
    try {
      const actions = await testRecorder.stop();
      res.json({ success: true, actions });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/pause
  router.post('/pause', (req, res) => {
    try {
      testRecorder.pause();
      res.json({ success: true, message: '录制已暂停' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/resume
  router.post('/resume', (req, res) => {
    try {
      testRecorder.resume();
      res.json({ success: true, message: '录制已继续' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/recorder/actions
  router.get('/actions', (req, res) => {
    try {
      const actions = testRecorder.getActions();
      res.json({ actions });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/generate
  router.post('/generate', (req, res) => {
    try {
      const { actions } = req.body;
      const code = testRecorder.generateCode(actions);
      res.json({ code });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/save
  router.post('/save', async (req, res) => {
    try {
      const { code, filename } = req.body;
      if (!code) {
        return res.status(400).json({ error: '缺少 code 参数' });
      }

      const fs = await import('fs');
      const path = await import('path');

      const PROJECT_ROOT = path.join(process.cwd(), '..');
      const targetDir = path.join(PROJECT_ROOT, 'tests', 'recorded');
      const fileName = filename || `recorded-${Date.now()}.spec.ts`;
      const outputPath = path.join(targetDir, fileName);

      // 确保目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, code, 'utf-8');

      res.json({ success: true, filePath: outputPath, filename: fileName });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/recorder/files
  router.get('/files', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const PROJECT_ROOT = path.join(process.cwd(), '..');
      const targetDir = path.join(PROJECT_ROOT, 'tests', 'recorded');

      // 确保目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        return res.json({ files: [] });
      }

      const files = fs.readdirSync(targetDir)
        .filter(file => file.endsWith('.spec.ts'))
        .map(file => {
          const filePath = path.join(targetDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

      res.json({ files });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/recorder/files/:filename
  router.get('/files/:filename', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const PROJECT_ROOT = path.join(process.cwd(), '..');
      const targetDir = path.join(PROJECT_ROOT, 'tests', 'recorded');
      const filePath = path.join(targetDir, req.params.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);

      res.json({
        name: req.params.filename,
        content,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // DELETE /api/recorder/files/:filename
  router.delete('/files/:filename', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const PROJECT_ROOT = path.join(process.cwd(), '..');
      const targetDir = path.join(PROJECT_ROOT, 'tests', 'recorded');
      const filePath = path.join(targetDir, req.params.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
      }

      fs.unlinkSync(filePath);
      res.json({ success: true, message: '文件已删除' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/files/:filename/move
  router.post('/files/:filename/move', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const PROJECT_ROOT = path.join(process.cwd(), '..');
      const sourceDir = path.join(PROJECT_ROOT, 'tests', 'recorded');
      const { targetProject } = req.body; // 'smoke', 'regression', 'ai-example'

      if (!targetProject || !['smoke', 'regression', 'ai-example'].includes(targetProject)) {
        return res.status(400).json({ error: '无效的目标项目' });
      }

      const sourcePath = path.join(sourceDir, req.params.filename);
      const targetDirPath = path.join(PROJECT_ROOT, 'tests', targetProject);
      const targetPath = path.join(targetDirPath, req.params.filename);

      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ error: '源文件不存在' });
      }

      // 确保目标目录存在
      if (!fs.existsSync(targetDirPath)) {
        fs.mkdirSync(targetDirPath, { recursive: true });
      }

      // 如果目标文件已存在，添加时间戳
      let finalTargetPath = targetPath;
      if (fs.existsSync(targetPath)) {
        const timestamp = Date.now();
        const extIndex = targetPath.lastIndexOf('.');
        finalTargetPath = `${targetPath.slice(0, extIndex)}-${timestamp}${targetPath.slice(extIndex)}`;
      }

      fs.copyFileSync(sourcePath, finalTargetPath);
      res.json({
        success: true,
        message: '文件已移动到目标项目',
        targetPath: finalTargetPath
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/recorder/files/:filename/run
  router.post('/files/:filename/run', async (req, res) => {
    try {
      const { RunnerService } = await import('../services/runner.service');
      const path = await import('path');

      const PROJECT_ROOT = path.join(process.cwd(), '..');
      const runnerService = new RunnerService(PROJECT_ROOT);

      const testFile = `tests/recorded/${req.params.filename}`;

      // 只运行指定文件，不传递 project 参数，避免运行其他测试
      const runId = runnerService.start({
        projects: [], // 不指定项目，直接运行文件
        files: [testFile],
        retries: 0,
        workers: 1,
        headed: false,
      });

      res.json({
        success: true,
        runId,
        message: '测试执行已启动'
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
