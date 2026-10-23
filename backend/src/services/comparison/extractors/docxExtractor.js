const fs = require("fs/promises");
const mammoth = require("mammoth");
const { assertExtractedTextSize } = require("../limits");

const extractDocx = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.replace(/\r\n/g, "\n").trimEnd();
  assertExtractedTextSize(text, "DOCX content");
  return { type: "text", text };
};

module.exports = { extractDocx };
