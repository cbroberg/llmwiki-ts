CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_user_id` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`knowledge_base_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`page` integer,
	`start_char` integer,
	`token_count` integer NOT NULL,
	`header_breadcrumb` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_bases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chunks_doc_index` ON `document_chunks` (`document_id`,`chunk_index`);--> statement-breakpoint
CREATE INDEX `idx_chunks_kb` ON `document_chunks` (`knowledge_base_id`);--> statement-breakpoint
CREATE INDEX `idx_chunks_doc` ON `document_chunks` (`document_id`);--> statement-breakpoint
CREATE TABLE `document_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`page` integer NOT NULL,
	`content` text NOT NULL,
	`elements` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_doc_pages_doc_page` ON `document_pages` (`document_id`,`page`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`knowledge_base_id` text NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`title` text,
	`path` text DEFAULT '/' NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`document_number` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`page_count` integer,
	`content` text,
	`tags` text,
	`url` text,
	`date` text,
	`metadata` text,
	`error_message` text,
	`version` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_bases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_documents_kb_id` ON `documents` (`knowledge_base_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_user_id` ON `documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_kb_path` ON `documents` (`knowledge_base_id`,`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_documents_kb_number` ON `documents` (`knowledge_base_id`,`document_number`);--> statement-breakpoint
CREATE TABLE `knowledge_bases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_kb_user_slug` ON `knowledge_bases` (`user_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_kb_user_name` ON `knowledge_bases` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`onboarded` integer DEFAULT false NOT NULL,
	`page_limit` integer DEFAULT 500 NOT NULL,
	`storage_limit_bytes` integer DEFAULT 1073741824 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);