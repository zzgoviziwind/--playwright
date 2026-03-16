// URL 分析测试生成 API 路由

import { Router } from 'express';
import { UrlGeneratorService } from '../services/url-generator.service';

export function analyzerRoutes(projectRoot: string): Router {
  const router = Router();
  const service = new UrlGeneratorService(projectRoot);

  // POST /api/analyzer/analyze — 仅分析页面
  router.post('/analyze', async (req, res) => {
    try {
      const { url, auth, waitTime } = req.body;
      if (!url) {
        return res.status(400).json({ error: '缺少 url 参数' });
      }
      const { taskId, analysis } = await service.analyzeUrl({ url, auth, waitTime });
      res.json({
        taskId,
        analysis: {
          url: analysis.url,
          title: analysis.title,
          meta: analysis.meta,
          forms: analysis.forms,
          navigation: analysis.navigation,
          tables: analysis.tables,
          buttons: analysis.buttons,
          inputs: analysis.inputs,
          screenshot: analysis.screenshot,
        },
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/analyzer/generate — 分析 + 生成测试（异步，WS 推送）
  router.post('/generate', async (req, res) => {
    try {
      const { url, description, type, output, auth, waitTime } = req.body;
      if (!url || !type) {
        return res.status(400).json({ error: '缺少 url 或 type 参数' });
      }
      const taskId = `analyzer-${Date.now()}`;
      res.json({ taskId });
      // 后台执行
      service
        .generateFromUrl({ url, description, type, output, dryRun: false, auth, waitTime })
        .catch(() => {});
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/analyzer/generate/preview — 分析 + 生成预览（同步返回）
  router.post('/generate/preview', async (req, res) => {
    try {
      const { url, description, type, output, auth, waitTime } = req.body;
      if (!url || !type) {
        return res.status(400).json({ error: '缺少 url 或 type 参数' });
      }
      const code = await service.generateFromUrl({
        url,
        description,
        type,
        output,
        dryRun: true,
        auth,
        waitTime,
      });
      res.json({ code });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
