import { Hono } from 'hono';
import { db, documents, knowledgeBases, searchDocuments, searchChunks } from '@llmwiki/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';

export const searchRoutes = new Hono();

searchRoutes.use('*', requireAuth);

searchRoutes.get('/knowledge-bases/:kbId/search', (c) => {
  const user = getUser(c);
  const kbId = c.req.param('kbId');
  const query = c.req.query('q') ?? '';
  const limit = Math.min(Number(c.req.query('limit') ?? 10), 50);

  if (!query.trim()) {
    return c.json({ documents: [], chunks: [] });
  }

  // Verify KB ownership
  const kb = db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
    .get();
  if (!kb) return c.json({ error: 'Not found' }, 404);

  const docResults = searchDocuments(query, kbId, user.id, limit);
  const chunkResults = searchChunks(query, kbId, user.id, limit);

  return c.json({ documents: docResults, chunks: chunkResults });
});
