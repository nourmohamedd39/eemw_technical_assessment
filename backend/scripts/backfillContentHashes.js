require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const pool = require("../src/config/db");
const { hashFile } = require("../src/utils/fileHasher");

const uploadDirectory = process.env.UPLOAD_DIRECTORY
  ? path.resolve(process.env.UPLOAD_DIRECTORY)
  : path.resolve(__dirname, "../uploads");

const resolveStoredPath = (storedPath) => {
  const storedFilename = path.basename(storedPath || "");
  const filePath = path.resolve(uploadDirectory, storedFilename);
  const relativePath = path.relative(uploadDirectory, filePath);

  if (!storedFilename || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
};

const run = async () => {
  const result = await pool.query(
    `SELECT id, file_path
     FROM document_versions
     WHERE content_sha256 IS NULL
     ORDER BY id`
  );
  let updated = 0;
  let skipped = 0;

  for (const version of result.rows) {
    const filePath = resolveStoredPath(version.file_path);

    if (!filePath) {
      skipped += 1;
      continue;
    }

    try {
      await fs.access(filePath);
      const contentSha256 = await hashFile(filePath);
      await pool.query(
        `UPDATE document_versions
         SET content_sha256 = $1
         WHERE id = $2 AND content_sha256 IS NULL`,
        [contentSha256, version.id]
      );
      updated += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`Skipped version ${version.id}: ${error.message}`);
    }
  }

  console.log(`Content hash backfill complete. Updated: ${updated}; skipped: ${skipped}.`);
};

run()
  .catch((error) => {
    console.error("Content hash backfill failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
