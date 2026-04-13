import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  db,
  rawDb,
  knowledgeBases,
  documents,
  documentChunks,
  users,
  runMigrations,
  initFTS,
  searchDocuments,
  searchChunks,
} from '@llmwiki/db';
import { eq, and, like, sql, desc } from 'drizzle-orm';

// Ensure DB is ready
runMigrations();
initFTS();

const server = new McpServer({
  name: 'llmwiki',
  version: '0.0.1',
});

// Helper: get the first user (local single-user mode)
function getUser(): { id: string; email: string } | null {
  const user = db.select({ id: users.id, email: users.email }).from(users).limit(1).get();
  return user ?? null;
}

function requireUser(): { id: string; email: string } {
  const user = getUser();
  if (!user) throw new Error('No user found. Please log in via the web UI first (http://localhost:3020).');
  return user;
}

function resolveKB(nameOrSlug: string, userId: string) {
  return (
    db
      .select()
      .from(knowledgeBases)
      .where(and(eq(knowledgeBases.slug, nameOrSlug), eq(knowledgeBases.userId, userId)))
      .get() ??
    db
      .select()
      .from(knowledgeBases)
      .where(and(eq(knowledgeBases.name, nameOrSlug), eq(knowledgeBases.userId, userId)))
      .get()
  );
}

// ── guide ──────────────────────────────────────────────────────────────────────
server.tool('guide', 'List knowledge bases and explain how the wiki works', {}, () => {
  const user = requireUser();

  const kbs = rawDb.prepare(`
    SELECT kb.name, kb.slug, kb.description,
      (SELECT COUNT(*) FROM documents d WHERE d.knowledge_base_id = kb.id AND d.archived = 0 AND d.path NOT LIKE '/wiki/%') as sourceCount,
      (SELECT COUNT(*) FROM documents d WHERE d.knowledge_base_id = kb.id AND d.archived = 0 AND d.path LIKE '/wiki/%') as wikiPageCount
    FROM knowledge_bases kb
    WHERE kb.user_id = ?
  `).all(user.id) as Array<{ name: string; slug: string; description: string | null; sourceCount: number; wikiPageCount: number }>;

  let text = `# LLM Wiki — How It Works

You maintain a persistent, compounding knowledge base. Three layers:
1. **Raw Sources** — immutable documents (PDFs, articles, notes)
2. **The Wiki** — LLM-maintained markdown pages at \`/wiki/\` (summaries, entity pages, cross-references)
3. **The Schema** — this guide + CLAUDE.md conventions

## Operations
- **Ingest**: Read a source → write summary → update wiki pages → append to log
- **Query**: Search wiki → synthesize answer → optionally file answer as new wiki page
- **Lint**: Health-check for contradictions, orphan pages, missing cross-references

## Your Knowledge Bases
`;

  if (kbs.length === 0) {
    text += '\nNo knowledge bases yet. Create one via the web UI at http://localhost:3020/wikis\n';
  } else {
    for (const kb of kbs) {
      text += `\n- **${kb.name}** (\`${kb.slug}\`) — ${kb.sourceCount} sources, ${kb.wikiPageCount} wiki pages`;
      if (kb.description) text += `\n  ${kb.description}`;
    }
  }

  return { content: [{ type: 'text' as const, text }] };
});

