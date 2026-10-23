const textCounts = (changes) => changes.reduce((counts, change) => {
  if (change.type === "added") counts.added += change.lines.length;
  if (change.type === "removed") counts.removed += change.lines.length;
  if (change.type === "changed") {
    counts.added += change.added.length;
    counts.removed += change.removed.length;
    counts.modified += 1;
  }
  if (change.type === "unchanged") counts.unchanged += change.lines.length;
  return counts;
}, { added: 0, removed: 0, modified: 0, unchanged: 0 });

export function getTextCounts(changes) {
  return textCounts(changes);
}

export default function ChangeSummary({ comparison }) {
  if (comparison.comparisonType === "spreadsheet") {
    const { summary } = comparison;
    return (
      <div className="change-summary" aria-label="Change summary">
        <div className="change-stat added"><strong>{summary.addedCells}</strong><span>cells added</span></div>
        <div className="change-stat removed"><strong>{summary.removedCells}</strong><span>cells removed</span></div>
        <div className="change-stat changed"><strong>{summary.changedCells}</strong><span>cells changed</span></div>
        {summary.addedSheets > 0 && <div className="change-stat neutral"><strong>{summary.addedSheets}</strong><span>sheets added</span></div>}
        {summary.removedSheets > 0 && <div className="change-stat neutral"><strong>{summary.removedSheets}</strong><span>sheets removed</span></div>}
      </div>
    );
  }

  const counts = textCounts(comparison.changes);
  return (
    <div className="change-summary" aria-label="Change summary">
      <div className="change-stat added"><strong>{counts.added}</strong><span>lines added</span></div>
      <div className="change-stat removed"><strong>{counts.removed}</strong><span>lines removed</span></div>
      {counts.modified > 0 && <div className="change-stat changed"><strong>{counts.modified}</strong><span>sections modified</span></div>}
      <div className="change-stat neutral"><strong>{counts.unchanged}</strong><span>unchanged lines</span></div>
    </div>
  );
}
