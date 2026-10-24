# Unpile

Unpile is a proof-of-concept corporate document repository built for the EEMW Digital Transformation Hub assessment. Employees can upload documents with metadata, tags, department permissions, and versions; search authorized documents; view details; compare compatible versions; and download current or historical files. PostgreSQL stores metadata and relationships, while versioned file contents are stored on the local filesystem.

## Features

- Upload PDF, DOCX, TXT, and XLSX files up to 25 MB.
- Store titles, descriptions, tags, uploaders, department permissions, and version history.
- Search by title, tag, or uploader with permission-aware pagination.
- View document details and download the latest or an accessible historical version.
- Upload new versions without replacing previous files.
- Compare TXT, DOCX, text-based PDF, and XLSX versions where supported.
- Detect exact duplicate content with streamed SHA-256 hashing.
- Enforce restricted-document access in the backend.
- Use a selectable demo user to demonstrate department-based permissions.

## Tech stack

- Next.js 14 App Router and React 18
- Node.js 18+ and Express 5
- PostgreSQL 17 with `pg`
- Multer for multipart uploads
- Docker Compose for local PostgreSQL
- Local filesystem storage for uploaded files

## Prerequisites

- Node.js 18 or later
- npm
- Docker Desktop with Docker Compose

## Getting started

### 1. Start PostgreSQL

From the repository root:

```powershell
docker compose up -d
```

On a new PostgreSQL volume, Docker runs `database/schema.sql` and then
`database/seed.sql`. This creates the schema, indexes, departments, and demo
users. These scripts run only when PostgreSQL creates a new data directory.
They do not overwrite or reseed an existing volume.

For an existing database, do not remove the Docker volume. Apply the additive
migrations only when needed:

```powershell
Get-Content .\database\migrations\001_search_indexes.sql | docker exec -i eemw-postgres psql -U eemw_user -d eemw_documents
Get-Content .\database\migrations\002_content_hashes.sql | docker exec -i eemw-postgres psql -U eemw_user -d eemw_documents
```

If existing version rows were created before content hashing was added, run the
idempotent backfill after configuring the backend environment:

```powershell
cd backend
npm install
npm run backfill:hashes
cd ..
```

The backfill updates missing hashes when the physical file exists. It does not
delete records or files.

### 2. Configure and run the backend

Create `backend/.env` with the local values used by Docker Compose:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=eemw_user
DB_PASSWORD=eemw_local_password
DB_NAME=eemw_documents
```

Then run:

```powershell
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

### 3. Run the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend uses
`http://localhost:5000/api` by default. To change it, create
`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Testing

The backend integration suite creates an isolated temporary PostgreSQL database
and upload directory. It does not modify development data, uploads, or Docker
volumes.

```powershell
cd backend
npm test

cd ..\frontend
npm run build
```

## Assumptions and limitations

- The demo-user selector and `x-demo-user-id` header simulate identity for this
  proof of concept. They are not production authentication. A production
  deployment would derive identity from an authenticated session or token.
- Local filesystem storage is suitable for a POC, but shared object storage
  would be needed for multiple backend instances.
- Department permissions are enforced server-side for search, details,
  downloads, version history, version uploads, and comparisons.
- SHA-256 detects exact byte-for-byte duplicates; it does not detect similar
  documents.
- PDF comparison supports extractable text only. Scanned/image-only PDFs do
  not receive OCR comparison. DOCX formatting and XLSX formatting, charts, and
  images are not compared.
- Existing files and metadata are not reconciled automatically if someone
  removes files directly from the upload directory.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the architectural style,
layer responsibilities, data model, authorization boundary, storage design,
comparison technologies, and design tradeoffs. The external system diagram
should be inserted at the placeholder near the beginning of that document.

## Future improvements

- Replace simulated identity with production authentication and role-based
  authorization.
- Move file storage to durable shared object storage for horizontal scaling.
- Add orphan-file reconciliation, malware scanning, and stronger operational
  monitoring.
- Add background processing for large comparisons and more advanced search.

## Submission

Create a GitHub repository for the project and push the code with normal commit
history. Submit the repository URL and a link to a short video demonstrating
the working POC. The repository may be public or private with the assessment
reviewers added as collaborators.
