// AI 测试生成 API 路由

import { Router } from 'express';
import { AiService } from '../services/ai.service';

export function aiRoutes(projectRoot: string): Router {
  const router = Router();
  const service = new AiService(projectRoot);

  // GET /api/ai/context
  router.get('/context', async (_req, res) => {
    try {
      const context = await service.getContext();
      // 返回摘要而非完整内容
      res.json({
        pageObjects: context.pageObjects.map((po) => ({
          className: po.className,
          filePath: po.filePath,
          locatorCount: po.locators.length,
          methodCount: po.methods.length,
          methods: po.methods.map((m) => m.name),
        })),
        authFixtures: context.authFixtures,
        dataFixtures: context.dataFixtures,
        testDataSchemas: context.testDataSchemas,
        utilFunctions: context.utilFunctions.map((u) => ({
          name: u.name,
          signature: u.signature,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/ai/generate
  router.post('/generate', async (req, res) => {
    try {
      const { feature, type, output, temperature, maxTokens, interactive } = req.body;
      if (!feature || !type) {
        return res.status(400).json({ error: '缺少 feature 或 type 参数' });
      }

      if (interactive) {
        // 交互式模式：创建 session，返回 sessionId
        const sessionId = service.generateInteractive({
          feature, type, output, dryRun: false, temperature, maxTokens,
        });
        return res.json({ sessionId, interactive: true });
      }

      // 自动模式：原有逻辑
      const taskId = `ai-${Date.now()}`;
      res.json({ taskId });
      service.generate({ feature, type, output, dryRun: false, temperature, maxTokens }).catch(() => {});
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/ai/generate/preview (dry-run，保持原有逻辑)
  router.post('/generate/preview', async (req, res) => {
    try {
      const { feature, type, output, temperature, maxTokens } = req.body;
      if (!feature || !type) {
        return res.status(400).json({ error: '缺少 feature 或 type 参数' });
      }
      const code = await service.generate({
        feature, type, output, dryRun: true, temperature, maxTokens,
      });
      res.json({ code });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/ai/modify
  router.post('/modify', async (req, res) => {
    try {
      const { file, change, interactive } = req.body;
      if (!file || !change) {
        return res.status(400).json({ error: '缺少 file 或 change 参数' });
      }

      if (interactive) {
        const sessionId = service.modifyInteractive({ file, change });
        return res.json({ sessionId, interactive: true });
      }

      const taskId = `ai-${Date.now()}`;
      res.json({ taskId });
      service.modify({ file, change }).catch(() => {});
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/ai/extend
  router.post('/extend', async (req, res) => {
    try {
      const { file, add, interactive } = req.body;
      if (!file || !add) {
        return res.status(400).json({ error: '缺少 file 或 add 参数' });
      }

      if (interactive) {
        const sessionId = service.extendInteractive({ file, add });
        return res.json({ sessionId, interactive: true });
      }

      const taskId = `ai-${Date.now()}`;
      res.json({ taskId });
      service.extend({ file, add }).catch(() => {});
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==================== Session 路由 ====================

  // POST /api/ai/session/:id/confirm — HTTP 备选确认通道
  router.post('/session/:id/confirm', (req, res) => {
    try {
      const { action, editedData } = req.body;
      service.confirmStep(req.params.id, { action: action || 'continue', editedData });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/ai/session/:id/abort
  router.post('/session/:id/abort', (req, res) => {
    try {
      service.abortSession(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /api/ai/session/:id — 获取会话状态
  router.get('/session/:id', (req, res) => {
    const session = service.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    res.json(session);
  });

  // GET /api/ai/session/:id/logs — 获取完整调试日志
  router.get('/session/:id/logs', (req, res) => {
    const logs = service.getSessionLogs(req.params.id);
    res.json(logs);
  });

  return router;
}
