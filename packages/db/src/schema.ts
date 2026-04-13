import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
  pageLimit: integer('page_limit').notNull().default(500),
  storageLimitBytes: integer('storage_limit_bytes').notNull().default(1_073_741_824),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const knowledgeBases = sqliteTable(
  'knowledge_bases',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_kb_user_slug').on(table.userId, table.slug),
    uniqueIndex('idx_kb_user_name').on(table.userId, table.name),
  ],
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    filename: text('filename').notNull(),
    title: text('title'),
    path: text('path').notNull().default('/'),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull().default(0),
    documentNumber: integer('document_number'),
    status: text('status', {
      enum: ['pending', 'processing', 'ready', 'failed', 'archived'],
    })
      .notNull()
      .default('pending'),
    pageCount: integer('page_count'),
    content: text('content'),
    tags: text('tags'),
    url: text('url'),
    date: text('date'),
    metadata: text('metadata'),
    errorMessage: text('error_message'),
    version: integer('version').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_documents_kb_id').on(table.knowledgeBaseId),
    index('idx_documents_user_id').on(table.userId),
    index('idx_documents_kb_path').on(table.knowledgeBaseId, table.path),
    uniqueIndex('idx_documents_kb_number').on(table.knowledgeBaseId, table.documentNumber),
  ],
);

export const documentPages = sqliteTable(
  'document_pages',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    page: integer('page').notNull(),
    content: text('content').notNull(),
    elements: text('elements'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex('idx_doc_pages_doc_page').on(table.documentId, table.page)],
);

export const documentChunks = sqliteTable(
  'document_chunks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    page: integer('page'),
    startChar: integer('start_char'),
    tokenCount: integer('token_count').notNull(),
    headerBreadcrumb: text('header_breadcrumb'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_chunks_doc_index').on(table.documentId, table.chunkIndex),
    index('idx_chunks_kb').on(table.knowledgeBaseId),
    index('idx_chunks_doc').on(table.documentId),
  ],
);

export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name'),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    lastUsedAt: text('last_used_at'),
    revokedAt: text('revoked_at'),
  },
  (table) => [index('idx_api_keys_user_id').on(table.userId)],
);
