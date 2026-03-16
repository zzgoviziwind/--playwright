// Dashboard 服务入口 — Express + Vite dev middleware + WebSocket

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';

// 加载 e2e-tests/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

import { socketManager } from './ws/socket-manager';
import { configRoutes } from './routes/config.routes';
import { testsRoutes } from './routes/tests.routes';
import { runnerRoutes } from './routes/runner.routes';
import { aiRoutes } from './routes/ai.routes';
import { analyzerRoutes } from './routes/analyzer.routes';
import { recorderRoutes } from './routes/recorder.routes';

const PORT = parseInt(process.env.DASHBOARD_PORT || '3200', 10);
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // API 路由
  app.use('/api/config', configRoutes(PROJECT_ROOT));
  app.use('/api/tests', testsRoutes(PROJECT_ROOT));
  app.use('/api/runner', runnerRoutes(PROJECT_ROOT));
  app.use('/api/ai', aiRoutes(PROJECT_ROOT));
  app.use('/api/analyzer', analyzerRoutes(PROJECT_ROOT));
  app.use('/api/recorder', recorderRoutes());

  // 静态代理 playwright-report
  app.use('/report', express.static(path.join(PROJECT_ROOT, 'playwright-report')));

  if (isDev) {
    // 开发模式：使用 Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.resolve(__dirname, '..'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 生产模式：serve 构建产物
    const distDir = path.resolve(__dirname, '../dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // 初始化 WebSocket
  socketManager.init(server);

  server.listen(PORT, () => {
    console.log(`\n  E2E 测试管理平台已启动`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  模式: ${isDev ? '开发' : '生产'}\n`);
  });
}

startServer().catch((err) => {
  console.error('服务启动失败:', err);
  process.exit(1);
});
