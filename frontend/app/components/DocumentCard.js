import Link from "next/link";
import { formatBytes, formatFileType } from "../../lib/api";

export default function DocumentCard({ document }) {
  return (
    <Link className="result-card" href={`/documents/${document.id}`}>
      <span className="file-badge">{formatFileType(document.latest_filename)}</span>
      <span className="result-main">
        <strong>{document.title}</strong>
        <small>{document.uploader_name} &middot; Version {document.latest_version} &middot; {formatBytes(document.latest_file_size)}</small>
        <span className="tag-row">{(document.tags || []).map((tag) => <em key={tag}>{tag}</em>)}</span>
      </span>
      <span className="result-arrow" aria-hidden="true">&rarr;</span>
    </Link>
  );
}
