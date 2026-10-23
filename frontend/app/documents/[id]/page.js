"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../../components/AppHeader";
import VersionComparison from "../../components/VersionComparison";
import VersionUpload from "../../components/VersionUpload";
import { useDemoUser } from "../../components/DemoUserContext";
import useRecentlyViewed from "../../hooks/useRecentlyViewed";
import { apiRequest, formatBytes } from "../../../lib/api";

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id;
  const { demoUserId } = useDemoUser();
  const { recordViewed } = useRecentlyViewed(demoUserId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!documentId) return undefined;
    let active = true;
    setLoading(true);
    setError("");

    apiRequest(`/documents/${documentId}`, { demoUserId })
      .then((response) => response.json())
      .then((payload) => { if (active) setData(payload); })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load this document."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [documentId, demoUserId, refreshKey]);

  useEffect(() => {
    if (data?.document?.id && !loading && !error) recordViewed(data.document.id);
  }, [data, error, loading, recordViewed]);

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
      <AppHeader />
      <div className="detail-content">
        <Link href="/documents" className="back-link">Back</Link>

        {loading && <div className="panel loading-card" role="status">Loading document details...</div>}
        {error && !loading && <div className="panel error-panel" role="alert"><p className="eyebrow">Unable to open document</p><h1>{error}</h1><p>Try selecting a different demo user or return to the repository.</p><Link className="secondary-button inline-button" href="/documents">Return to documents</Link></div>}

        {data && !loading && !error && (
          <>
            <section className="detail-hero">
              <div className="detail-hero-copy">
                <p className="eyebrow">Document details</p>
                <h1>{data.document.title}</h1>
                <p>{data.document.description || "No description was provided for this document."}</p>
              </div>
              <button className="primary-button download-button" type="button" onClick={downloadDocument} disabled={downloading}>
                {downloading ? "Preparing download..." : "Download latest"}
              </button>
            </section>

            <section className="detail-grid" aria-label="Document information and version history">
              <div className="panel information-panel">
                <div className="panel-heading"><div><p className="eyebrow">Key details</p><h2>Document information</h2></div><span className="panel-icon" aria-hidden="true">&#9678;</span></div>
                <dl className="metadata-list">
                  <div><dt>Uploaded by</dt><dd>{data.document.uploaderName}<small>{data.document.uploaderEmail}</small></dd></div>
                  <div><dt>Original filename</dt><dd>{data.document.latestFilename}</dd></div>
                  <div><dt>Current version</dt><dd>Version {data.document.latestVersion}</dd></div>
                  <div><dt>File size</dt><dd>{formatBytes(data.document.latestFileSize)}</dd></div>
                  <div><dt>Access</dt><dd><span className={data.document.isRestricted ? "status-pill restricted" : "status-pill"}>{data.document.isRestricted ? "Restricted" : "All departments"}</span></dd></div>
                </dl>
                <div className="detail-section"><h3>Tags</h3><div className="tag-row">{(data.tags || []).length ? data.tags.map((tag) => <em key={tag.id}>{tag.name}</em>) : <span className="muted">No tags</span>}</div></div>
              </div>

              <div className="panel versions-panel">
                <div className="panel-heading"><div><p className="eyebrow">Document history</p><h2>Version history</h2></div><span className="version-count">{data.versions.length} {data.versions.length === 1 ? "version" : "versions"}</span></div>
                <p className="version-note">Previous versions are retained for reference. Only the latest version is downloadable.</p>
                <div className="version-list">{data.versions.map((version, index) => <div className={`version-row ${index === 0 ? "current-version" : ""}`} key={version.id}><span className="version-number">v{version.version_number}</span><span className="version-info"><strong title={version.original_filename}>{version.original_filename}</strong><small>{formatBytes(version.file_size)} &middot; {new Date(version.uploaded_at).toLocaleString()}</small></span>{index === 0 && <span className="current-label">Current</span>}</div>)}</div>
                <VersionUpload documentId={documentId} demoUserId={demoUserId} onUploaded={() => setRefreshKey((key) => key + 1)} />
              </div>
            </section>

            {data.versions.length >= 2 && <section className="panel comparison-card" aria-labelledby="comparison-heading">
              <div className="comparison-heading"><div><p className="eyebrow">Review changes</p><h2 id="comparison-heading">Compare versions</h2></div><p>Select two compatible versions to review what changed.</p></div>
              <VersionComparison documentId={documentId} versions={data.versions} demoUserId={demoUserId} />
            </section>}
          </>
        )}
      </div>
      <footer className="footer-note">Unpile &middot; Document access is controlled by the selected demo user.</footer>
    </main>
  );
}
