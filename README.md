# Unpile

Unpile is a proof-of-concept corporate document repository developed for the EEMW Digital Transformation Hub technical assessment. Employees can upload and organize documents with metadata, tags, department-based permissions, and version history. The application supports authorized search, document downloads, version comparisons, and duplicate detection. PostgreSQL stores document metadata, while uploaded files are stored locally.

## Features

- Upload PDF, DOCX, TXT, and XLSX files up to 25 MB.
- Search documents by title, tags, or uploader.
- Manage department-based document permissions.
- View document metadata and version history.
- Download current and previous document versions.
- Upload new versions while preserving previous files.
- Compare compatible document versions.
- Detect exact duplicates using SHA-256 hashing.

## Tech Stack

- **Frontend:** Next.js 14, React 18, plain CSS
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL 17
- **File storage:** Local filesystem
- **DevOps:** Docker Compose, Git

## Getting Started

**Prerequisites:** Node.js (compatible with the installed dependencies), npm, and Docker Desktop with Docker Compose.

### 1. Start the database

From the project root:

```powershell
docker compose up -d
```

On first initialization, PostgreSQL automatically runs the database schema and seed scripts.

### 2. Start the backend

Create `backend/.env`:

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

The backend runs at `http://localhost:5000`.

### 3. Start the frontend

Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

The frontend connects to `http://localhost:5000/api` by default. This can be changed using `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

## Testing

Run the backend tests:

```powershell
cd backend
npm test
```

Check the frontend production build:

```powershell
cd frontend
npm run build
```

## Assumptions and Limitations

- A selectable demo user simulates employee identity; production authentication is not implemented.
- Document access is restricted by department and enforced by the backend.
- Uploaded files are stored locally for this proof of concept.
- Duplicate detection identifies identical file contents, not similar documents.
- Document comparisons focus on text or spreadsheet data, not visual formatting. Scanned PDFs are not supported for text comparison.

## Architecture

Unpile uses a client-server architecture with a layered monolithic backend. PostgreSQL manages metadata and relationships, while the filesystem stores document contents.

Check System Architecture Diagram.png

## Future Improvements

With more time, I would implement production authentication and role-based authorization, scalable file storage, malware scanning, OCR, and more advanced search capabilities.