"use client";

import { useEffect, useState } from "react";
import { compareDocumentVersions } from "../../lib/api";
import ComparisonControls from "./ComparisonControls";
import SpreadsheetDiffViewer from "./SpreadsheetDiffViewer";
import TextDiffViewer from "./TextDiffViewer";

export default function VersionComparison({ documentId, versions, demoUserId }) {
  const [fromVersion, setFromVersion] = useState("");
  const [toVersion, setToVersion] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("changes");

  useEffect(() => {
    if (versions.length >= 2) {
      setFromVersion(String(versions[1].version_number));
      setToVersion(String(versions[0].version_number));
      setComparison(null);
      setError("");
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
    return null;
  }

  return (
    <div className="comparison-panel">
      <ComparisonControls versions={versions} fromVersion={fromVersion} toVersion={toVersion} onFromChange={(value) => { setFromVersion(value); setComparison(null); }} onToChange={(value) => { setToVersion(value); setComparison(null); }} onCompare={compare} loading={loading} />
      {error && <p className="alert error" role="alert">{error}</p>}
      {comparison && <div className="comparison-result" aria-live="polite">
        <div className="comparison-result-heading">
          <p>Version {comparison.fromVersion} → version {comparison.toVersion} · {comparison.format.toUpperCase()}</p>
          {comparison.comparisonType === "text" && <div className="comparison-view-toggle" role="group" aria-label="Comparison view">
            <button type="button" className={viewMode === "changes" ? "active" : ""} onClick={() => setViewMode("changes")}>Changes only</button>
            <button type="button" className={viewMode === "full" ? "active" : ""} onClick={() => setViewMode("full")}>Full comparison</button>
          </div>}
        </div>
        {comparison.comparisonType === "spreadsheet" ? <SpreadsheetDiffViewer comparison={comparison} /> : <TextDiffViewer comparison={comparison} showAll={viewMode === "full"} />}
      </div>}
    </div>
  );
}
