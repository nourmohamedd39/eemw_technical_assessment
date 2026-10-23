"use client";

import { useEffect, useState } from "react";
import { compareDocumentVersions } from "../../lib/api";

const renderLines = (lines, className) => <pre className={`comparison-lines ${className}`}>{lines.join("\n")}</pre>;

export default function VersionComparison({ documentId, versions, demoUserId }) {
  const [fromVersion, setFromVersion] = useState("");
  const [toVersion, setToVersion] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (versions.length >= 2) {
      setFromVersion(String(versions[1].version_number));
      setToVersion(String(versions[0].version_number));
    }
  }, [versions]);

  const compare = async (event) => {
    event.preventDefault();
    setError("");
    setComparison(null);
    if (!fromVersion || !toVersion || fromVersion === toVersion) {
      setError("Choose two different versions to compare.");
      return;
    }

    setLoading(true);
    try {
      setComparison(await compareDocumentVersions(documentId, fromVersion, toVersion, demoUserId));
    } catch (comparisonError) {
      setError(comparisonError.message || "Unable to compare these versions.");
    } finally {
      setLoading(false);
    }
  };

  if (versions.length < 2) {
    return <p className="comparison-note">Add another TXT version to compare document changes.</p>;
  }

  return (
    <div className="comparison-panel">
      <form className="comparison-form" onSubmit={compare}>
        <label><span>From</span><select value={fromVersion} onChange={(event) => setFromVersion(event.target.value)}>{versions.map((version) => <option key={version.id} value={version.version_number}>Version {version.version_number}</option>)}</select></label>
        <label><span>To</span><select value={toVersion} onChange={(event) => setToVersion(event.target.value)}>{versions.map((version) => <option key={version.id} value={version.version_number}>Version {version.version_number}</option>)}</select></label>
        <button className="secondary-button compare-button" type="submit" disabled={loading}>{loading ? "Comparing..." : "Compare versions"}</button>
      </form>
      {error && <p className="alert error" role="alert">{error}</p>}
      {comparison && <div className="comparison-result" aria-live="polite"><p className="comparison-summary">Comparing version {comparison.fromVersion} with version {comparison.toVersion}</p>{comparison.changes.map((change, index) => <section className={`comparison-block ${change.type}`} key={`${change.type}-${index}`}><strong>{change.type === "unchanged" ? "Unchanged" : change.type === "added" ? "Added" : change.type === "removed" ? "Removed" : "Changed"}</strong>{change.type === "changed" ? <><div className="comparison-sub-block"><span className="comparison-sub-label">Removed</span>{renderLines(change.removed, "removed")}</div><div className="comparison-sub-block"><span className="comparison-sub-label">Added</span>{renderLines(change.added, "added")}</div></> : renderLines(change.lines, change.type)}</section>)}{comparison.changes.length === 0 && <p className="muted">No differences were found.</p>}</div>}
    </div>
  );
}
