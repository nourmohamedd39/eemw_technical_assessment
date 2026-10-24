# Unpile architecture and design rationale

Unpile follows a client-server architecture with a layered monolithic backend.

- **Client-server:** the Next.js frontend communicates with an Express REST API
  over HTTP. The frontend never connects directly to PostgreSQL or the upload
  filesystem.
- **Layered backend:** routes and controllers handle HTTP composition and
  responses, services contain business rules and orchestration, and
  repositories own SQL access.
- **Monolithic backend:** these modules run together in one backend application;
  they are not independently deployed microservices.

## System architecture diagram

[System architecture diagram to be added here]

The external diagram should show the browser, Next.js frontend, shared API
client, Express backend layers, PostgreSQL, local file storage, and the main
authorization and comparison flows.

## Design rationale

### Frontend and API boundary

Next.js App Router and React provide the browser UI for upload, search, browse,
details, version history, downloads, and comparison. Shared frontend API
utilities centralize HTTP requests and the demo-user header. Components render
responses and collect input; authorization and authoritative validation remain
in the backend.

The backend is Node.js with Express. Multer handles multipart uploads, applies
the 25 MB limit, allowlists PDF/DOCX/TXT/XLSX extensions, and writes uploads to
the configured storage directory. Controllers translate HTTP input and service
errors into responses. Services validate metadata, enforce business rules,
coordinate filesystem work, and manage transactions. Repositories use
parameterized `pg` queries for PostgreSQL access.

This separation keeps HTTP handling, business rules, SQL, and file parsing
replaceable and testable without introducing unnecessary services or patterns.

### Database and file storage

PostgreSQL is the source of truth for departments, users, documents, tags,
permissions, and immutable document versions. The normalized schema uses join
tables for document tags and department permissions. Foreign keys, checks,
composite keys, and `UNIQUE (document_id, version_number)` protect integrity.

PostgreSQL stores metadata; the filesystem stores file bytes separately. Each
stored file uses a generated UUID filename, while the original filename is
retained as metadata for display and downloads. Client-provided filesystem
paths are never accepted. Download paths are resolved beneath the configured
upload root.

Docker Compose runs PostgreSQL 17 with a named volume. On a fresh volume,
Docker runs `schema.sql` and `seed.sql` once. Existing databases are preserved;
the additive migrations in `database/migrations/` are applied manually when
required.

### Authorization and security boundary

The backend applies department permissions before returning search results,
details, version history, comparisons, or file bytes. Latest and historical
downloads authorize the parent document before resolving a version. Restricted
documents are not disclosed through guessed IDs or inaccessible duplicate
checks.

The `x-demo-user-id` header and frontend demo-user selector are a proof-of-
concept identity mechanism, not secure authentication. They are user
controlled and must be replaced with an authenticated session or signed token
before production use. The POC also does not include malware scanning, OCR, or
distributed object-storage coordination.

### Versioning and concurrency

Each upload creates an immutable `document_versions` row and a separate file.
New versions leave previous records and files unchanged. The service locks the
parent document row with PostgreSQL `FOR UPDATE` before allocating the next
version number; the unique document/version constraint provides a second
integrity boundary. Related metadata inserts run in a transaction, and a file
written before a failed transaction is removed as best-effort compensation.

### Search

Search is executed by the repository with parameterized SQL and permission
conditions in the same query. Title searches match the beginning of a title
word; tag and uploader searches retain case-insensitive matching. Bounded
`limit` and `offset` parameters support the current UI pagination.

The schema enables PostgreSQL `pg_trgm` and adds GIN/trigram indexes for title,
user names, emails, and tag names, plus relationship and version indexes. These
indexes support the current search workload and leave room for a more advanced
search strategy as the dataset grows.

### Duplicate detection

Node.js `crypto` and filesystem streams calculate SHA-256 hashes without loading
large files into memory. Hashes are stored on document versions and checked
against accessible documents or versions only. Duplicate checks are serialized
where necessary, and rejected uploads are cleaned up. SHA-256 detects exact
content duplicates, not semantically similar documents.

### Document comparison

Comparison is performed in backend services after authorization and bounded
file/resource checks. The application uses:

- `mammoth` to extract readable paragraph text from DOCX files.
- `pdfjs-dist` to extract text from text-based PDFs; it does not provide OCR.
- `xlsx` (SheetJS) to normalize workbook worksheets and cell values.
- The application's `textDiff.js` utility for normalized text changes.
- The application's `spreadsheetDiff.js` utility for worksheet and cell changes.

TXT, DOCX, and text-based PDF comparisons return text changes. XLSX comparison
returns worksheet/cell changes. Formatting, charts, images, macro execution,
and visual layout comparison are outside the POC. Processing limits protect
the API from excessive file and archive work.

## Request flows

### Upload

The browser submits multipart metadata and a file. Multer validates the file,
then the service validates the demo-user identity, metadata, tags, and
departments. A transaction inserts the document, version 1, tags, and
permissions. Failed database work triggers best-effort cleanup of the new file.

### Search and access

The frontend sends filters and the simulated demo identity. The service validates
identity and pagination. The repository applies department authorization before
search filters. Details, history, comparisons, and downloads use the same
permission boundary.

### Download and versioning

The service authorizes the document, selects or verifies the requested version,
resolves its safe stored path, and streams the file using its original filename.
Uploading a new version locks the parent row, creates the next immutable
version, and refreshes the current metadata in the UI.

## Implemented and deferred

Implemented:

- Next.js App Router and React frontend.
- Express layered backend with PostgreSQL repositories.
- Department-aware search, details, version history, comparisons, latest
  downloads, and historical-version downloads.
- Local UUID-based storage with original filenames retained as metadata.
- SHA-256 exact duplicate detection.
- TXT, DOCX, text-based PDF, and XLSX comparison.
- Isolated backend integration tests for validation, permissions, versions,
  downloads, comparisons, cleanup, and concurrency.

Deferred production improvements:

- Production authentication and role-based authorization.
- Shared object storage and multi-instance coordination.
- OCR, malware scanning, orphan-file reconciliation, and background comparison
  jobs.
- More advanced search and operational monitoring.

These are follow-up improvements, not technologies currently used by the POC.
