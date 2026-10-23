import Link from "next/link";

export default function BrandLogo({ href = "/", showDescriptor = true }) {
  return (
    <Link href={href} className="brand" aria-label="Unpile home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" role="img">
          <path d="M10 8.5h14l6 6V31a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M24 8.5v7h6M13 22h14M13 27h10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 12.5h-2a2 2 0 0 0-2 2v15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="brand-copy"><strong>Unpile</strong>{showDescriptor && <small>Corporate document workspace</small>}</span>
    </Link>
  );
}
