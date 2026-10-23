
const fs = require("fs/promises");
const path = require("path");
const repository = require("../repositories/documentRepository");
const { hashFile } = require("../utils/fileHasher");

const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Create an error with an appropriate HTTP status
const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parsePositiveId = (value, fieldName) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw httpError(400, `A valid ${fieldName} is required.`);
  }

  return id;
};

const parseDemoUserId = (value) => parsePositiveId(value, "demo user ID");

const validateVersionFile = (file) => {
  if (!file || !file.filename || !file.originalname || !Number.isSafeInteger(file.size)) {
    throw httpError(400, "A valid uploaded file is required.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw httpError(413, "The uploaded file exceeds the maximum size of 25 MB.");
  }
};

const hashUploadedFile = async (file) => {
  try {
    return await hashFile(file.path);
  } catch {
    throw httpError(400, "The uploaded file could not be read.");
  }
};

const duplicateDocumentError = (duplicate) => {
  const error = httpError(409, "An identical file already exists in an accessible document.");
  error.existingDocumentId = duplicate.id;
  error.existingDocumentTitle = duplicate.title;
  error.existingDocumentVersion = duplicate.version_number;
  return error;
};

const withDatabaseClient = async (callback) => {
  const client = await repository.pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

const parsePagination = (query) => {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw httpError(400, "Limit must be an integer between 1 and 100.");
  }

  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw httpError(400, "Offset must be a non-negative integer.");
  }

  return { limit, offset };
};

const searchDocuments = async (query, demoUserId) => {
  const userId = parseDemoUserId(demoUserId);
  const title = typeof query.title === "string" ? query.title.trim() : "";
  const tag = typeof query.tag === "string" ? query.tag.trim() : "";
  const uploader = typeof query.uploader === "string"
    ? query.uploader.trim()
    : "";
  const uploaderId = query.uploaderId === undefined
    ? undefined
    : parsePositiveId(query.uploaderId, "uploader ID");
  const { limit, offset } = parsePagination(query);

  return withDatabaseClient(async (client) => {
    const viewer = await repository.findUserById(client, userId);

    if (!viewer) {
      throw httpError(404, "Demo user not found.");
    }

    return repository.findAccessibleDocuments(client, {
      userId,
      title,
      tag,
      uploader,
      uploaderId,
      limit,
      offset,
    });
  });
};

const getDocument = async (documentIdValue, demoUserId) => {
  const documentId = parsePositiveId(documentIdValue, "document ID");
  const userId = parseDemoUserId(demoUserId);

  return withDatabaseClient(async (client) => {
    const viewer = await repository.findUserById(client, userId);

    if (!viewer) {
      throw httpError(404, "Demo user not found.");
    }

    const document = await repository.findAccessibleDocumentById(
      client,
      documentId,
      userId
    );

    if (!document) {
      throw httpError(404, "Document not found.");
    }

    const tags = await repository.findDocumentTags(client, documentId);
    const versions = await repository.findDocumentVersions(client, documentId);
    const permissions = await repository.findDocumentPermissions(client, documentId);

    return { document, tags, versions, permissions };
  });
};

const getDocumentDownload = async (documentIdValue, demoUserId) => {
  const result = await getDocument(documentIdValue, demoUserId);
  const { document } = result;

  if (!document.latest_file_path) {
    throw httpError(404, "Document file not found.");
  }

  const uploadDirectory = process.env.UPLOAD_DIRECTORY
    ? path.resolve(process.env.UPLOAD_DIRECTORY)
    : path.resolve(__dirname, "../..", "uploads");
  const storedFilename = path.basename(document.latest_file_path);
  const filePath = path.resolve(uploadDirectory, storedFilename);
  const relativePath = path.relative(uploadDirectory, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw httpError(500, "Stored document path is invalid.");
  }

  try {
    await fs.access(filePath);
  } catch {
    throw httpError(404, "Document file not found.");
  }

  return {
    filePath,
    originalFilename: document.latest_filename,
    mimeType: document.latest_mime_type,
  };
};

const getVersionHistory = async (documentIdValue, demoUserId) => {
  const documentId = parsePositiveId(documentIdValue, "document ID");
  const userId = parseDemoUserId(demoUserId);

  return withDatabaseClient(async (client) => {
    const viewer = await repository.findUserById(client, userId);

    if (!viewer) {
      throw httpError(404, "Demo user not found.");
    }

    const document = await repository.findAccessibleDocumentById(
      client,
      documentId,
      userId
    );

    if (!document) {
      throw httpError(404, "Document not found.");
    }

    const versions = await repository.findDocumentVersions(client, documentId);

    return {
      documentId: document.id,
      title: document.title,
      versions,
    };
  });
};

