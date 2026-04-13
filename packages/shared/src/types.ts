import type { z } from 'zod';
import type {
  KnowledgeBaseSchema,
  DocumentSchema,
  DocumentContentSchema,
  UserSchema,
  ApiKeySchema,
  UsageSchema,
  DocumentChunkSchema,
} from './schemas.js';

export type User = z.infer<typeof UserSchema>;
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentContent = z.infer<typeof DocumentContentSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type Usage = z.infer<typeof UsageSchema>;
export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
export type FileType = 'md' | 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'html' | 'png' | 'jpg' | 'webp' | 'gif' | 'txt';
