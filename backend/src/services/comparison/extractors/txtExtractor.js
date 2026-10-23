const fs = require("fs/promises");
const { assertExtractedTextSize } = require("../limits");

const extractTxt = async (filePath) => {
  const text = await fs.readFile(filePath, "utf8");
  assertExtractedTextSize(text, "TXT content");
  return { type: "text", text: text.replace(/\r\n/g, "\n") };
};

module.exports = { extractTxt };
