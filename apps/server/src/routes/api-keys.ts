import { Hono } from 'hono';
import { db, apiKeys } from '@llmwiki/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';

export const apiKeyRoutes = new Hono();

apiKeyRoutes.use('*', requireAuth);

apiKeyRoutes.get('/api-keys', (c) => {
  const user = getUser(c);

  const rows = db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))
    .all();

  return c.json(rows);
});

apiKeyRoutes.post('/api-keys', async (c) => {
  const user = getUser(c);
  const body = (await c.req.json()) as { name?: string };

  const id = crypto.randomUUID();
  const rawKey = `sv_${generateToken(32)}`;
  const keyPrefix = rawKey.slice(0, 11);
  const keyHash = await hashKey(rawKey);

  db.insert(apiKeys)
    .values({
      id,
      userId: user.id,
      name: body.name ?? 'Default',
      keyHash,
      keyPrefix,
    })
    .run();

  return c.json(
    {
      id,
      name: body.name ?? 'Default',
      keyPrefix,
      key: rawKey,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    },
    201,
  );
});

apiKeyRoutes.delete('/api-keys/:keyId', (c) => {
  const user = getUser(c);
  const keyId = c.req.param('keyId');

  db.update(apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)))
    .run();

  return c.body(null, 204);
});

function generateToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
}
