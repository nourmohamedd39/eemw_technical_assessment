"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, formatBytes, formatFileType } from "../../lib/api";

export default function SearchPanel({ demoUserId, refreshKey }) {
  const [searchTitle, setSearchTitle] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [searchUploader, setSearchUploader] = useState("");
  const [documents, setDocuments] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchDocuments = async (event, filterOverrides = null) => {
    event?.preventDefault();
    setSearching(true);
    setSearchError("");

    try {
      const params = new URLSearchParams();
      const activeTitle = filterOverrides?.title ?? searchTitle;
      const activeTag = filterOverrides?.tag ?? searchTag;
      const activeUploader = filterOverrides?.uploader ?? searchUploader;
      if (activeTitle.trim()) params.set("title", activeTitle.trim());
      if (activeTag.trim()) params.set("tag", activeTag.trim());
      if (activeUploader.trim()) params.set("uploader", activeUploader.trim());

      const response = await apiRequest(`/documents?${params.toString()}`, { demoUserId });
      const payload = await response.json();
      setDocuments(payload.documents || []);
    } catch (error) {
      setSearchError(error.message || "Unable to search documents.");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    searchDocuments();
    // The list refreshes when the selected demo user or upload result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoUserId, refreshKey]);

  const clearFilters = () => {
    setSearchTitle("");
    setSearchTag("");
    setSearchUploader("");
    searchDocuments(undefined, { title: "", tag: "", uploader: "" });
  };

  return (
    <div className="panel search-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Find a file</p><h2>Search repository</h2></div>
        <span className="panel-icon">⌕</span>
      </div>
      <form className="search-form" onSubmit={searchDocuments}>
        <label className="field-label" htmlFor="search-title">Title</label>
        <input id="search-title" value={searchTitle} onChange={(event) => setSearchTitle(event.target.value)} placeholder="Search by title" />
        <div className="two-column-fields">
          <div><label className="field-label" htmlFor="search-tag">Tag</label><input id="search-tag" value={searchTag} onChange={(event) => setSearchTag(event.target.value)} placeholder="e.g. finance" /></div>
          <div><label className="field-label" htmlFor="search-uploader">Uploader</label><input id="search-uploader" value={searchUploader} onChange={(event) => setSearchUploader(event.target.value)} placeholder="Name or email" /></div>
        </div>
        {searchError && <p className="alert error" role="alert">{searchError}</p>}
        <button className="secondary-button" type="submit" disabled={searching}>{searching ? "Searching…" : "Search documents"}</button>
      </form>

      <div className="results-header" aria-live="polite">
        <div><p className="eyebrow">Visible to your demo user</p><h3>{documents.length} document{documents.length === 1 ? "" : "s"}</h3></div>
        <button className="text-button" type="button" onClick={clearFilters}>Clear filters</button>
      </div>
      <div className="results-list" aria-busy={searching}>
        {searching && <p className="loading-state" role="status">Searching documents...</p>}
        {documents.length === 0 && !searching ? <p className="empty-state">No documents match these filters.</p> : documents.map((document) => (
          <Link className="result-card" href={`/documents/${document.id}`} key={document.id}>
            <span className="file-badge">{formatFileType(document.latest_filename)}</span>
            <span className="result-main"><strong>{document.title}</strong><small>{document.uploader_name} · Version {document.latest_version} · {formatBytes(document.latest_file_size)}</small><span className="tag-row">{(document.tags || []).map((tag) => <em key={tag}>{tag}</em>)}</span></span>
            <span className="result-arrow">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
