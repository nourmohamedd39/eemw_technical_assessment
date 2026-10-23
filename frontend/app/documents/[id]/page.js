"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DemoUserPicker from "../../components/DemoUserPicker";
import { apiRequest, formatBytes } from "../../../lib/api";

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id;
  const [demoUserId, setDemoUserId] = useState("1");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    let active = true;
    setLoading(true);
    setError("");
    apiRequest(`/documents/${documentId}`, { demoUserId })
      .then((response) => response.json())
      .then((payload) => { if (active) setData(payload); })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load this document."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId, demoUserId]);

  const downloadDocument = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await apiRequest(`/documents/${documentId}/download`, { demoUserId });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = data.document.latestFilename || "document-download";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download this document.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="app-shell detail-shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">DD</span><span><strong>DigiDocs</strong><small>Corporate document workspace</small></span></Link>
        <DemoUserPicker value={demoUserId} onChange={setDemoUserId} />
      </header>
      <div className="detail-content">
        <Link href="/" className="back-link">← Back to repository</Link>
        {loading && <div className="panel loading-card">Loading document details…</div>}
        {error && !loading && <div className="panel error-panel" role="alert"><p className="eyebrow">Access or request error</p><h1>{error}</h1><p>Try selecting a different demo user or return to the repository.</p><Link className="secondary-button inline-button" href="/">Return to search</Link></div>}
        {data && !loading && !error && (
          <>
            <section className="detail-hero">
              <div><p className="eyebrow">Document details</p><h1>{data.document.title}</h1><p>{data.document.description || "No description was provided for this document."}</p></div>
              <button className="primary-button download-button" type="button" onClick={downloadDocument} disabled={downloading}>{downloading ? "Preparing download…" : "↓ Download latest"}</button>
            </section>
            <section className="detail-grid">
              <div className="panel metadata-panel"><div className="panel-heading"><div><p className="eyebrow">At a glance</p><h2>Metadata</h2></div><span className="panel-icon">◈</span></div><dl className="metadata-list"><div><dt>Uploader</dt><dd>{data.document.uploaderName}<small>{data.document.uploaderEmail}</small></dd></div><div><dt>Current version</dt><dd>Version {data.document.latestVersion}<small>{data.document.latestFilename}</small></dd></div><div><dt>File size</dt><dd>{formatBytes(data.document.latestFileSize)}</dd></div><div><dt>Access</dt><dd><span className={data.document.isRestricted ? "status-pill restricted" : "status-pill"}>{data.document.isRestricted ? "Restricted" : "All departments"}</span></dd></div></dl><div className="detail-section"><h3>Tags</h3><div className="tag-row">{(data.tags || []).length ? data.tags.map((tag) => <em key={tag.id}>{tag.name}</em>) : <span className="muted">No tags</span>}</div></div><div className="detail-section"><h3>Allowed departments</h3><div className="tag-row">{(data.permissions || []).length ? data.permissions.map((department) => <em key={department.id}>{department.name}</em>) : <span className="muted">Everyone</span>}</div></div></div>
              <div className="panel versions-panel"><div className="panel-heading"><div><p className="eyebrow">Audit trail</p><h2>Version history</h2></div><span className="version-count">{data.versions.length} total</span></div><div className="version-list">{data.versions.map((version, index) => <div className={`version-row ${index === 0 ? "current-version" : ""}`} key={version.id}><span className="version-number">v{version.version_number}</span><span className="version-info"><strong>{version.original_filename}</strong><small>{formatBytes(version.file_size)} · {new Date(version.uploaded_at).toLocaleString()}</small></span>{index === 0 && <span className="current-label">Current</span>}</div>)}</div></div>
            </section>
          </>
        )}
      </div>
      <footer className="footer-note">DigiDocs · Document access is controlled by the selected demo user.</footer>
    </main>
  );
}
