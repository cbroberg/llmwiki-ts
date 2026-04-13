import { Hono } from 'hono';
import { db, users, documents } from '@llmwiki/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';

export const userRoutes = new Hono();

userRoutes.use('*', requireAuth);

userRoutes.get('/me', (c) => {
  const user = getUser(c);

  const fullUser = db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      onboarded: users.onboarded,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .get();

  return c.json(fullUser);
});

userRoutes.post('/onboarding/complete', (c) => {
  const user = getUser(c);
  db.update(users)
    .set({ onboarded: true, updatedAt: new Date().toISOString() })
    .where(eq(users.id, user.id))
    .run();
  return c.body(null, 204);
});

userRoutes.get('/usage', (c) => {
  const user = getUser(c);

  const stats = db
    .select({
      totalPages: sql<number>`COALESCE(SUM(${documents.pageCount}), 0)`,
      totalStorageBytes: sql<number>`COALESCE(SUM(${documents.fileSize}), 0)`,
      documentCount: sql<number>`COUNT(*)`,
    })
    .from(documents)
    .where(and(eq(documents.userId, user.id), eq(documents.archived, false)))
    .get();

  const userLimits = db
    .select({ pageLimit: users.pageLimit, storageLimitBytes: users.storageLimitBytes })
    .from(users)
    .where(eq(users.id, user.id))
    .get();

  return c.json({
    totalPages: stats?.totalPages ?? 0,
    totalStorageBytes: stats?.totalStorageBytes ?? 0,
    documentCount: stats?.documentCount ?? 0,
    maxPages: userLimits?.pageLimit ?? 500,
    maxStorageBytes: userLimits?.storageLimitBytes ?? 1_073_741_824,
  });
});
