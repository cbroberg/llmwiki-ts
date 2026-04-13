import { Hono } from 'hono';
import { db, documents, knowledgeBases } from '@llmwiki/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';
import { triggerIngest } from '../services/ingest.js';

export const ingestRoutes = new Hono();

ingestRoutes.use('*', requireAuth);

// Manually trigger ingest for a document
ingestRoutes.post('/documents/:docId/ingest', (c) => {
  const user = getUser(c);
  const docId = c.req.param('docId');

  const doc = db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .get();

  if (!doc) return c.json({ error: 'Not found' }, 404);
  if (doc.status === 'processing') return c.json({ error: 'Already processing' }, 409);

  triggerIngest(docId, doc.knowledgeBaseId, user.id);

  return c.json({ ok: true, message: 'Ingest started' }, 202);
});
