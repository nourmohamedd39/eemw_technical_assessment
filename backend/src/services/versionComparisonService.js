const path = require("path");
const repository = require("../repositories/documentRepository");
const { compareText } = require("../utils/textDiff");
const { assertSupportedFormat, getFormat } = require("./comparison/format");
const { MAX_COMPARISON_FILE_SIZE } = require("./comparison/limits");
const { extractTxt } = require("./comparison/extractors/txtExtractor");
const { extractDocx } = require("./comparison/extractors/docxExtractor");
const { extractPdf } = require("./comparison/extractors/pdfExtractor");
const { extractXlsx } = require("./comparison/extractors/xlsxExtractor");
const { compareSheets } = require("./comparison/spreadsheetDiff");

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

const extractors = { txt: extractTxt, docx: extractDocx, pdf: extractPdf, xlsx: extractXlsx };

const extractVersion = async (version, format) => {
  if (Number(version.file_size) > MAX_COMPARISON_FILE_SIZE) {
    throw httpError(413, `Comparison is limited to files of ${MAX_COMPARISON_FILE_SIZE / (1024 * 1024)} MB or less.`);
  }

  try {
    return await extractors[format](resolveStoredPath(version.file_path));
  } catch (error) {
    if (error.status) throw error;
    throw httpError(422, `The ${format.toUpperCase()} version could not be read or parsed.`);
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
    const fromFormat = assertSupportedFormat(from.original_filename);
    const toFormat = assertSupportedFormat(to.original_filename);

    if (fromFormat !== toFormat) {
      throw httpError(415, "Only versions with the same file format can be compared.");
    }

    const [fromContent, toContent] = await Promise.all([
      extractVersion(from, fromFormat),
      extractVersion(to, toFormat),
    ]);

    if (fromContent.type === "spreadsheet") {
      const spreadsheet = compareSheets(fromContent, toContent);
      return {
        documentId,
        format: fromFormat,
        comparisonType: "spreadsheet",
        fromVersion,
        toVersion,
        ...spreadsheet,
        summary: {
          addedSheets: spreadsheet.addedSheets.length,
          removedSheets: spreadsheet.removedSheets.length,
          changedCells: spreadsheet.changes.filter((change) => change.type === "changed").length,
          addedCells: spreadsheet.changes.filter((change) => change.type === "added").length,
          removedCells: spreadsheet.changes.filter((change) => change.type === "removed").length,
        },
      };
    }

    const changes = compareText(fromContent.text, toContent.text);
    return {
      documentId,
      format: fromFormat,
      comparisonType: "text",
      fromVersion,
      toVersion,
      changes,
      summary: {
        added: changes.filter((change) => change.type === "added").length,
        removed: changes.filter((change) => change.type === "removed").length,
        changed: changes.filter((change) => change.type === "changed").length,
        unchanged: changes.filter((change) => change.type === "unchanged").length,
      },
    };
  } finally {
    client.release();
  }
};

module.exports = { compareVersions, resolveStoredPath, getFormat };
