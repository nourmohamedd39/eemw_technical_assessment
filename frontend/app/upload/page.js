"use client";

import Link from "next/link";
import AppHeader from "../components/AppHeader";
import UploadForm from "../components/UploadForm";
import { useDemoUser } from "../components/DemoUserContext";

export default function UploadPage() {
  const { demoUserId } = useDemoUser();

  return (
    <main className="app-shell">
      <AppHeader />
      <div className="page-content upload-page-content">
        <div className="page-heading">
          <h1>Upload a document</h1>
          <Link className="secondary-button inline-button page-action" href="/documents">Browse documents</Link>
        </div>
        <div className="centered-content"><UploadForm demoUserId={demoUserId} /></div>
      </div>
      <footer className="footer-note">Unpile &middot; Supported files: PDF, DOCX, TXT, and XLSX up to 25 MB.</footer>
    </main>
  );
}
