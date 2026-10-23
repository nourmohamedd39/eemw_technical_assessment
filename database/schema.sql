
-- 1. Departments
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department_id INT NOT NULL
        REFERENCES departments(id),
    role VARCHAR(50) NOT NULL
);

-- 3. Documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    uploader_id INT NOT NULL
        REFERENCES users(id),
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tags
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 5. Document Tags
CREATE TABLE document_tags (
    document_id INT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INT NOT NULL
        REFERENCES tags(id),
    PRIMARY KEY (document_id, tag_id)
);

-- 6. Document Versions
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL
        CHECK (version_number > 0),
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    file_size BIGINT NOT NULL
        CHECK (file_size >= 0),
    content_sha256 VARCHAR(64)
        CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version_number)
);

-- 7. Document Permissions
CREATE TABLE document_permissions (
    document_id INT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    department_id INT NOT NULL
        REFERENCES departments(id),
    PRIMARY KEY (document_id, department_id)
);

-- Search-related indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_documents_title
    ON documents(title);

CREATE INDEX idx_documents_title_trgm
    ON documents USING GIN (title gin_trgm_ops);

CREATE INDEX idx_documents_uploader
    ON documents(uploader_id);

CREATE INDEX idx_users_name_trgm
    ON users USING GIN (name gin_trgm_ops);

CREATE INDEX idx_users_email_trgm
    ON users USING GIN (email gin_trgm_ops);

CREATE INDEX idx_tags_name_trgm
    ON tags USING GIN (name gin_trgm_ops);

CREATE INDEX idx_document_tags_tag
    ON document_tags(tag_id);

CREATE INDEX idx_versions_document
    ON document_versions(document_id);

CREATE INDEX idx_versions_document_number
    ON document_versions(document_id, version_number DESC);

CREATE INDEX idx_versions_content_sha256
    ON document_versions(content_sha256)
    WHERE content_sha256 IS NOT NULL;

CREATE INDEX idx_versions_document_content_sha256
    ON document_versions(document_id, content_sha256)
    WHERE content_sha256 IS NOT NULL;
