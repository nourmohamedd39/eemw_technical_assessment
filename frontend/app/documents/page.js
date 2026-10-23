"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import DocumentCard from "../components/DocumentCard";
import SearchControls from "../components/SearchControls";
import { useDemoUser } from "../components/DemoUserContext";
import { apiRequest } from "../../lib/api";

const PAGE_SIZE = 20;

export default function BrowseDocumentsPage() {
  const router = useRouter();
  const { demoUserId } = useDemoUser();
  const [values, setValues] = useState({ title: "", tag: "", uploader: "" });
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const nextValues = { title: params.get("title") || "", tag: params.get("tag") || "", uploader: params.get("uploader") || "" };
    const offset = Number(params.get("offset") || 0);
    setValues(nextValues);
    setLoading(true);
    setError("");
    const request = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    Object.entries(nextValues).forEach(([key, value]) => { if (value.trim()) request.set(key, value.trim()); });
    apiRequest("/documents?" + request.toString(), { demoUserId })
      .then((response) => response.json())
      .then((payload) => { if (active) { setDocuments(payload.documents || []); setPagination(payload.pagination || { total: 0, offset }); } })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load documents."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoUserId]);

  const updateValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
    router.push("/documents" + (params.toString() ? "?" + params.toString() : ""));
    window.setTimeout(() => window.location.reload(), 0);
  };
  const changePage = (nextOffset) => {
    const params = new URLSearchParams(window.location.search);
    if (nextOffset > 0) params.set("offset", String(nextOffset)); else params.delete("offset");
    router.push("/documents" + (params.toString() ? "?" + params.toString() : ""));
    window.setTimeout(() => window.location.reload(), 0);
  };
  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + documents.length < pagination.total;

  return (
    <main className="app-shell">
      <AppHeader />
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">Your accessible library</p><h1>Browse documents</h1><p className="page-intro">Explore every document available to the selected demo user.</p></div><Link className="primary-button inline-button page-action" href="/upload">Upload document</Link></div>
        <section className="panel search-page-panel" aria-labelledby="browse-filter-heading"><h2 id="browse-filter-heading">Filter documents</h2><SearchControls values={values} onChange={updateValue} onSubmit={submitSearch} /></section>
        <section className="results-section" aria-live="polite">
          <div className="section-heading"><div><p className="eyebrow">Permission-filtered library</p><h2>{pagination.total} document{pagination.total === 1 ? "" : "s"}</h2></div></div>
          {loading && <p className="loading-state" role="status">Loading documents...</p>}
          {error && !loading && <p className="alert error" role="alert">{error}</p>}
          {!loading && !error && documents.length === 0 && <p className="empty-state">No accessible documents match these filters.</p>}
          {!loading && !error && documents.length > 0 && <div className="results-list">{documents.map((document) => <DocumentCard key={document.id} document={document} />)}</div>}
          {!loading && !error && pagination.total > PAGE_SIZE && <div className="pagination"><button className="secondary-button" type="button" disabled={!hasPrevious} onClick={() => changePage(Math.max(0, pagination.offset - PAGE_SIZE))}>Previous</button><span>Showing {pagination.offset + 1}&ndash;{Math.min(pagination.offset + documents.length, pagination.total)} of {pagination.total}</span><button className="secondary-button" type="button" disabled={!hasNext} onClick={() => changePage(pagination.offset + PAGE_SIZE)}>Next</button></div>}
        </section>
      </div>
      <footer className="footer-note">Unpile &middot; Only documents authorized for the selected demo user are returned.</footer>
    </main>
  );
}
