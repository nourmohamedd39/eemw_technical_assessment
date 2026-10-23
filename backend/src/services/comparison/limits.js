const MAX_COMPARISON_FILE_SIZE = 5 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 500000;
const MAX_WORKBOOK_SHEETS = 100;
const MAX_WORKBOOK_CELLS = 100000;

const boundedError = (message) => {
  const error = new Error(message);
  error.status = 413;
  return error;
};

const assertExtractedTextSize = (text, label) => {
  if (text.length > MAX_EXTRACTED_CHARACTERS) {
    throw boundedError(`${label} exceeds the ${MAX_EXTRACTED_CHARACTERS.toLocaleString()} character comparison limit.`);
  }
};

module.exports = {
  MAX_COMPARISON_FILE_SIZE,
  MAX_EXTRACTED_CHARACTERS,
  MAX_WORKBOOK_SHEETS,
  MAX_WORKBOOK_CELLS,
  boundedError,
  assertExtractedTextSize,
};
