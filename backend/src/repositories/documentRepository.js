
const pool = require("../config/db");

// Find a user by ID
const findUserById = async (client, userId) => {
  const result = await client.query(
    "SELECT id, department_id FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0] || null;
};

// Create a document record
const insertDocument = async (
  client,
  { title, description, uploaderId, isRestricted }
) => {
  const result = await client.query(
    `INSERT INTO documents
       (title, description, uploader_id, is_restricted)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, uploaderId, isRestricted]
  );

  return result.rows[0];
};

// Save the first version of a document
const insertVersion = async (
  client,
  {
    documentId,
    versionNumber = 1,
    filePath,
    originalFilename,
    mimeType,
    fileSize,
    contentSha256,
  }
) => {
  const result = await client.query(
    `INSERT INTO document_versions
       (document_id, version_number, file_path,
        original_filename, mime_type, file_size, content_sha256)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      documentId,
      versionNumber,
      filePath,
      originalFilename,
      mimeType,
      fileSize,
      contentSha256,
    ]
  );

  return result.rows[0];
};

// Lock the document row while allocating a new version number.
const lockDocument = async (client, documentId) => {
  const result = await client.query(
    "SELECT id FROM documents WHERE id = $1 FOR UPDATE",
    [documentId]
  );

  return result.rows[0] || null;
};

const findNextVersionNumber = async (client, documentId) => {
  const result = await client.query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
     FROM document_versions
     WHERE document_id = $1`,
    [documentId]
  );

  return Number(result.rows[0].next_version);
};

const lockContentHash = async (client, contentSha256) => {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [contentSha256]
  );
};

const findAccessibleDuplicateByHash = async (client, contentSha256, userId) => {
  const result = await client.query(
    `SELECT d.id, d.title, v.version_number
     FROM documents d
     JOIN document_versions v ON v.document_id = d.id
     WHERE v.content_sha256 = $1
       AND (
         NOT d.is_restricted OR EXISTS (
           SELECT 1
           FROM document_permissions viewer_permission
           JOIN users viewer ON viewer.department_id = viewer_permission.department_id
           WHERE viewer_permission.document_id = d.id
             AND viewer.id = $2
         )
       )
     ORDER BY d.id, v.version_number
     LIMIT 1`,
    [contentSha256, userId]
  );

  return result.rows[0] || null;
};

const findDocumentVersionByHash = async (client, documentId, contentSha256) => {
  const result = await client.query(
    `SELECT id, version_number
     FROM document_versions
     WHERE document_id = $1 AND content_sha256 = $2
     LIMIT 1`,
    [documentId, contentSha256]
  );

  return result.rows[0] || null;
};

// Create a tag if needed, or find its existing ID
const findOrCreateTag = async (client, tagName) => {
  const result = await client.query(
    `INSERT INTO tags (name)
     VALUES ($1)
     ON CONFLICT (name)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [tagName]
  );

  return result.rows[0].id;
};

// Connect a tag to a document
const insertDocumentTag = async (client, documentId, tagId) => {
  await client.query(
    `INSERT INTO document_tags (document_id, tag_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [documentId, tagId]
  );
};

// Verify that the requested departments exist
const findDepartmentsByIds = async (client, departmentIds) => {
  const result = await client.query(
    "SELECT id FROM departments WHERE id = ANY($1::int[])",
    [departmentIds]
  );

  return result.rows;
};

// Allow a department to access a document
const insertDocumentPermission = async (
  client,
  documentId,
  departmentId
) => {
  await client.query(
    `INSERT INTO document_permissions
       (document_id, department_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [documentId, departmentId]
  );
};

// Find documents visible to a demo user, with optional search filters.
const findAccessibleDocuments = async (
  client,
  { userId, title, tag, uploader, uploaderId, limit, offset }
) => {
  const values = [userId];
  const conditions = [
    `(NOT d.is_restricted OR EXISTS (
       SELECT 1
       FROM document_permissions viewer_permission
       JOIN users viewer ON viewer.department_id = viewer_permission.department_id
       WHERE viewer_permission.document_id = d.id
         AND viewer.id = $1
     ))`,
  ];

  const addFilter = (condition, value) => {
    values.push(value);
    conditions.push(condition.replace(/\$VALUE/g, `$${values.length}`));
  };

  if (title) {
    addFilter("d.title ILIKE '%' || $VALUE || '%'", title);
  }

  if (tag) {
    values.push(tag);
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM document_tags search_dt
         JOIN tags search_t ON search_t.id = search_dt.tag_id
         WHERE search_dt.document_id = d.id
           AND search_t.name ILIKE '%' || $${values.length} || '%'
       )`
    );
  }

  if (uploader) {
    addFilter(
      "(u.name ILIKE '%' || $VALUE || '%' OR u.email ILIKE '%' || $VALUE || '%')",
      uploader
    );
  }

  if (uploaderId !== undefined) {
    addFilter("d.uploader_id = $VALUE", uploaderId);
  }

  values.push(limit);
  const limitPlaceholder = `$${values.length}`;
  values.push(offset);
  const offsetPlaceholder = `$${values.length}`;

  const result = await client.query(
    `SELECT
       d.id,
       d.title,
       d.description,
       d.uploader_id,
       u.name AS uploader_name,
       u.email AS uploader_email,
       d.is_restricted,
       d.created_at,
       latest.version_number AS latest_version,
       latest.original_filename AS latest_filename,
       latest.file_size AS latest_file_size,
       latest.uploaded_at AS latest_uploaded_at,
       COALESCE(
         ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
         '{}'
       ) AS tags,
       COUNT(*) OVER() AS total_count
     FROM documents d
     JOIN users u ON u.id = d.uploader_id
     LEFT JOIN document_tags dt ON dt.document_id = d.id
     LEFT JOIN tags t ON t.id = dt.tag_id
     LEFT JOIN LATERAL (
       SELECT version_number, original_filename, file_size, uploaded_at
       FROM document_versions
       WHERE document_id = d.id
       ORDER BY version_number DESC
       LIMIT 1
     ) latest ON TRUE
     WHERE ${conditions.join(" AND ")}
     GROUP BY d.id, u.id, latest.version_number, latest.original_filename,
              latest.file_size, latest.uploaded_at
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    values
  );

  const total = Number(result.rows[0]?.total_count || 0);
  const documents = result.rows.map(({ total_count, ...document }) => document);

  return { documents, total };
};

