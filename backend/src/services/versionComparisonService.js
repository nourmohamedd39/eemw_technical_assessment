const fs = require("fs/promises");
const path = require("path");
const repository = require("../repositories/documentRepository");
const { compareText } = require("../utils/textDiff");

const MAX_COMPARISON_FILE_SIZE = 5 * 1024 * 1024;

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw httpError(400, `A valid ${fieldName} is required.`);
  }
  return parsed;
};

const resolveStoredPath = (storedPath) => {
  const uploadDirectory = process.env.UPLOAD_DIRECTORY
    ? path.resolve(process.env.UPLOAD_DIRECTORY)
    : path.resolve(__dirname, "../..", "uploads");
  const filePath = path.resolve(uploadDirectory, path.basename(storedPath || ""));
  const relativePath = path.relative(uploadDirectory, filePath);

  if (!storedPath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw httpError(500, "Stored document path is invalid.");
  }

  return filePath;
};

const readTxtVersion = async (version) => {
  if (path.extname(version.original_filename).toLowerCase() !== ".txt") {
    throw httpError(415, "Stage 1 comparison supports TXT versions only.");
  }

  if (version.file_size > MAX_COMPARISON_FILE_SIZE) {
    throw httpError(413, "TXT comparison is limited to files of 5 MB or less.");
  }

  try {
    const filePath = resolveStoredPath(version.file_path);
    const file = await fs.readFile(filePath, "utf8");
    return file;
  } catch (error) {
    if (error.status) throw error;
    throw httpError(404, "A version file could not be read.");
  }
};

const compareVersions = async (documentIdValue, query, demoUserIdValue) => {
  const documentId = parsePositiveInteger(documentIdValue, "document ID");
  const userId = parsePositiveInteger(demoUserIdValue, "demo user ID");
  const fromVersion = parsePositiveInteger(query.fromVersion, "from version");
  const toVersion = parsePositiveInteger(query.toVersion, "to version");

  if (fromVersion === toVersion) {
    throw httpError(400, "Choose two different versions to compare.");
  }

  const client = await repository.pool.connect();
  try {
    const viewer = await repository.findUserById(client, userId);
    if (!viewer) throw httpError(404, "Demo user not found.");

    const versions = await repository.findAccessibleVersionsForComparison(
      client,
      documentId,
      userId,
      [fromVersion, toVersion]
    );

    if (versions.length !== 2) {
      throw httpError(404, "Document or requested versions not found.");
    }

    const from = versions.find((version) => version.version_number === fromVersion);
    const to = versions.find((version) => version.version_number === toVersion);
    const [fromText, toText] = await Promise.all([
      readTxtVersion(from),
      readTxtVersion(to),
    ]);

    return {
      documentId,
      format: "txt",
      fromVersion,
      toVersion,
      changes: compareText(fromText, toText),
    };
  } finally {
    client.release();
  }
};

module.exports = { compareVersions };
