# Assessment compliance checklist

This checklist maps the supplied EEMW Digital Transformation Hub assessment
to the implemented DigiDocs proof of concept. Evidence links point to the
implementation or documentation that a reviewer can inspect.

| Assessment requirement | Status | Evidence |
|---|---|---|
| Upload and store files | Implemented | [documentRoutes.js](../backend/src/routes/documentRoutes.js), [upload.js](../backend/src/middleware/upload.js), [documentService.js](../backend/src/services/documentService.js) |
| Store metadata | Implemented | [schema.sql](../database/schema.sql), [UploadForm.js](../frontend/app/components/UploadForm.js) |
| Store tags with many-to-many relationships | Implemented | [schema.sql](../database/schema.sql), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Store users, departments, and roles | Implemented | [schema.sql](../database/schema.sql), [seed.sql](../database/seed.sql) |
| Store document permissions | Implemented | [schema.sql](../database/schema.sql), [documentService.js](../backend/src/services/documentService.js) |
| Preserve document versions | Implemented | [documentRoutes.js](../backend/src/routes/documentRoutes.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Search by title | Implemented | [SearchPanel.js](../frontend/app/components/SearchPanel.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Search by tags | Implemented | [SearchPanel.js](../frontend/app/components/SearchPanel.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Search by uploader | Implemented | [SearchPanel.js](../frontend/app/components/SearchPanel.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| View document metadata | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js), [documentController.js](../backend/src/controllers/documentController.js) |
| Download documents | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js), [documentController.js](../backend/src/controllers/documentController.js) |
| Fetch version history | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js), [documentRoutes.js](../backend/src/routes/documentRoutes.js) |
| Department authorization | Implemented | [documentRepository.js](../backend/src/repositories/documentRepository.js), [architecture.md](./architecture.md) |
| Backend validation and HTTP errors | Implemented | [upload.js](../backend/src/middleware/upload.js), [documentService.js](../backend/src/services/documentService.js), [app.js](../backend/src/app.js) |
| Layered backend organization | Implemented | [architecture.md](./architecture.md) |
| Next.js App Router frontend | Implemented | [frontend/app/](../frontend/app/) |
| Upload form | Implemented | [UploadForm.js](../frontend/app/components/UploadForm.js) |
| Search page and results list | Implemented | [SearchPanel.js](../frontend/app/components/SearchPanel.js) |
| Detail page with metadata and versions | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js) |
| Docker Compose PostgreSQL setup | Implemented | [docker-compose.yml](../docker-compose.yml), [README.md](../README.md) |
| Architecture diagram and design rationale | Implemented | [architecture.md](./architecture.md) |
| Automated verification | Implemented | [documentApi.test.js](../backend/test/documentApi.test.js) |
| GitHub repository and POC video | Submission action | Must be supplied by the candidate after local verification |

## Verification commands

Run these from the repository root:

```powershell
docker compose config
docker compose ps
cd backend
npm.cmd test
cd ..\frontend
npm.cmd run build
```

The backend test suite creates an isolated test database and temporary upload
directory. It does not reset the development database or delete development
uploads.

## Known POC limitations

- The demo-user selector simulates identity and is explicitly not production
  authentication.
- Local filesystem storage is suitable for the POC but not for horizontally
  scaled production instances.
- Historical versions are shown in the audit trail but do not have separate
  download endpoints.
- The frontend currently relies on the API's bounded default page rather than
  exposing page-navigation controls.