const uploadDocumentVersion = async (documentIdValue, file, demoUserId) => {
  const documentId = parsePositiveId(documentIdValue, "document ID");
  const userId = parseDemoUserId(demoUserId);
  validateVersionFile(file);
  const contentSha256 = await hashUploadedFile(file);

  const client = await repository.pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const viewer = await repository.findUserById(client, userId);

    if (!viewer) {
      throw httpError(404, "Demo user not found.");
    }

    const lockedDocument = await repository.lockDocument(client, documentId);

    if (!lockedDocument) {
      throw httpError(404, "Document not found.");
    }

    const document = await repository.findAccessibleDocumentById(
      client,
      documentId,
      userId
    );

    if (!document) {
      throw httpError(404, "Document not found.");
    }

    await repository.lockContentHash(client, contentSha256);
    const duplicateVersion = await repository.findDocumentVersionByHash(
      client,
      documentId,
      contentSha256
    );

    if (duplicateVersion) {
      throw httpError(409, "This file is identical to an existing version of the document.");
    }

    const versionNumber = await repository.findNextVersionNumber(
      client,
      documentId
    );

    const version = await repository.insertVersion(client, {
      documentId,
      versionNumber,
      filePath: `uploads/${file.filename}`,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      contentSha256,
    });

    await client.query("COMMIT");
    transactionStarted = false;

    return {
      documentId,
      version: version.version_number,
      originalFilename: version.original_filename,
      mimeType: version.mime_type,
      fileSize: version.file_size,
      uploadedAt: version.uploaded_at,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
};

const createDocument = async (data, file, demoUserId) => {
  // 1. Validate the document's title
  const title = typeof data.title === "string"
    ? data.title.trim()
    : "";

  if (!title) {
    throw httpError(400, "Document title is required.");
  }

  if (title.length > 255) {
    throw httpError(400, "Document title must be 255 characters or fewer.");
  }

  // 2. Validate the uploader
  const uploaderId = Number(data.uploaderId);
  const selectedDemoUserId = parseDemoUserId(demoUserId);

  if (!Number.isSafeInteger(uploaderId) || uploaderId <= 0) {
    throw httpError(400, "A valid uploader ID is required.");
  }

  if (uploaderId !== selectedDemoUserId) {
    throw httpError(403, "Uploader ID must match the selected demo user.");
  }

  // 3. Validate the restriction setting
  if (data.isRestricted !== undefined &&
      data.isRestricted !== "true" &&
      data.isRestricted !== "false" &&
      data.isRestricted !== true &&
      data.isRestricted !== false) {
    throw httpError(400, "isRestricted must be true or false.");
  }

  const isRestricted = data.isRestricted === "true" || data.isRestricted === true;

  // 4. Convert comma-separated tags into an array
  const tags = typeof data.tags === "string"
    ? [...new Set(
        data.tags.split(",")
          .map(tag => tag.trim().toLowerCase())
          .filter(Boolean)
      )]
    : [];

  if (tags.some(tag => tag.length > 100)) {
    throw httpError(400, "Each tag must be 100 characters or fewer.");
  }

  // 5. Convert department IDs into an array
  const rawDepartmentIds = Array.isArray(data.departmentIds)
    ? data.departmentIds
    : typeof data.departmentIds === "string"
      ? data.departmentIds.split(",")
      : [];

  const departmentIds = rawDepartmentIds
    .map(id => Number(String(id).trim()));

  if (rawDepartmentIds.some(id => String(id).trim() === "")) {
    throw httpError(400, "Department IDs must be positive integers.");
  }

  if (
    departmentIds.some(id => !Number.isSafeInteger(id) || id <= 0) ||
    new Set(departmentIds).size !== departmentIds.length
  ) {
    throw httpError(400, "Department IDs must be unique positive integers.");
  }

  if (isRestricted && departmentIds.length === 0) {
    throw httpError(
      400,
      "Restricted documents must have at least one allowed department."
    );
  }

  if (!isRestricted && departmentIds.length > 0) {
    throw httpError(
      400,
      "Department permissions are only needed for restricted documents."
    );
  }

  if (!file || !file.filename || !file.originalname || !Number.isSafeInteger(file.size)) {
    throw httpError(400, "A valid uploaded file is required.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw httpError(413, "The uploaded file exceeds the maximum size of 25 MB.");
  }

  const contentSha256 = await hashUploadedFile(file);

  // 6. Begin a database transaction
  const client = await repository.pool.connect();

  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const uploader = await repository.findUserById(client, uploaderId);

    if (!uploader) {
      throw httpError(404, "Uploader not found.");
    }

    await repository.lockContentHash(client, contentSha256);
    const duplicate = await repository.findAccessibleDuplicateByHash(
      client,
      contentSha256,
      selectedDemoUserId
    );

    if (duplicate) {
      throw duplicateDocumentError(duplicate);
    }

    if (departmentIds.length > 0) {
      const departments = await repository.findDepartmentsByIds(
        client,
        departmentIds
      );

      if (departments.length !== departmentIds.length) {
        throw httpError(400, "One or more departments do not exist.");
      }
    }

    // 7. Save the document
    const document = await repository.insertDocument(client, {
      title,
      description: typeof data.description === "string"
        ? data.description.trim()
        : "",
      uploaderId,
      isRestricted,
    });

    // 8. Save version 1
    const version = await repository.insertVersion(client, {
      documentId: document.id,
      filePath: `uploads/${file.filename}`,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      contentSha256,
    });

    // 9. Save tags
    for (const tagName of tags) {
      const tagId = await repository.findOrCreateTag(client, tagName);

      await repository.insertDocumentTag(
        client,
        document.id,
        tagId
      );
    }

    // 10. Save department permissions
    for (const departmentId of departmentIds) {
      await repository.insertDocumentPermission(
        client,
        document.id,
        departmentId
      );
    }

    // 11. Confirm all database changes
    await client.query("COMMIT");

    return {
      id: document.id,
      title: document.title,
      description: document.description,
      uploaderId,
      tags,
      isRestricted,
      departmentIds,
      version: version.version_number,
      originalFilename: file.originalname,
      fileSize: file.size,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back document transaction:", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createDocument,
  searchDocuments,
  getDocument,
  getDocumentDownload,
  getVersionHistory,
  uploadDocumentVersion,
};
