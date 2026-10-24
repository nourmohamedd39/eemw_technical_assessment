"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../../components/AppHeader";
import VersionComparison from "../../components/VersionComparison";
import VersionUpload from "../../components/VersionUpload";
import { useDemoUser } from "../../components/DemoUserContext";
import useRecentlyViewed from "../../hooks/useRecentlyViewed";
import { apiRequest, downloadDocumentVersion, formatBytes } from "../../../lib/api";

const formatRole = (role) => role
  ? role.charAt(0).toUpperCase() + role.slice(1)
  : "Not available";

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id;
  const { demoUserId } = useDemoUser();
  const { recordViewed } = useRecentlyViewed(demoUserId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingVersion, setDownloadingVersion] = useState(null);
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

  const downloadVersion = async (version) => {
    setDownloadingVersion(version.version_number);
    setError("");
    try {
      const response = await downloadDocumentVersion(documentId, version.version_number, demoUserId);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = version.original_filename || `document-v${version.version_number}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download this version.");
    } finally {
      setDownloadingVersion(null);
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
                <h1>{data.document.title}</h1>
                {data.document.description && <p>{data.document.description}</p>}
              </div>
              <button className="primary-button download-button" type="button" onClick={downloadDocument} disabled={downloading}>
                {downloading ? "Preparing download..." : "Download latest"}
              </button>
            </section>

            <section className="detail-grid" aria-label="Document information and version history">
              <div className="panel information-panel">
                <div className="panel-heading"><h2>Details</h2></div>
                <dl className="metadata-list">
                  <div><dt>Uploaded by</dt><dd>{data.document.uploaderName || "Not available"}</dd></div>
                  <div><dt>Uploader department</dt><dd>{data.document.uploaderDepartment || "Not available"}</dd></div>
                  <div><dt>Uploader role</dt><dd>{formatRole(data.document.uploaderRole)}</dd></div>
                  <div><dt>Original filename</dt><dd>{data.document.latestFilename}</dd></div>
                  <div><dt>File size</dt><dd>{formatBytes(data.document.latestFileSize)}</dd></div>
                  <div><dt>Document access</dt><dd>{data.document.isRestricted ? ((data.permissions || []).map((department) => department.name).join(", ") || "No departments assigned") : "All departments"}</dd></div>
                </dl>
                <div className="detail-section"><h3>Tags</h3><div className="tag-row">{(data.tags || []).length ? data.tags.map((tag) => <em key={tag.id}>{tag.name}</em>) : <span className="muted">No tags</span>}</div></div>
              </div>

              <div className="panel versions-panel">
                <div className="panel-heading"><h2>Versions</h2><span className="version-count">{data.versions.length} {data.versions.length === 1 ? "version" : "versions"}</span></div>
                <p className="version-note">Each version is retained and can be downloaded or compared when compatible.</p>
                <div className="version-list">{data.versions.map((version, index) => <div className={`version-row ${index === 0 ? "current-version" : ""}`} key={version.id}><span className="version-number">v{version.version_number}</span><span className="version-info"><strong title={version.original_filename}>{version.original_filename}</strong><small>{formatBytes(version.file_size)} &middot; {new Date(version.uploaded_at).toLocaleString()}</small></span><span className="version-actions">{index === 0 && <span className="current-label">Current</span>}<button className="version-download-button" type="button" onClick={() => downloadVersion(version)} disabled={downloadingVersion !== null} aria-label={`Download version ${version.version_number}`}>{downloadingVersion === version.version_number ? "Preparing..." : "Download"}</button></span></div>)}</div>
                <VersionUpload documentId={documentId} demoUserId={demoUserId} onUploaded={() => setRefreshKey((key) => key + 1)} />
              </div>
            </section>

            {data.versions.length >= 2 && <section className="panel comparison-card" aria-labelledby="comparison-heading">
              <div className="comparison-heading"><h2 id="comparison-heading">Compare versions</h2><p>Select two compatible versions to review what changed.</p></div>
              <VersionComparison documentId={documentId} versions={data.versions} demoUserId={demoUserId} />
            </section>}
          </>
        )}
      </div>
      <footer className="footer-note">Unpile &middot; Document access is controlled by the selected demo user.</footer>
    </main>
  );
}