// ── search ─────────────────────────────────────────────────────────────────────
server.tool(
  'search',
  'Browse or search documents in a knowledge base',
  {
    knowledge_base: z.string().describe('Name or slug of the knowledge base'),
    mode: z.enum(['list', 'search']).default('list').describe('list = file tree, search = full-text search'),
    query: z.string().optional().describe('Search query (required for search mode)'),
    path: z.string().default('*').describe('Path filter glob (e.g. "/wiki/*", "/")')
  },
  ({ knowledge_base, mode, query, path }) => {
    const user = requireUser();
    const kb = resolveKB(knowledge_base, user.id);
    if (!kb) return { content: [{ type: 'text' as const, text: `Knowledge base "${knowledge_base}" not found.` }] };

    if (mode === 'search') {
      if (!query?.trim()) return { content: [{ type: 'text' as const, text: 'Search query required for search mode.' }] };

      // Use FTS5
      const results = searchDocuments(query, kb.id, user.id, 20);
      const chunkResults = searchChunks(query, kb.id, user.id, 10);

      let text = `## Search results for "${query}" in ${kb.name}\n\n`;

      if ((results as any[]).length === 0 && (chunkResults as any[]).length === 0) {
        text += 'No results found.\n';
      } else {
        text += `### Documents (${(results as any[]).length})\n`;
        for (const r of results as any[]) {
          text += `- \`${r.path}${r.filename}\` — ${r.title ?? r.filename}\n`;
        }
        text += `\n### Chunks (${(chunkResults as any[]).length})\n`;
        for (const c of chunkResults as any[]) {
          text += `- chunk #${c.chunk_index}: ${(c.content as string).slice(0, 200)}...\n`;
        }
      }

      return { content: [{ type: 'text' as const, text }] };
    }

    // List mode
    const conditions = [
      eq(documents.knowledgeBaseId, kb.id),
      eq(documents.userId, user.id),
      eq(documents.archived, false),
    ];

    if (path && path !== '*') {
      conditions.push(like(documents.path, path.replace('*', '%')));
    }

    const docs = db
      .select({
        filename: documents.filename,
        path: documents.path,
        title: documents.title,
        fileType: documents.fileType,
        status: documents.status,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(...conditions))
      .orderBy(documents.path, documents.filename)
      .all();

    let text = `## ${kb.name} — ${docs.length} documents\n\n`;
    for (const doc of docs) {
      const statusIcon = doc.status === 'ready' ? '✓' : doc.status === 'processing' ? '⏳' : '•';
      text += `${statusIcon} \`${doc.path}${doc.filename}\` — ${doc.title ?? doc.filename} (${doc.fileType})\n`;
    }

    return { content: [{ type: 'text' as const, text }] };
  },
);

// ── read ───────────────────────────────────────────────────────────────────────
server.tool(
  'read',
  'Read document content from a knowledge base',
  {
    knowledge_base: z.string().describe('Name or slug of the knowledge base'),
    path: z.string().describe('Full path to document (e.g. "/wiki/overview.md") or glob pattern (e.g. "/wiki/*.md")'),
  },
  ({ knowledge_base, path: docPath }) => {
    const user = requireUser();
    const kb = resolveKB(knowledge_base, user.id);
    if (!kb) return { content: [{ type: 'text' as const, text: `Knowledge base "${knowledge_base}" not found.` }] };

    const isGlob = docPath.includes('*') || docPath.includes('?');

    if (isGlob) {
      // Glob: split into directory + filename pattern
      const lastSlash = docPath.lastIndexOf('/');
      const dirPath = docPath.slice(0, lastSlash + 1) || '/';
      const filePattern = docPath.slice(lastSlash + 1);

      const docs = db
        .select({ id: documents.id, filename: documents.filename, path: documents.path, title: documents.title, content: documents.content })
        .from(documents)
        .where(
          and(
            eq(documents.knowledgeBaseId, kb.id),
            eq(documents.userId, user.id),
            eq(documents.archived, false),
            like(documents.path, dirPath.replace('*', '%')),
          ),
        )
        .all()
        .filter((d) => globMatch(d.filename, filePattern));

      let text = '';
      let totalChars = 0;
      const MAX_CHARS = 120_000;

      for (const doc of docs) {
        if (totalChars > MAX_CHARS) {
          text += `\n\n---\n_Truncated: ${docs.length - docs.indexOf(doc)} more documents not shown._\n`;
          break;
        }
        text += `\n\n---\n## ${doc.path}${doc.filename}\n\n`;
        const content = doc.content ?? '_No content_';
        text += content;
        totalChars += content.length;
      }

      if (docs.length === 0) {
        text = `No documents match "${docPath}" in ${kb.name}.`;
      }

      return { content: [{ type: 'text' as const, text }] };
    }

    // Single document
    const lastSlash = docPath.lastIndexOf('/');
    const dirPath = docPath.slice(0, lastSlash + 1) || '/';
    const filename = docPath.slice(lastSlash + 1);

    const doc = db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.knowledgeBaseId, kb.id),
          eq(documents.userId, user.id),
          eq(documents.archived, false),
          eq(documents.path, dirPath),
          eq(documents.filename, filename),
        ),
      )
      .get();

    if (!doc) return { content: [{ type: 'text' as const, text: `Document "${docPath}" not found in ${kb.name}.` }] };

    return { content: [{ type: 'text' as const, text: doc.content ?? '_No content_' }] };
  },
);

