ALTER TABLE knowledge_bases ADD CONSTRAINT uq_kb_user_name UNIQUE (user_id, name);
