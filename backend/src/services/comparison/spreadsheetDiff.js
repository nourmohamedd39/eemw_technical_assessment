const compareSheets = (fromWorkbook, toWorkbook) => {
  const fromSheets = new Map(fromWorkbook.sheets.map((sheet) => [sheet.name, sheet]));
  const toSheets = new Map(toWorkbook.sheets.map((sheet) => [sheet.name, sheet]));
  const addedSheets = toWorkbook.sheets.filter((sheet) => !fromSheets.has(sheet.name)).map((sheet) => sheet.name);
  const removedSheets = fromWorkbook.sheets.filter((sheet) => !toSheets.has(sheet.name)).map((sheet) => sheet.name);
  const changes = [];

  for (const sheetName of new Set([...fromSheets.keys(), ...toSheets.keys()])) {
    const fromCells = fromSheets.get(sheetName)?.cells || {};
    const toCells = toSheets.get(sheetName)?.cells || {};
    for (const address of new Set([...Object.keys(fromCells), ...Object.keys(toCells)])) {
      const previous = fromCells[address];
      const current = toCells[address];
      if (!previous && current) {
        changes.push({ type: "added", sheet: sheetName, cell: address, oldValue: null, newValue: current.value, oldFormula: null, newFormula: current.formula });
      } else if (previous && !current) {
        changes.push({ type: "removed", sheet: sheetName, cell: address, oldValue: previous.value, newValue: null, oldFormula: previous.formula, newFormula: null });
      } else if (previous.value !== current.value || previous.formula !== current.formula) {
        changes.push({ type: "changed", sheet: sheetName, cell: address, oldValue: previous.value, newValue: current.value, oldFormula: previous.formula, newFormula: current.formula });
      }
    }
  }

  return { addedSheets, removedSheets, changes };
};

module.exports = { compareSheets };
