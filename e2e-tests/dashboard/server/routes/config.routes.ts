// 配置管理 API 路由

import { Router } from 'express';
import { ConfigService } from '../services/config.service';

export function configRoutes(projectRoot: string): Router {
  const router = Router();
  const service = new ConfigService(projectRoot);

  // GET /api/config/env
  router.get('/env', (_req, res) => {
    try {
      res.json(service.readEnv());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // PUT /api/config/env
  router.put('/env', (req, res) => {
    try {
      service.updateEnv(req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/config/data/:file
  router.get('/data/:file', (req, res) => {
    try {
      const data = service.readDataFile(req.params.file);
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // PUT /api/config/data/:file
  router.put('/data/:file', (req, res) => {
    try {
      service.updateDataFile(req.params.file, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /api/config/playwright
  router.get('/playwright', (_req, res) => {
    try {
      const content = service.readPlaywrightConfig();
      res.json({ content });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
