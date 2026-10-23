# Assessment compliance checklist

This checklist maps the supplied EEMW Digital Transformation Hub assessment
to the implemented Unpile proof of concept. Evidence links point to the
implementation or documentation that a reviewer can inspect.

| Assessment requirement | Status | Evidence |
|---|---|---|
| Upload and store files | Implemented | [documentRoutes.js](../backend/src/routes/documentRoutes.js), [upload.js](../backend/src/middleware/upload.js), [documentService.js](../backend/src/services/documentService.js) |
| Store metadata | Implemented | [schema.sql](../database/schema.sql), [UploadForm.js](../frontend/app/components/UploadForm.js) |
| Store tags with many-to-many relationships | Implemented | [schema.sql](../database/schema.sql), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Store users, departments, and roles | Implemented | [schema.sql](../database/schema.sql), [seed.sql](../database/seed.sql) |
| Store document permissions | Implemented | [schema.sql](../database/schema.sql), [documentService.js](../backend/src/services/documentService.js) |
| Preserve document versions | Implemented | [documentRoutes.js](../backend/src/routes/documentRoutes.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Search by title | Implemented | [search/page.js](../frontend/app/search/page.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Search by tags | Implemented | [search/page.js](../frontend/app/search/page.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Search by uploader | Implemented | [search/page.js](../frontend/app/search/page.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| View document metadata | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js), [documentController.js](../backend/src/controllers/documentController.js) |
| Download documents | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js), [documentController.js](../backend/src/controllers/documentController.js) |
| Fetch version history | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js), [documentRoutes.js](../backend/src/routes/documentRoutes.js) |
| Department authorization | Implemented | [documentRepository.js](../backend/src/repositories/documentRepository.js), [architecture.md](./architecture.md) |
| Backend validation and HTTP errors | Implemented | [upload.js](../backend/src/middleware/upload.js), [documentService.js](../backend/src/services/documentService.js), [app.js](../backend/src/app.js) |
| Layered backend organization | Implemented | [architecture.md](./architecture.md) |
| Next.js App Router frontend | Implemented | [frontend/app/](../frontend/app/) |
| Upload form | Implemented | [UploadForm.js](../frontend/app/components/UploadForm.js) |
| Search page and results list | Implemented | [search/page.js](../frontend/app/search/page.js), [DocumentCard.js](../frontend/app/components/DocumentCard.js) |
| Browse page with permission-aware pagination | Implemented | [documents/page.js](../frontend/app/documents/page.js), [documentRepository.js](../backend/src/repositories/documentRepository.js) |
| Dedicated upload page | Implemented | [upload/page.js](../frontend/app/upload/page.js), [UploadForm.js](../frontend/app/components/UploadForm.js) |
| Detail page with metadata and versions | Implemented | [documents/[id]/page.js](../frontend/app/documents/[id]/page.js) |
| Docker Compose PostgreSQL setup | Implemented | [docker-compose.yml](../docker-compose.yml), [README.md](../README.md) |
| Architecture diagram and design rationale | Implemented | [architecture.md](./architecture.md) |
| Automated verification | Implemented | [documentApi.test.js](../backend/test/documentApi.test.js) |
| Stage 1 exact duplicate detection bonus | Implemented | [fileHasher.js](../backend/src/utils/fileHasher.js), [002_content_hashes.sql](../database/migrations/002_content_hashes.sql), [documentApi.test.js](../backend/test/documentApi.test.js) |
| Stage 1 TXT version comparison bonus | Implemented | [versionComparisonService.js](../backend/src/services/versionComparisonService.js), [VersionComparison.js](../frontend/app/components/VersionComparison.js) |
| Stage 2 DOCX version comparison bonus | Implemented | [docxExtractor.js](../backend/src/services/comparison/extractors/docxExtractor.js), [documentApi.test.js](../backend/test/documentApi.test.js) |
| Stage 2 text-based PDF version comparison bonus | Implemented | [pdfExtractor.js](../backend/src/services/comparison/extractors/pdfExtractor.js), [documentApi.test.js](../backend/test/documentApi.test.js) |
| Stage 2 XLSX worksheet/cell comparison bonus | Implemented | [xlsxExtractor.js](../backend/src/services/comparison/extractors/xlsxExtractor.js), [spreadsheetDiff.js](../backend/src/services/comparison/spreadsheetDiff.js), [VersionComparison.js](../frontend/app/components/VersionComparison.js) |
| Upload new version from the detail UI | Implemented | [VersionUpload.js](../frontend/app/components/VersionUpload.js), [documents/[id]/page.js](../frontend/app/documents/[id]/page.js) |
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
- The frontend exposes bounded Previous/Next pagination on `/documents` and
  `/search`; the API remains the source of truth for totals and authorization.
- Stage 2 compares DOCX paragraph text, text-based PDF content, and XLSX
  worksheet/cell values. It does not provide OCR, visual/layout comparison,
  chart/image comparison, or formula execution.
- Existing version hashes are populated by the documented idempotent backfill
  command; missing physical files remain metadata-only and are reported as
  skipped.
