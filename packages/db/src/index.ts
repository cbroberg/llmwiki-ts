import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

export * from './schema.js';
export { schema };

const DATA_DIR = process.env.LLMWIKI_DATA_DIR ?? join(process.cwd(), 'data');
const DB_PATH = process.env.LLMWIKI_DB_PATH ?? join(DATA_DIR, 'llmwiki.db');

mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA busy_timeout = 5000;');

export const db = drizzle(sqlite, { schema });

export function runMigrations(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = join(__dirname, '..', 'drizzle');
  migrate(db, { migrationsFolder });
}

export function initFTS(): void {
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      content,
      title,
      filename,
      content_rowid='rowid',
      tokenize='porter unicode61'
    );
  `);
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
      content,
      header_breadcrumb,
      content_rowid='rowid',
      tokenize='porter unicode61'
    );
  `);
}

export function searchDocuments(query: string, kbId: string, userId: string, limit = 10): unknown[] {
  return sqlite
    .prepare(
      `SELECT d.*, highlight(documents_fts, 0, '<mark>', '</mark>') as highlight
       FROM documents_fts
       JOIN documents d ON d.rowid = documents_fts.rowid
       WHERE documents_fts MATCH ?
         AND d.knowledge_base_id = ?
         AND d.user_id = ?
         AND d.archived = 0
       ORDER BY rank
       LIMIT ?`,
    )
    .all(query, kbId, userId, limit);
}

export function searchChunks(query: string, kbId: string, userId: string, limit = 10): unknown[] {
  return sqlite
    .prepare(
      `SELECT dc.*, highlight(chunks_fts, 0, '<mark>', '</mark>') as highlight
       FROM chunks_fts
       JOIN document_chunks dc ON dc.rowid = chunks_fts.rowid
       WHERE chunks_fts MATCH ?
         AND dc.knowledge_base_id = ?
         AND dc.user_id = ?
       ORDER BY rank
       LIMIT ?`,
    )
    .all(query, kbId, userId, limit);
}

export { DB_PATH, DATA_DIR };
