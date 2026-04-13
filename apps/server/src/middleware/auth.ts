import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { db, sessions, users } from '@llmwiki/db';
import { eq, and, gt } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const sessionId = getCookie(c, 'session');
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const now = new Date().toISOString();
  const result = db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .get();

  if (!result) {
    return c.json({ error: 'Session expired' }, 401);
  }

  c.set('user', result);
  return next();
}

export function getUser(c: Context): AuthUser {
  return c.get('user') as AuthUser;
}
