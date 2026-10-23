"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader";
import DocumentCard from "./components/DocumentCard";
import { useDemoUser } from "./components/DemoUserContext";
import useRecentlyViewed from "./hooks/useRecentlyViewed";
import { apiRequest } from "../lib/api";

function toListDocument(payload) {
  const document = payload.document;
  return {
    id: document.id,
    title: document.title,
    uploader_name: document.uploaderName,
    latest_version: document.latestVersion,
    latest_filename: document.latestFilename,
    latest_file_size: document.latestFileSize,
    tags: (payload.tags || []).map((tag) => tag.name),
  };
}

export default function HomePage() {
  const router = useRouter();
  const { demoUserId } = useDemoUser();
  const { recentIds } = useRecentlyViewed(demoUserId);
  const [query, setQuery] = useState("");
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [latestLoading, setLatestLoading] = useState(true);
  const [recentError, setRecentError] = useState("");
  const [latestError, setLatestError] = useState("");

  useEffect(() => {
    let active = true;
    if (recentIds.length === 0) {
      setRecentDocuments([]);
      setRecentLoading(false);
      setRecentError("");
      return () => { active = false; };
    }

    setRecentLoading(true);
    setRecentError("");
    Promise.allSettled(recentIds.map((id) => apiRequest("/documents/" + id, { demoUserId }).then((response) => response.json())))
      .then((results) => {
        if (!active) return;
        const available = results
          .map((result) => result.status === "fulfilled" ? result.value : null)
          .filter(Boolean)
          .map(toListDocument);
        setRecentDocuments(available);
        if (available.length === 0 && results.some((result) => result.status === "rejected")) setRecentError("Recently viewed documents are not currently available.");
      })
      .finally(() => { if (active) setRecentLoading(false); });
    return () => { active = false; };
  }, [demoUserId, recentIds]);

  useEffect(() => {
    let active = true;
    setLatestLoading(true);
    setLatestError("");
    apiRequest("/documents?limit=6&offset=0", { demoUserId })
      .then((response) => response.json())
      .then((payload) => { if (active) setLatestDocuments(payload.documents || []); })
      .catch((requestError) => { if (active) setLatestError(requestError.message || "Unable to load accessible documents."); })
      .finally(() => { if (active) setLatestLoading(false); });
    return () => { active = false; };
  }, [demoUserId]);

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push("/search" + (params.toString() ? "?" + params.toString() : ""));
  };

  return (
    <main className="app-shell">
      <AppHeader />
      <section className="hero-section home-hero">
        <div>
          <p className="eyebrow">Unpile workspace</p>
          <h1>Your workspace, organized.</h1>
          <p className="hero-copy">Find documents and pick up where you left off.</p>
        </div>
      </section>

      <section className="home-search panel" aria-label="Search repository">
        <form className="home-search-form" onSubmit={submitSearch}>
          <span className="search-symbol" aria-hidden="true">⌕</span>
          <input aria-label="Search documents by title" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents by title" />
          {query && <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear search">&times;</button>}
          <button className="primary-button home-search-button" type="submit">Search</button>
        </form>
        <p className="search-helper">Search by title. Use tag and uploader filters on the results page.</p>
      </section>

      <section className="home-actions" aria-label="Repository actions">
        <Link className="action-card" href="/documents">
          <span className="action-icon" aria-hidden="true">⌕</span>
          <span><strong>Browse documents</strong><small>Explore documents available to you.</small></span>
        </Link>
        <Link className="action-card action-card-primary" href="/upload">
          <span className="action-icon" aria-hidden="true">＋</span>
          <span><strong>Upload document</strong><small>Add a document to the repository.</small></span>
        </Link>
      </section>

      <section className="home-documents recent-section" aria-labelledby="recent-heading">
        <div className="section-heading"><div><p className="eyebrow">Quick access</p><h2 id="recent-heading">Recently viewed</h2><p className="section-copy">Quick access to documents you&apos;ve opened.</p></div></div>
        {recentLoading && <p className="loading-state" role="status">Checking your recent documents...</p>}
        {recentError && !recentLoading && <p className="alert error" role="alert">{recentError}</p>}
        {!recentLoading && !recentError && recentDocuments.length === 0 && <div className="recent-empty"><strong>No recently viewed documents yet.</strong><span>Documents you open will appear here for quick access.</span></div>}
        {!recentLoading && !recentError && recentDocuments.length > 0 && <div className="results-list">{recentDocuments.map((document) => <DocumentCard key={document.id} document={document} />)}</div>}
        <p className="local-history-note">Recent history is stored in this browser for the selected demo user.</p>
      </section>

      <section className="home-documents latest-section" aria-labelledby="latest-heading">
        <div className="section-heading"><div><p className="eyebrow">Permission-filtered library</p><h2 id="latest-heading">Latest accessible documents</h2></div><Link className="text-button" href="/documents">View all &rarr;</Link></div>
        {latestLoading && <p className="loading-state" role="status">Loading accessible documents...</p>}
        {latestError && !latestLoading && <p className="alert error" role="alert">{latestError}</p>}
        {!latestLoading && !latestError && latestDocuments.length === 0 && <p className="empty-state">No accessible documents are available for this demo user.</p>}
        {!latestLoading && !latestError && latestDocuments.length > 0 && <div className="results-list">{latestDocuments.map((document) => <DocumentCard key={document.id} document={document} />)}</div>}
      </section>
      <footer className="footer-note">Unpile &middot; Department permissions are enforced by the API.</footer>
    </main>
  );
}
