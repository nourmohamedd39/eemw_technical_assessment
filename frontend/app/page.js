"use client";

import { useState } from "react";
import Link from "next/link";
import DemoUserPicker from "./components/DemoUserPicker";
import SearchPanel from "./components/SearchPanel";
import UploadForm from "./components/UploadForm";

export default function HomePage() {
  const [demoUserId, setDemoUserId] = useState("1");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="DigiDocs home">
          <span className="brand-mark">DD</span>
          <span><strong>DigiDocs</strong><small>Corporate document workspace</small></span>
        </Link>
        <DemoUserPicker value={demoUserId} onChange={setDemoUserId} />
      </header>

      <section className="hero-section">
        <div>
          <p className="eyebrow">DigiDocs workspace</p>
          <h1>Your company&apos;s knowledge, in one place.</h1>
          <p className="hero-copy">Securely store, organize, and access company documents in one place.</p>
        </div>
      </section>

      <section className="workspace-grid">
        <UploadForm demoUserId={demoUserId} onUploaded={() => setRefreshKey((key) => key + 1)} />
        <SearchPanel demoUserId={demoUserId} refreshKey={refreshKey} />
      </section>
      <footer className="footer-note">DigiDocs · Department permissions are enforced by the API.</footer>
    </main>
  );
}
