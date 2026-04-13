import { Hono } from 'hono';
import { db, documents, knowledgeBases, DATA_DIR } from '@llmwiki/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';
import { join } from 'node:path';
import { mkdirSync, existsSync, writeFileSync, appendFileSync, statSync, readFileSync } from 'node:fs';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'docx', 'pptx', 'doc', 'ppt',
  'png', 'jpg', 'jpeg', 'webp', 'gif',
  'html', 'htm', 'xlsx', 'xls', 'csv',
  'md', 'txt',
]);

export const uploadRoutes = new Hono();

uploadRoutes.use('*', requireAuth);

// Simple multipart file upload (replaces TUS for simplicity)
uploadRoutes.post('/knowledge-bases/:kbId/documents/upload', async (c) => {
  const user = getUser(c);
  const kbId = c.req.param('kbId');

  // Verify KB ownership
  const kb = db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
    .get();
  if (!kb) return c.json({ error: 'Knowledge base not found' }, 404);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const path = (formData.get('path') as string) ?? '/';

  if (!file) return c.json({ error: 'No file provided' }, 400);
  if (file.size > MAX_FILE_SIZE) return c.json({ error: 'File too large (max 100MB)' }, 413);

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return c.json({ error: `File type .${ext} not allowed` }, 400);
  }

  const docId = crypto.randomUUID();

  // Store file on disk
  const userDir = join(DATA_DIR, user.id, docId);
  mkdirSync(userDir, { recursive: true });
  const filePath = join(userDir, `source.${ext}`);
  const buffer = await file.arrayBuffer();
  writeFileSync(filePath, Buffer.from(buffer));

  // Create document record
  db.insert(documents)
    .values({
      id: docId,
      knowledgeBaseId: kbId,
      userId: user.id,
      filename: file.name,
      path,
      fileType: ext,
      fileSize: file.size,
      status: ext === 'md' || ext === 'txt' ? 'ready' : 'pending',
    })
    .run();

  // For text files, read content directly
  if (ext === 'md' || ext === 'txt') {
    const content = new TextDecoder().decode(buffer);
    const title = ext === 'md' ? extractTitle(content) : file.name;
    db.update(documents)
      .set({ content, title, status: 'ready', version: 1 })
      .where(eq(documents.id, docId))
      .run();
  }

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  return c.json(doc, 201);
});

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}
