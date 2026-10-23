const path = require("path");

const SUPPORTED_FORMATS = new Set(["txt", "docx", "pdf", "xlsx"]);

const getFormat = (filename) => path.extname(filename || "").toLowerCase().slice(1);

const assertSupportedFormat = (filename) => {
  const format = getFormat(filename);
  if (!SUPPORTED_FORMATS.has(format)) {
    const error = new Error("Comparison is supported for TXT, DOCX, PDF, and XLSX files only.");
    error.status = 415;
    throw error;
  }
  return format;
};

module.exports = { SUPPORTED_FORMATS, getFormat, assertSupportedFormat };
