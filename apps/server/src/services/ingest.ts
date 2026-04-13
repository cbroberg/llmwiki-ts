import { db, documents, knowledgeBases } from '@llmwiki/db';
import { eq, and } from 'drizzle-orm';
import { broadcaster } from './broadcast.js';
import { spawnClaude } from './claude.js';

const INGEST_MODEL = process.env.INGEST_MODEL ?? '';
const INGEST_TIMEOUT_MS = Number(process.env.INGEST_TIMEOUT_MS ?? 120_000);

// One ingest at a time per KB
const activeIngests = new Map<string, boolean>();
const ingestQueue = new Map<string, Array<{ docId: string; kbId: string; userId: string }>>();

export function triggerIngest(docId: string, kbId: string, userId: string): void {
  if (activeIngests.get(kbId)) {
    // Queue it
    const queue = ingestQueue.get(kbId) ?? [];
    queue.push({ docId, kbId, userId });
    ingestQueue.set(kbId, queue);
    console.log(`[ingest] Queued ${docId} for KB ${kbId} (${queue.length} in queue)`);
    return;
  }

  runIngest(docId, kbId, userId);
}

async function runIngest(docId: string, kbId: string, userId: string): Promise<void> {
  activeIngests.set(kbId, true);

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  const kb = db.select().from(knowledgeBases).where(eq(knowledgeBases.id, kbId)).get();

  if (!doc || !kb) {
    activeIngests.delete(kbId);
    return;
  }

  // Mark as processing
  db.update(documents)
    .set({ status: 'processing', updatedAt: new Date().toISOString() })
    .where(eq(documents.id, docId))
    .run();

  broadcaster.emit({
    type: 'ingest_started',
    kbId,
    docId,
    filename: doc.filename,
  });

  const today = new Date().toISOString().slice(0, 10);
  const sourcePath = `${doc.path}${doc.filename}`;

  const prompt = `You are the wiki compiler for knowledge base "${kb.name}" (slug: "${kb.slug}").

A new source has been added: "${doc.filename}" at path "${sourcePath}".

Your job is to ingest this source into the wiki. Follow these steps exactly:

1. Call \`read\` with knowledge_base="${kb.slug}" and path="${sourcePath}" to read the new source.

2. Call \`search\` with knowledge_base="${kb.slug}" and mode="list" to see the current wiki structure.

3. Call \`read\` with knowledge_base="${kb.slug}" and path="/wiki/overview.md" to understand the current wiki state.

4. Create a source summary page:
   Call \`write\` with knowledge_base="${kb.slug}", command="create", path="/wiki/sources/", title="${doc.title ?? doc.filename.replace(/\.\w+$/, '')}", and content that includes:
   - YAML frontmatter with title, tags (array), date (${today}), sources (["${doc.filename}"])
   - Key takeaways and findings
   - Important quotes or data points

5. For each KEY CONCEPT found in the source (aim for 2-5 concepts):
   - Check if a concept page already exists (you saw the wiki listing in step 2)
   - If it exists: call \`read\` on it, then \`write\` with command="str_replace" to integrate new information. Use the full path (e.g. "/wiki/concepts/concept-name.md") as the title parameter.
   - If it doesn't exist: call \`write\` with command="create", path="/wiki/concepts/", and full content with frontmatter

6. For each KEY ENTITY (person, organization, tool) found:
   - Same pattern: check exists → update or create under /wiki/entities/

7. Update the overview page:
   Call \`write\` with knowledge_base="${kb.slug}", command="str_replace", title="/wiki/overview.md"
   Replace the current content to reflect the new knowledge and link to the new pages.

8. Log the ingest:
   Call \`write\` with knowledge_base="${kb.slug}", command="append", title="/wiki/log.md", content:

   ## [${today}] ingest | ${doc.title ?? doc.filename}
   - Summary: (1-2 sentences)
   - Pages created: (list)
   - Pages updated: (list)
   - Contradictions: (any found, or "None")

IMPORTANT RULES:
- Be thorough but concise. Every claim should reference its source.
- Use [[page-name]] for internal wiki cross-references.
- All pages must have YAML frontmatter with title, tags, date.
- Do NOT create pages for trivial concepts. Focus on the 2-5 most important ones.
- If the source is very short or trivial, just create the summary and update overview/log.`;

  console.log(`[ingest] Starting ingest for "${doc.filename}" in "${kb.name}"`);

  const args = [
    '-p', prompt,
    '--allowedTools', 'mcp__llmwiki__guide,mcp__llmwiki__search,mcp__llmwiki__read,mcp__llmwiki__write',
    '--dangerously-skip-permissions',
    '--max-turns', '25',
    '--output-format', 'json',
    '--no-session-persistence',
    ...(INGEST_MODEL ? ['--model', INGEST_MODEL] : []),
  ];

  try {
    const result = await spawnClaude(args, INGEST_TIMEOUT_MS);

    // Mark as ready
    db.update(documents)
      .set({ status: 'ready', updatedAt: new Date().toISOString() })
      .where(eq(documents.id, docId))
      .run();

    broadcaster.emit({
      type: 'ingest_completed',
      kbId,
      docId,
      filename: doc.filename,
    });

    console.log(`[ingest] Completed ingest for "${doc.filename}"`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ingest] Failed for "${doc.filename}":`, errorMsg);

    db.update(documents)
      .set({
        status: 'failed',
        errorMessage: errorMsg.slice(0, 1000),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(documents.id, docId))
      .run();

    broadcaster.emit({
      type: 'ingest_failed',
      kbId,
      docId,
      filename: doc.filename,
      error: errorMsg.slice(0, 200),
    });
  } finally {
    activeIngests.delete(kbId);

    // Process next in queue
    const queue = ingestQueue.get(kbId);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      if (queue.length === 0) ingestQueue.delete(kbId);
      runIngest(next.docId, next.kbId, next.userId);
    }
  }
}