// ── write ──────────────────────────────────────────────────────────────────────
server.tool(
  'write',
  'Create or edit wiki pages in a knowledge base',
  {
    knowledge_base: z.string().describe('Name or slug of the knowledge base'),
    command: z.enum(['create', 'str_replace', 'append']).describe('create = new page, str_replace = find/replace, append = add to end'),
    path: z.string().default('/wiki/').describe('Directory path (e.g. "/wiki/", "/wiki/concepts/")'),
    title: z.string().optional().describe('Page title (required for create)'),
    content: z.string().optional().describe('Content for create or append'),
    tags: z.string().optional().describe('Comma-separated tags'),
    old_text: z.string().optional().describe('Text to find (for str_replace)'),
    new_text: z.string().optional().describe('Replacement text (for str_replace)'),
  },
  ({ knowledge_base, command, path: dirPath, title, content, tags, old_text, new_text }) => {
    const user = requireUser();
    const kb = resolveKB(knowledge_base, user.id);
    if (!kb) return { content: [{ type: 'text' as const, text: `Knowledge base "${knowledge_base}" not found.` }] };

    if (command === 'create') {
      if (!title) return { content: [{ type: 'text' as const, text: 'Title required for create.' }] };

      const filename = slugify(title) + '.md';
      const fullContent = content ?? `# ${title}\n`;
      const id = crypto.randomUUID();

      db.insert(documents)
        .values({
          id,
          knowledgeBaseId: kb.id,
          userId: user.id,
          filename,
          title,
          path: dirPath.endsWith('/') ? dirPath : dirPath + '/',
          fileType: 'md',
          status: 'ready',
          content: fullContent,
          tags: tags ?? null,
          version: 1,
        })
        .run();

      return { content: [{ type: 'text' as const, text: `Created \`${dirPath}${filename}\` — "${title}"` }] };
    }

    if (command === 'str_replace') {
      if (!old_text || new_text === undefined) {
        return { content: [{ type: 'text' as const, text: 'old_text and new_text required for str_replace.' }] };
      }

      // Find document by path - title acts as filename hint
      const lastSlash = (title ?? '').lastIndexOf('/');
      const searchPath = title ? (title.slice(0, title.lastIndexOf('/') + 1) || dirPath) : dirPath;
      const searchFile = title ? title.slice(title.lastIndexOf('/') + 1) : null;

      let doc;
      if (searchFile) {
        const sp = searchPath.endsWith('/') ? searchPath : searchPath + '/';
        doc = db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.knowledgeBaseId, kb.id),
              eq(documents.userId, user.id),
              eq(documents.archived, false),
              eq(documents.path, sp),
              eq(documents.filename, searchFile),
            ),
          )
          .get();
      }

      if (!doc) return { content: [{ type: 'text' as const, text: `Document not found. Provide the full path as title (e.g. "/wiki/overview.md").` }] };

      const currentContent = doc.content ?? '';
      const occurrences = currentContent.split(old_text).length - 1;
      if (occurrences === 0) return { content: [{ type: 'text' as const, text: `old_text not found in ${doc.path}${doc.filename}.` }] };
      if (occurrences > 1) return { content: [{ type: 'text' as const, text: `old_text found ${occurrences} times — must be unique. Add more surrounding context.` }] };

      const updated = currentContent.replace(old_text, new_text);
      db.update(documents)
        .set({ content: updated, version: doc.version + 1, updatedAt: new Date().toISOString() })
        .where(eq(documents.id, doc.id))
        .run();

      return { content: [{ type: 'text' as const, text: `Updated \`${doc.path}${doc.filename}\` (v${doc.version + 1})` }] };
    }

    if (command === 'append') {
      if (!title) return { content: [{ type: 'text' as const, text: 'Provide the document path as title (e.g. "/wiki/log.md").' }] };

      const sp = title.slice(0, title.lastIndexOf('/') + 1) || dirPath;
      const sf = title.slice(title.lastIndexOf('/') + 1);

      const doc = db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.knowledgeBaseId, kb.id),
            eq(documents.userId, user.id),
            eq(documents.archived, false),
            eq(documents.path, sp),
            eq(documents.filename, sf),
          ),
        )
        .get();

      if (!doc) return { content: [{ type: 'text' as const, text: `Document "${title}" not found.` }] };

      const updated = (doc.content ?? '') + '\n' + (content ?? '');
      db.update(documents)
        .set({ content: updated, version: doc.version + 1, updatedAt: new Date().toISOString() })
        .where(eq(documents.id, doc.id))
        .run();

      return { content: [{ type: 'text' as const, text: `Appended to \`${doc.path}${doc.filename}\` (v${doc.version + 1})` }] };
    }

    return { content: [{ type: 'text' as const, text: `Unknown command: ${command}` }] };
  },
);

// ── delete ─────────────────────────────────────────────────────────────────────
server.tool(
  'delete',
  'Archive documents (soft delete)',
  {
    knowledge_base: z.string().describe('Name or slug of the knowledge base'),
    path: z.string().describe('Full path to document (e.g. "/wiki/old-page.md") or glob pattern'),
  },
  ({ knowledge_base, path: docPath }) => {
    const user = requireUser();
    const kb = resolveKB(knowledge_base, user.id);
    if (!kb) return { content: [{ type: 'text' as const, text: `Knowledge base "${knowledge_base}" not found.` }] };

    // Protect essential files
    if (docPath === '/wiki/overview.md' || docPath === '/wiki/log.md') {
      return { content: [{ type: 'text' as const, text: `Cannot delete ${docPath} — it's a protected wiki page.` }] };
    }

    const lastSlash = docPath.lastIndexOf('/');
    const dirPath = docPath.slice(0, lastSlash + 1) || '/';
    const filename = docPath.slice(lastSlash + 1);

    const doc = db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.knowledgeBaseId, kb.id),
          eq(documents.userId, user.id),
          eq(documents.archived, false),
          eq(documents.path, dirPath),
          eq(documents.filename, filename),
        ),
      )
      .get();

    if (!doc) return { content: [{ type: 'text' as const, text: `Document "${docPath}" not found.` }] };

    db.update(documents)
      .set({ archived: true, status: 'archived', updatedAt: new Date().toISOString() })
      .where(eq(documents.id, doc.id))
      .run();

    return { content: [{ type: 'text' as const, text: `Archived \`${docPath}\`` }] };
  },
);

// ── helpers ────────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function globMatch(filename: string, pattern: string): boolean {
  if (pattern === '*') return true;
  const regex = new RegExp(
    '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
  );
  return regex.test(filename);
}

// ── start ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
