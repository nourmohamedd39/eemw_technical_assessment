const fs = require("fs/promises");
const XLSX = require("xlsx");
const { MAX_WORKBOOK_CELLS, MAX_WORKBOOK_SHEETS, boundedError } = require("../limits");

const cellValue = (value) => {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
};

const extractXlsx = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: true, cellDates: true });

  if (workbook.SheetNames.length > MAX_WORKBOOK_SHEETS) {
    throw boundedError(`Workbook comparison is limited to ${MAX_WORKBOOK_SHEETS} worksheets.`);
  }

  const sheets = [];
  let totalCells = 0;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const cells = {};
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      totalCells += 1;
      if (totalCells > MAX_WORKBOOK_CELLS) {
        throw boundedError(`Workbook comparison is limited to ${MAX_WORKBOOK_CELLS.toLocaleString()} cells.`);
      }
      const entry = sheet[address];
      cells[address] = {
        value: cellValue(entry.v),
        formula: entry.f ? String(entry.f) : null,
      };
    }
    sheets.push({ name, cells });
  }

  return { type: "spreadsheet", sheets };
};

module.exports = { extractXlsx };
