export default function ComparisonControls({
  versions,
  fromVersion,
  toVersion,
  onFromChange,
  onToChange,
  onCompare,
  loading,
}) {
  return (
    <form className="comparison-form" onSubmit={onCompare}>
      <label>
        <span>From version</span>
        <select value={fromVersion} onChange={(event) => onFromChange(event.target.value)}>
          {versions.map((version) => (
            <option key={version.id} value={version.version_number} disabled={String(version.version_number) === String(toVersion)}>
              Version {version.version_number} · {version.original_filename}
            </option>
          ))}
        </select>
      </label>
      <span className="comparison-direction" aria-hidden="true">→</span>
      <label>
        <span>To version</span>
        <select value={toVersion} onChange={(event) => onToChange(event.target.value)}>
          {versions.map((version) => (
            <option key={version.id} value={version.version_number} disabled={String(version.version_number) === String(fromVersion)}>
              Version {version.version_number} · {version.original_filename}
            </option>
          ))}
        </select>
      </label>
      <button className="secondary-button compare-button" type="submit" disabled={loading}>
        {loading ? "Comparing…" : "Compare versions"}
      </button>
    </form>
  );
}
