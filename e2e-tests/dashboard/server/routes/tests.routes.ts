// 测试文件管理 API 路由

import { Router } from 'express';
import { TestFileService } from '../services/test-file.service';

export function testsRoutes(projectRoot: string): Router {
  const router = Router();
  const service = new TestFileService(projectRoot);

  // GET /api/tests/files
  router.get('/files', (_req, res) => {
    try {
      const files = service.listFiles();
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/tests/files/:path(*)
  router.get('/files/*', (req, res) => {
    try {
      const relPath = req.params[0];
      const content = service.readFile(relPath);
      res.json({ content });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // PUT /api/tests/files/:path(*)
  router.put('/files/*', (req, res) => {
    try {
      const relPath = req.params[0];
      service.updateFile(relPath, req.body.content);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // DELETE /api/tests/files/:path(*)
  router.delete('/files/*', (req, res) => {
    try {
      const relPath = req.params[0];
      service.deleteFile(relPath);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
