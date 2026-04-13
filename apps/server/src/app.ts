import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { kbRoutes } from './routes/knowledge-bases.js';
import { documentRoutes } from './routes/documents.js';
import { uploadRoutes } from './routes/uploads.js';
import { apiKeyRoutes } from './routes/api-keys.js';
import { userRoutes } from './routes/user.js';
import { searchRoutes } from './routes/search.js';
import { streamRoutes } from './routes/stream.js';
import { ingestRoutes } from './routes/ingest.js';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', logger());
  app.use(
    '/api/*',
    cors({
      origin: process.env.APP_URL ?? 'http://localhost:3000',
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposeHeaders: ['Set-Cookie', 'X-Document-Id'],
    }),
  );

  app.route('/api', healthRoutes);
  app.route('/api/auth', authRoutes);
  app.route('/api/v1', kbRoutes);
  app.route('/api/v1', documentRoutes);
  app.route('/api/v1', uploadRoutes);
  app.route('/api/v1', apiKeyRoutes);
  app.route('/api/v1', userRoutes);
  app.route('/api/v1', searchRoutes);
  app.route('/api/v1', streamRoutes);
  app.route('/api/v1', ingestRoutes);

  if (process.env.LLMWIKI_SERVE_WEB === '1') {
    // Production: serve static web assets
  }

  return app;
}