// Find one document only when the demo user is allowed to access it.
const findAccessibleDocumentById = async (client, documentId, userId) => {
  const result = await client.query(
    `SELECT
       d.id,
       d.title,
       d.description,
       d.uploader_id,
       u.name AS uploader_name,
       u.email AS uploader_email,
       d.is_restricted,
       d.created_at,
       latest.version_number AS latest_version,
       latest.file_path AS latest_file_path,
       latest.original_filename AS latest_filename,
       latest.mime_type AS latest_mime_type,
       latest.file_size AS latest_file_size,
       latest.uploaded_at AS latest_uploaded_at
     FROM documents d
     JOIN users u ON u.id = d.uploader_id
     LEFT JOIN LATERAL (
       SELECT version_number, file_path, original_filename, mime_type,
              file_size, uploaded_at
       FROM document_versions
       WHERE document_id = d.id
       ORDER BY version_number DESC
       LIMIT 1
     ) latest ON TRUE
     WHERE d.id = $1
       AND (
         NOT d.is_restricted OR EXISTS (
           SELECT 1
           FROM document_permissions viewer_permission
           JOIN users viewer ON viewer.department_id = viewer_permission.department_id
           WHERE viewer_permission.document_id = d.id
             AND viewer.id = $2
         )
       )`,
    [documentId, userId]
  );

  return result.rows[0] || null;
};

const findDocumentTags = async (client, documentId) => {
  const result = await client.query(
    `SELECT t.id, t.name
     FROM tags t
     JOIN document_tags dt ON dt.tag_id = t.id
     WHERE dt.document_id = $1
     ORDER BY t.name`,
    [documentId]
  );

  return result.rows;
};

const findDocumentVersions = async (client, documentId) => {
  const result = await client.query(
    `SELECT id, version_number, original_filename, mime_type,
            file_size, uploaded_at
     FROM document_versions
     WHERE document_id = $1
     ORDER BY version_number DESC`,
    [documentId]
  );

  return result.rows;
};

const findAccessibleVersionsForComparison = async (
  client,
  documentId,
  userId,
  versionNumbers
) => {
  const result = await client.query(
    `SELECT v.id, v.version_number, v.file_path, v.original_filename,
            v.mime_type, v.file_size, v.uploaded_at
     FROM document_versions v
     JOIN documents d ON d.id = v.document_id
     WHERE v.document_id = $1
       AND v.version_number = ANY($2::int[])
       AND (
         NOT d.is_restricted OR EXISTS (
           SELECT 1
           FROM document_permissions viewer_permission
           JOIN users viewer ON viewer.department_id = viewer_permission.department_id
           WHERE viewer_permission.document_id = d.id
             AND viewer.id = $3
         )
       )
     ORDER BY v.version_number` ,
    [documentId, versionNumbers, userId]
  );

  return result.rows;
};

const findDocumentPermissions = async (client, documentId) => {
  const result = await client.query(
    `SELECT d.id, d.name
     FROM departments d
     JOIN document_permissions dp ON dp.department_id = d.id
     WHERE dp.document_id = $1
     ORDER BY d.name`,
    [documentId]
  );

  return result.rows;
};

module.exports = {
  pool,
  findUserById,
  insertDocument,
  insertVersion,
  lockDocument,
  findNextVersionNumber,
  lockContentHash,
  findAccessibleDuplicateByHash,
  findDocumentVersionByHash,
  findOrCreateTag,
  insertDocumentTag,
  findDepartmentsByIds,
  insertDocumentPermission,
  findAccessibleDocuments,
  findAccessibleDocumentById,
  findDocumentTags,
  findDocumentVersions,
  findAccessibleVersionsForComparison,
  findDocumentPermissions,
};
