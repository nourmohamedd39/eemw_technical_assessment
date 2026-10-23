# DigiDocs

A full-stack proof-of-concept document repository built with
Next.js, Node.js, Express, and PostgreSQL.

DigiDocs lets employees upload, organize, search, view, download, and version
corporate documents. Metadata and relationships are stored in PostgreSQL,
while versioned file bytes are stored separately on the local filesystem.

## Assessment documentation

- [System architecture and design rationale](docs/architecture.md)
- [Assessment compliance checklist](docs/assessment-compliance.md)
- [Demonstration and video preparation checklist](docs/demo-checklist.md)
- [Original Technical Assessment PDF](<docs/Technical Assessment.pdf>)

The architecture document is the primary technical deliverable. It includes a
system diagram, layer responsibilities, data model, authorization boundaries,
request flows, tradeoffs, and future improvements.


## Environment Configuration

Create a `.env` file inside the `backend` folder
and add the following configuration:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=eemw_user
DB_PASSWORD=eemw_local_password
DB_NAME=eemw_documents
```

These credentials are for the local development
PostgreSQL database configured in docker-compose.yml.

The project was developed and verified with Node.js 18+ and PostgreSQL 17.

## Run locally

Start PostgreSQL with `docker compose up -d`. On a fresh PostgreSQL volume,
Docker automatically runs `database/schema.sql` and `database/seed.sql` in
that order, creating the tables, indexes, departments, and demo users. The
initialization scripts run only when PostgreSQL creates a new data directory;
`docker compose up -d` does not overwrite or re-seed an existing volume.

For an existing database, preserve the volume and apply only the safe search
index migration when needed:

```powershell
Get-Content .\database\migrations\001_search_indexes.sql | docker exec -i eemw-postgres psql -U eemw_user -d eemw_documents
```

Start the API with `cd backend && npm install && npm run dev`. Start the
Next.js interface in a second terminal with `cd frontend && npm install && npm
run dev`, then open `http://localhost:3000`. The frontend uses
`http://localhost:5000/api` by default; set `NEXT_PUBLIC_API_URL` in
`frontend/.env.local` to override it.

## Demo user access

Authentication is not implemented in this proof of concept. The selected
demo user's ID is sent in the `x-demo-user-id` header, for example
`x-demo-user-id: 1`. The backend uses that user's department when enforcing
restricted-document permissions, and upload requests require the header to
match the submitted `uploaderId`. This is a demonstration mechanism, not
production authentication.

## Document API

- `POST /api/documents` uploads a document.
- `GET /api/documents` searches documents using `title`, `tag`, `uploader`,
  or `uploaderId` query parameters. Optional `limit` (1–100, default 50) and
  `offset` (default 0) parameters provide bounded pagination.
- `GET /api/documents/:id` returns document metadata.
- `GET /api/documents/:id/download` downloads the latest version.
- `POST /api/documents/:id/versions` uploads a new version. Include the
  authorized demo user in the `x-demo-user-id` header and the file in the
  `file` multipart field.
- `GET /api/documents/:id/versions` returns the complete version history.

## Backend tests

Run `cd backend && npm test` to execute the API integration suite. Each run
creates a unique isolated PostgreSQL test database and temporary upload
directory, then removes only those test resources. Existing development data,
uploads, and Docker volumes are not used or modified by the tests.

## Submission checklist

- GitHub repository URL: add the final repository URL when submitting.
- POC video URL: add the recorded demonstration URL when submitting.
- Review [docs/demo-checklist.md](docs/demo-checklist.md) before recording.
