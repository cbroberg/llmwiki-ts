import { Hono } from 'hono';
import { db, knowledgeBases, documents } from '@llmwiki/db';
import { CreateKBSchema, UpdateKBSchema } from '@llmwiki/shared';
import { eq, and, sql, like, not } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';
import { uniqueSlug } from '../lib/slug.js';

export const kbRoutes = new Hono();

kbRoutes.use('/knowledge-bases/*', requireAuth);
kbRoutes.use('/knowledge-bases', requireAuth);

kbRoutes.get('/knowledge-bases', (c) => {
  const user = getUser(c);

  const rows = db
    .select({
      id: knowledgeBases.id,
      userId: knowledgeBases.userId,
      name: knowledgeBases.name,
      slug: knowledgeBases.slug,
      description: knowledgeBases.description,
      createdAt: knowledgeBases.createdAt,
      updatedAt: knowledgeBases.updatedAt,
      sourceCount: sql<number>`(
        SELECT COUNT(*) FROM documents
        WHERE documents.knowledge_base_id = ${knowledgeBases.id}
          AND documents.archived = 0
          AND documents.path NOT LIKE '/wiki/%'
      )`,
      wikiPageCount: sql<number>`(
        SELECT COUNT(*) FROM documents
        WHERE documents.knowledge_base_id = ${knowledgeBases.id}
          AND documents.archived = 0
          AND documents.path LIKE '/wiki/%'
      )`,
    })
    .from(knowledgeBases)
    .where(eq(knowledgeBases.userId, user.id))
    .orderBy(knowledgeBases.updatedAt)
    .all();

  return c.json(rows);
});

kbRoutes.get('/knowledge-bases/:id', (c) => {
  const user = getUser(c);
  const kbId = c.req.param('id');

  const kb = db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
    .get();

  if (!kb) return c.json({ error: 'Not found' }, 404);
  return c.json(kb);
});

kbRoutes.post('/knowledge-bases', async (c) => {
  const user = getUser(c);
  const body = CreateKBSchema.parse(await c.req.json());

  const id = crypto.randomUUID();
  const slug = uniqueSlug(body.name);

  db.insert(knowledgeBases)
    .values({
      id,
      userId: user.id,
      name: body.name,
      slug,
      description: body.description ?? null,
    })
    .run();

  // Auto-create overview and log wiki pages
  const now = new Date().toISOString();
  const overviewContent = `# ${body.name}\n\nThis is the overview page for your wiki. It will be automatically updated as you add sources and the LLM compiles knowledge.\n`;
  const logContent = `# Log\n\nChronological record of wiki activity.\n\n---\n`;

  for (const page of [
    { filename: 'overview.md', content: overviewContent, title: body.name },
    { filename: 'log.md', content: logContent, title: 'Log' },
  ]) {
    db.insert(documents)
      .values({
        id: crypto.randomUUID(),
        knowledgeBaseId: id,
        userId: user.id,
        filename: page.filename,
        title: page.title,
        path: '/wiki/',
        fileType: 'md',
        status: 'ready',
        content: page.content,
        version: 1,
      })
      .run();
  }

  const kb = db.select().from(knowledgeBases).where(eq(knowledgeBases.id, id)).get();
  return c.json(kb, 201);
});

kbRoutes.patch('/knowledge-bases/:id', async (c) => {
  const user = getUser(c);
  const kbId = c.req.param('id');
  const body = UpdateKBSchema.parse(await c.req.json());

  const existing = db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
    .get();

  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) {
    updates.name = body.name;
    updates.slug = uniqueSlug(body.name);
  }
  if (body.description !== undefined) updates.description = body.description;

  db.update(knowledgeBases).set(updates).where(eq(knowledgeBases.id, kbId)).run();

  const kb = db.select().from(knowledgeBases).where(eq(knowledgeBases.id, kbId)).get();
  return c.json(kb);
});

kbRoutes.delete('/knowledge-bases/:id', (c) => {
  const user = getUser(c);
  const kbId = c.req.param('id');

  const existing = db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
    .get();

  if (!existing) return c.json({ error: 'Not found' }, 404);

  db.delete(knowledgeBases).where(eq(knowledgeBases.id, kbId)).run();
  return c.body(null, 204);
});
