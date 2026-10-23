-- Safe migration for existing databases. Existing version rows remain valid
-- with NULL hashes until the idempotent backfill utility processes them.
ALTER TABLE document_versions
    ADD COLUMN IF NOT EXISTS content_sha256 VARCHAR(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_versions_content_sha256_check'
  ) THEN
    ALTER TABLE document_versions
      ADD CONSTRAINT document_versions_content_sha256_check
      CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_versions_content_sha256
    ON document_versions(content_sha256)
    WHERE content_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_versions_document_content_sha256
    ON document_versions(document_id, content_sha256)
    WHERE content_sha256 IS NOT NULL;
