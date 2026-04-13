import { Hono } from 'hono';
import { db, documents, knowledgeBases, documentChunks } from '@llmwiki/db';
import {
  CreateNoteSchema,
  UpdateDocumentSchema,
  UpdateContentSchema,
  BulkDeleteSchema,
} from '@llmwiki/shared';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';
import { chunkText, storeChunks } from '../services/chunker.js';

export const documentRoutes = new Hono();

documentRoutes.use('*', requireAuth);

// List documents in a knowledge base
documentRoutes.get('/knowledge-bases/:kbId/documents', (c) => {
  const user = getUser(c);
  const kbId = c.req.param('kbId');
  const path = c.req.query('path');

  const conditions = [
    eq(documents.knowledgeBaseId, kbId),
    eq(documents.userId, user.id),
    eq(documents.archived, false),
  ];

  if (path) {
    conditions.push(eq(documents.path, path));
  }

  const rows = db
    .select({
      id: documents.id,
      knowledgeBaseId: documents.knowledgeBaseId,
      userId: documents.userId,
      filename: documents.filename,
      title: documents.title,
      path: documents.path,
      fileType: documents.fileType,
      fileSize: documents.fileSize,
      documentNumber: documents.documentNumber,
      status: documents.status,
      pageCount: documents.pageCount,
      tags: documents.tags,
      url: documents.url,
      date: documents.date,
      metadata: documents.metadata,
      errorMessage: documents.errorMessage,
      version: documents.version,
      sortOrder: documents.sortOrder,
      archived: documents.archived,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(...conditions))
    .orderBy(documents.sortOrder, documents.createdAt)
    .all();

  return c.json(rows);
});

// Get single document
documentRoutes.get('/documents/:docId', (c) => {
  const user = getUser(c);
  const docId = c.req.param('docId');

  const doc = db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .get();

  if (!doc) return c.json({ error: 'Not found' }, 404);
  return c.json(doc);
});

// Get document content
documentRoutes.get('/documents/:docId/content', (c) => {
  const user = getUser(c);
  const docId = c.req.param('docId');

  const doc = db
    .select({ id: documents.id, content: documents.content, version: documents.version })
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .get();

  if (!doc) return c.json({ error: 'Not found' }, 404);
  return c.json(doc);
});

// Create a note (markdown document)
documentRoutes.post('/knowledge-bases/:kbId/documents/note', async (c) => {
  const user = getUser(c);
  const kbId = c.req.param('kbId');
  const body = CreateNoteSchema.parse(await c.req.json());

  // Verify KB ownership
  const kb = db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
    .get();
  if (!kb) return c.json({ error: 'Knowledge base not found' }, 404);

  const id = crypto.randomUUID();
  const title = extractTitle(body.content) ?? body.filename.replace(/\.md$/, '');

  db.insert(documents)
    .values({
      id,
      knowledgeBaseId: kbId,
      userId: user.id,
      filename: body.filename,
      title,
      path: body.path,
      fileType: 'md',
      status: 'ready',
      content: body.content,
      version: 1,
    })
    .run();

  // Chunk the content for search
  if (body.content.trim()) {
    const chunks = chunkText(body.content);
    storeChunks(id, user.id, kbId, chunks);
  }

  const doc = db.select().from(documents).where(eq(documents.id, id)).get();
  return c.json(doc, 201);
});

// Update document content
documentRoutes.put('/documents/:docId/content', async (c) => {
  const user = getUser(c);
  const docId = c.req.param('docId');
  const body = UpdateContentSchema.parse(await c.req.json());

  const existing = db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const newVersion = existing.version + 1;
  db.update(documents)
    .set({
      content: body.content,
      version: newVersion,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(documents.id, docId))
    .run();

  // Re-chunk
  db.delete(documentChunks).where(eq(documentChunks.documentId, docId)).run();
  if (body.content.trim()) {
    const chunks = chunkText(body.content);
    storeChunks(docId, user.id, existing.knowledgeBaseId, chunks);
  }

  return c.json({ id: docId, content: body.content, version: newVersion });
});

// Update document metadata
documentRoutes.patch('/documents/:docId', async (c) => {
  const user = getUser(c);
  const docId = c.req.param('docId');
  const body = UpdateDocumentSchema.parse(await c.req.json());

  const existing = db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.filename !== undefined) updates.filename = body.filename;
  if (body.path !== undefined) updates.path = body.path;
  if (body.title !== undefined) updates.title = body.title;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.date !== undefined) updates.date = body.date;
  if (body.metadata !== undefined) updates.metadata = body.metadata;

  db.update(documents).set(updates).where(eq(documents.id, docId)).run();

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  return c.json(doc);
});

// Delete single document (soft)
documentRoutes.delete('/documents/:docId', (c) => {
  const user = getUser(c);
  const docId = c.req.param('docId');

  db.update(documents)
    .set({ archived: true, status: 'archived', updatedAt: new Date().toISOString() })
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .run();

  return c.body(null, 204);
});

// Bulk delete
documentRoutes.post('/documents/bulk-delete', async (c) => {
  const user = getUser(c);
  const body = BulkDeleteSchema.parse(await c.req.json());

  db.update(documents)
    .set({ archived: true, status: 'archived', updatedAt: new Date().toISOString() })
    .where(and(inArray(documents.id, body.ids), eq(documents.userId, user.id)))
    .run();

  return c.body(null, 204);
});

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}
