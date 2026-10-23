-- Safe migration for databases initialized before pg_trgm indexes were added.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_documents_title_trgm
    ON documents USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_name_trgm
    ON users USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_email_trgm
    ON users USING GIN (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tags_name_trgm
    ON tags USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_versions_document_number
    ON document_versions(document_id, version_number DESC);
