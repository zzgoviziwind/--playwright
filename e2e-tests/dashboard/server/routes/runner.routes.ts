// 测试执行 API 路由

import { Router } from 'express';
import { RunnerService } from '../services/runner.service';

export function runnerRoutes(projectRoot: string): Router {
  const router = Router();
  const service = new RunnerService(projectRoot);

  // POST /api/runner/start
  router.post('/start', (req, res) => {
    try {
      const { projects, files, retries, workers, headed } = req.body;
      if (!projects || !Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json({ error: '请选择至少一个测试项目' });
      }
      const runId = service.start({ projects, files, retries, workers, headed });
      res.json({ runId });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/runner/stop
  router.post('/stop', (_req, res) => {
    try {
      service.stop();
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /api/runner/status
  router.get('/status', (_req, res) => {
    res.json(service.getStatus());
  });

  return router;
}
