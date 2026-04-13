import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  onboarded: z.boolean(),
  pageLimit: z.number().int(),
  storageLimitBytes: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const KnowledgeBaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string(),
  description: z.string().nullable(),
  sourceCount: z.number().int().optional(),
  wikiPageCount: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateKBSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
});

export const UpdateKBSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const DocumentStatusEnum = z.enum(['pending', 'processing', 'ready', 'failed', 'archived']);

export const DocumentSchema = z.object({
  id: z.string(),
  knowledgeBaseId: z.string(),
  userId: z.string(),
  filename: z.string(),
  title: z.string().nullable(),
  path: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  documentNumber: z.number().int().nullable(),
  status: DocumentStatusEnum,
  pageCount: z.number().int().nullable(),
  content: z.string().nullable(),
  tags: z.string().nullable(),
  url: z.string().nullable(),
  date: z.string().nullable(),
  metadata: z.string().nullable(),
  errorMessage: z.string().nullable(),
  version: z.number().int(),
  sortOrder: z.number().int(),
  archived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DocumentContentSchema = z.object({
  id: z.string(),
  content: z.string().nullable(),
  version: z.number().int(),
});

export const CreateNoteSchema = z.object({
  filename: z.string().min(1),
  path: z.string().default('/'),
  content: z.string().default(''),
});

export const UpdateDocumentSchema = z.object({
  filename: z.string().min(1).optional(),
  path: z.string().optional(),
  title: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
});

export const UpdateContentSchema = z.object({
  content: z.string(),
});

export const ApiKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().nullable(),
  keyPrefix: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});

export const CreateApiKeySchema = z.object({
  name: z.string().default('Default'),
});

export const UsageSchema = z.object({
  totalPages: z.number().int(),
  totalStorageBytes: z.number().int(),
  documentCount: z.number().int(),
  maxPages: z.number().int(),
  maxStorageBytes: z.number().int(),
});

export const DocumentChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  knowledgeBaseId: z.string(),
  chunkIndex: z.number().int(),
  content: z.string(),
  page: z.number().int().nullable(),
  startChar: z.number().int().nullable(),
  tokenCount: z.number().int(),
  headerBreadcrumb: z.string().nullable(),
  createdAt: z.string(),
});

export const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});
