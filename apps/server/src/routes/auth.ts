import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { db, users, sessions } from '@llmwiki/db';
import { eq } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export const authRoutes = new Hono();

authRoutes.get('/google', (c) => {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${API_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.redirect(`${APP_URL}/login?error=no_code`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${API_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return c.redirect(`${APP_URL}/login?error=token_exchange`);
  }

  const tokens = (await tokenRes.json()) as { access_token: string };

  // Get user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return c.redirect(`${APP_URL}/login?error=userinfo`);
  }

  const googleUser = (await userInfoRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };

  // Upsert user
  const existingUser = db.select().from(users).where(eq(users.email, googleUser.email)).get();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    db.update(users)
      .set({
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .run();
  } else {
    userId = crypto.randomUUID();
    db.insert(users)
      .values({
        id: userId,
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
      })
      .run();
  }

  // Create session (30 days)
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.insert(sessions).values({ id: sessionId, userId, expiresAt }).run();

  setCookie(c, 'session', sessionId, {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  deleteCookie(c, 'oauth_state');

  return c.redirect(`${APP_URL}/wikis`);
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'session');
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const { getCookie: gc } = await import('hono/cookie');
  const sessionId = gc(c, 'session');
  if (!sessionId) {
    return c.json({ user: null });
  }

  const now = new Date().toISOString();
  const { gt, and, eq: eq2 } = await import('drizzle-orm');
  const result = db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      onboarded: users.onboarded,
    })
    .from(sessions)
    .innerJoin(users, eq2(users.id, sessions.userId))
    .where(and(eq2(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .get();

  return c.json({ user: result ?? null });
});
