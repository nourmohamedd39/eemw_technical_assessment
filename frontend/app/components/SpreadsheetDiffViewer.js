import { useState } from "react";
import ChangeSummary from "./ChangeSummary";

export default function SpreadsheetDiffViewer({ comparison }) {
  const [changedOnly, setChangedOnly] = useState(false);
  const changes = changedOnly
    ? comparison.changes.filter((change) => change.type === "changed")
    : comparison.changes;
  const sheets = [...new Set(changes.map((change) => change.sheet))];

  return (
    <div className="spreadsheet-diff-viewer">
      <ChangeSummary comparison={comparison} />
      {(comparison.addedSheets.length > 0 || comparison.removedSheets.length > 0) && (
        <div className="spreadsheet-sheet-changes">
          <strong>Worksheet changes</strong>
          {comparison.addedSheets.map((sheet) => <span className="spreadsheet-sheet added" key={`added-${sheet}`}>+ Sheet added: {sheet}</span>)}
          {comparison.removedSheets.map((sheet) => <span className="spreadsheet-sheet removed" key={`removed-${sheet}`}>− Sheet removed: {sheet}</span>)}
        </div>
      )}
      <div className="spreadsheet-filter" role="group" aria-label="Spreadsheet change filter">
        <span>Show</span>
        <button type="button" className={!changedOnly ? "active" : ""} onClick={() => setChangedOnly(false)}>All cell changes</button>
        <button type="button" className={changedOnly ? "active" : ""} onClick={() => setChangedOnly(true)}>Modified cells only</button>
      </div>
      {changes.length > 0 ? (
        <div className="spreadsheet-table-wrap">
          <table className="spreadsheet-table">
            <caption className="sr-only">Spreadsheet cell changes</caption>
            <thead><tr><th>Worksheet</th><th>Cell</th><th>Change</th><th>Previous value</th><th>New value</th></tr></thead>
            <tbody>
              {sheets.flatMap((sheet) => changes.filter((change) => change.sheet === sheet)).map((change) => (
                <tr className={`spreadsheet-${change.type}`} key={`${change.sheet}-${change.cell}`}>
                  <td>{change.sheet}</td><td>{change.cell}</td><td>{change.type}</td>
                  <td>{change.oldValue ?? "—"}</td><td>{change.newValue ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="comparison-empty">No cell changes match this filter.</p>}
    </div>
  );
}
