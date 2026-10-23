import ChangeSummary from "./ChangeSummary";

const lineRows = (lines, type, prefix) => lines.map((line, index) => (
  <div className={`diff-line ${type}`} key={`${prefix}-${index}`}>
    <span className="diff-marker" aria-hidden="true">{type === "added" ? "+" : "−"}</span>
    <span>{line || " "}</span>
  </div>
));

const changeBlock = (change, index) => {
  if (change.type === "changed") {
    return (
      <section className="diff-block replacement" key={`changed-${index}`} aria-label={`Modified section ${index + 1}`}>
        <div className="diff-block-label">Modified section {index + 1}</div>
        {lineRows(change.removed, "removed", `changed-removed-${index}`)}
        {lineRows(change.added, "added", `changed-added-${index}`)}
      </section>
    );
  }

  if (change.type === "unchanged") {
    return <section className="diff-block unchanged" key={`unchanged-${index}`}>{lineRows(change.lines, "unchanged", `unchanged-${index}`)}</section>;
  }

  return <section className="diff-block" key={`${change.type}-${index}`}>{lineRows(change.lines, change.type, `${change.type}-${index}`)}</section>;
};

export default function TextDiffViewer({ comparison, showAll }) {
  const visibleChanges = showAll
    ? comparison.changes
    : comparison.changes.filter((change) => change.type !== "unchanged");

  return (
    <div className="text-diff-viewer">
      <ChangeSummary comparison={comparison} />
      {!showAll && comparison.changes.some((change) => change.type === "unchanged") && (
        <p className="diff-context-note">Unchanged lines are hidden in Changes only mode.</p>
      )}
      {visibleChanges.length > 0
        ? <div className="diff-blocks">{visibleChanges.map(changeBlock)}</div>
        : <p className="comparison-empty">No differences were found between these versions.</p>}
    </div>
  );
}
