import { Hono } from 'hono';
import { db, knowledgeBases } from '@llmwiki/db';
import { eq } from 'drizzle-orm';
import { requireAuth, getUser } from '../middleware/auth.js';
import { spawn } from 'node:child_process';

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude';
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'claude-sonnet-4-5-20250514';
const PROJECT_ROOT = process.env.LLMWIKI_PROJECT_ROOT ?? process.cwd();

export const chatRoutes = new Hono();

chatRoutes.use('*', requireAuth);

// Global chat — searches across all user's wikis
chatRoutes.post('/chat', async (c) => {
  const user = getUser(c);
  const { message } = (await c.req.json()) as { message: string };

  if (!message?.trim()) return c.json({ error: 'Message required' }, 400);

  const kbs = db
    .select({ name: knowledgeBases.name, slug: knowledgeBases.slug })
    .from(knowledgeBases)
    .where(eq(knowledgeBases.userId, user.id))
    .all();

  if (kbs.length === 0) {
    return c.json({ answer: 'No knowledge bases found. Create a wiki first and add some sources.' });
  }

  const kbList = kbs.map((kb) => `- "${kb.name}" (slug: "${kb.slug}")`).join('\n');

  const prompt = `You are a knowledgeable assistant with access to the user's wiki knowledge bases.

Available knowledge bases:
${kbList}

The user asks: "${message.replace(/"/g, '\\"')}"

Answer using the wikis as your knowledge source:
1. Call \`guide\` to see the full wiki structure.
2. For each relevant knowledge base, call \`search\` with mode="search" and the user's query to find matching content.
3. Call \`read\` on the most relevant wiki pages to get full context.
4. Synthesize a clear, concise answer with citations using [[page-name]] links.

If searching across multiple wikis, clearly indicate which wiki each piece of information comes from.
If the wikis don't contain relevant information, say so honestly.
Keep your answer focused and under 500 words. Answer in the same language as the user's question.`;

  const args = [
    '-p', prompt,
    '--allowedTools', 'mcp__llmwiki__guide,mcp__llmwiki__search,mcp__llmwiki__read',
    '--dangerously-skip-permissions',
    '--max-turns', '15',
    '--model', CHAT_MODEL,
    '--output-format', 'json',
    '--no-session-persistence',
  ];

  try {
    const result = await spawnClaude(args);
    const answer = extractAssistantText(result);
    return c.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[chat] Error:', msg);
    return c.json({ error: msg }, 500);
  }
});

function spawnClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Close stdin immediately so claude doesn't wait for input
    child.stdin.end();

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Chat timed out after 60s'));
    }, 60_000);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited ${code}: ${stderr.slice(0, 300)}`));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function extractAssistantText(raw: string): string {
  try {
    const body = JSON.parse(raw);
    if (typeof body.result === 'string') return body.result;
    if (body.content && Array.isArray(body.content)) {
      return body.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }
    if (Array.isArray(body)) {
      const last = body.filter((m: any) => m.role === 'assistant').pop();
      if (last?.content) {
        if (typeof last.content === 'string') return last.content;
        if (Array.isArray(last.content)) {
          return last.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');
        }
      }
    }
    return raw;
  } catch {
    return raw;
  }
}
