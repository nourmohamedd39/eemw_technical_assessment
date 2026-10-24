"use client";

import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import DocumentCard from "../components/DocumentCard";
import SearchControls from "../components/SearchControls";
import { useDemoUser } from "../components/DemoUserContext";
import { apiRequest } from "../../lib/api";

const PAGE_SIZE = 20;

export default function SearchPage() {
  const { demoUserId } = useDemoUser();
  const [values, setValues] = useState({ title: "", tag: "", uploader: "" });
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValues({ title: params.get("q") || params.get("title") || "", tag: params.get("tag") || "", uploader: params.get("uploader") || "" });
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const title = params.get("q") || params.get("title") || "";
    const tag = params.get("tag") || "";
    const uploader = params.get("uploader") || "";
    const offset = Number(params.get("offset") || 0);
    setLoading(true);
    setError("");
    const request = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (title.trim()) request.set("title", title.trim());
    if (tag.trim()) request.set("tag", tag.trim());
    if (uploader.trim()) request.set("uploader", uploader.trim());
    apiRequest("/documents?" + request.toString(), { demoUserId })
      .then((response) => response.json())
      .then((payload) => { if (active) { setDocuments(payload.documents || []); setPagination(payload.pagination || { total: 0, offset }); } })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to search documents."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoUserId]);

  const updateValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (values.title.trim()) params.set("q", values.title.trim());
    if (values.tag.trim()) params.set("tag", values.tag.trim());
    if (values.uploader.trim()) params.set("uploader", values.uploader.trim());
    window.location.assign("/search" + (params.toString() ? "?" + params.toString() : ""));
  };
  const changePage = (nextOffset) => {
    const params = new URLSearchParams(window.location.search);
    if (nextOffset > 0) params.set("offset", String(nextOffset)); else params.delete("offset");
    window.location.assign("/search" + (params.toString() ? "?" + params.toString() : ""));
  };

  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + documents.length < pagination.total;

  return (
    <main className="app-shell">
      <AppHeader />
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">Find a file</p><h1>Search documents</h1><p className="page-intro">Search the documents your selected demo user is authorized to access.</p></div></div>
        <section className="panel search-page-panel" aria-labelledby="search-heading"><h2 id="search-heading">Search repository</h2><SearchControls values={values} onChange={updateValue} onSubmit={submitSearch} /></section>
        <section className="results-section" aria-live="polite">
          <div className="section-heading"><div><p className="eyebrow">Authorized results</p><h2>{pagination.total} document{pagination.total === 1 ? "" : "s"}</h2></div>{(values.title || values.tag || values.uploader) && <button className="text-button" type="button" onClick={() => window.location.assign("/search")}>Clear filters</button>}</div>
          {loading && <p className="loading-state" role="status">Searching documents...</p>}
          {error && !loading && <p className="alert error" role="alert">{error}</p>}
          {!loading && !error && documents.length === 0 && <p className="empty-state">No documents match these filters.</p>}
          {!loading && !error && documents.length > 0 && <div className="results-list">{documents.map((document) => <DocumentCard key={document.id} document={document} />)}</div>}
          {!loading && !error && pagination.total > PAGE_SIZE && <div className="pagination"><button className="secondary-button" type="button" disabled={!hasPrevious} onClick={() => changePage(Math.max(0, pagination.offset - PAGE_SIZE))}>Previous</button><span>Showing {pagination.offset + 1}&ndash;{Math.min(pagination.offset + documents.length, pagination.total)} of {pagination.total}</span><button className="secondary-button" type="button" disabled={!hasNext} onClick={() => changePage(pagination.offset + PAGE_SIZE)}>Next</button></div>}
        </section>
      </div>
      <footer className="footer-note">Unpile &middot; Search results are filtered by the API for the selected demo user.</footer>
    </main>
  );
}
