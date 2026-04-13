import { Hono } from 'hono';
import { db, rawDb, knowledgeBases } from '@llmwiki/db';
import { eq } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';
import { spawnClaude } from '../services/claude.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'claude-haiku-4-5-20251001';

export const chatRoutes = new Hono();

chatRoutes.use('*', requireAuth);

chatRoutes.post('/chat', async (c) => {
  const user = getUser(c);
  const { message } = (await c.req.json()) as { message: string };

  if (!message?.trim()) return c.json({ error: 'Message required' }, 400);

  const kbs = db
    .select({ id: knowledgeBases.id, name: knowledgeBases.name })
    .from(knowledgeBases)
    .where(eq(knowledgeBases.userId, user.id))
    .all();

  if (kbs.length === 0) {
    return c.json({ answer: 'No knowledge bases found. Create a wiki first and add some sources.' });
  }

  const context = retrieveContext(message, kbs.map((kb) => kb.id), user.id);

  if (!context.trim()) {
    return c.json({ answer: 'Jeg fandt ingen relevante wiki-sider for dit spørgsmål. Prøv at omformulere eller tilføj flere kilder.' });
  }

  const systemPrompt = `You are a knowledgeable assistant. Answer the user's question based ONLY on the wiki context provided below. Do not make up information.

## Wiki Context
${context}

## Instructions
- Answer in the same language as the question
- Be concise (max 300 words)
- Use **bold** for key terms
- Reference wiki pages with [[page-name]] links where relevant
- If the context doesn't contain enough information, say so honestly`;

  // Prefer direct API call (fast, ~2s) over claude subprocess (slow, ~20s)
  if (ANTHROPIC_API_KEY) {
    try {
      const answer = await callAnthropicAPI(systemPrompt, message);
      return c.json({ answer });
    } catch (err) {
      console.error('[chat] API error, falling back to CLI:', (err as Error).message);
    }
  }

  // Fallback: claude -p subprocess
  const args = [
    '-p', `${systemPrompt}\n\n## User Question\n${message}`,
    '--dangerously-skip-permissions',
    '--max-turns', '1',
    '--output-format', 'json',
    '--no-session-persistence',
    ...(CHAT_MODEL ? ['--model', CHAT_MODEL] : []),
  ];

  try {
    const result = await spawnClaude(args, 30_000);
    const answer = extractAnswer(result);
    return c.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[chat] Error:', msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * Direct Anthropic API call — ~2s response time
 */
async function callAnthropicAPI(system: string, userMessage: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CHAT_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  return data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

/**
 * Server-side retrieval: search wiki pages, return as context string
 */
function retrieveContext(query: string, kbIds: string[], userId: string): string {
  const chunks: string[] = [];
  let totalChars = 0;
  const MAX_CHARS = 30_000;

  for (const kbId of kbIds) {
    const results = rawDb.prepare(`
      SELECT d.title, d.filename, d.path, d.content
      FROM documents d
      WHERE d.knowledge_base_id = ?
        AND d.user_id = ?
        AND d.archived = 0
        AND d.path LIKE '/wiki/%'
        AND d.content IS NOT NULL
        AND d.content != ''
      ORDER BY
        CASE WHEN d.content LIKE ? THEN 0 ELSE 1 END,
        d.updated_at DESC
      LIMIT 10
    `).all(kbId, userId, `%${query}%`) as Array<{ title: string; filename: string; path: string; content: string }>;

    for (const doc of results) {
      if (totalChars >= MAX_CHARS) break;
      const content = doc.content.slice(0, 5000);
      chunks.push(`### ${doc.path}${doc.filename}\n${content}`);
      totalChars += content.length;
    }
  }

  return chunks.join('\n\n---\n\n');
}

function extractAnswer(raw: string): string {
  try {
    const body = JSON.parse(raw);
    if (typeof body.result === 'string') return body.result;
    if (body.content && Array.isArray(body.content)) {
      return body.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }
    return raw;
  } catch {
    return raw;
  }
}
