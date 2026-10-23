# DigiDocs demonstration checklist

This is a short, repeatable walkthrough for recording or presenting the POC.
It demonstrates the required behavior without requiring production
authentication.

## Before the demonstration

1. Confirm Docker Desktop is running.
2. Start PostgreSQL:

   ```powershell
   docker compose up -d
   ```

3. Start the backend in terminal 1:

   ```powershell
   cd backend
   npm.cmd run dev
   ```

4. Start the frontend in terminal 2:

   ```powershell
   cd frontend
   npm.cmd run dev
   ```

5. Open `http://localhost:3000`.

If the database already exists, do not remove the Docker volume. Apply only
the documented search-index migration if required; see [README.md](../README.md).

## Suggested 4–5 minute flow

### 1. Explain the architecture

Open [architecture.md](./architecture.md) and point out:

- Next.js browser UI.
- Express routes/controllers/services/repository layers.
- PostgreSQL metadata and relationship storage.
- Separate local file storage.
- Server-side permission checks.

State clearly that the demo-user selector is simulated identity for the POC,
not production authentication.

### 2. Upload a document

On the homepage:

1. Leave the user as `Ahmed Ali · HR`.
2. Enter a title such as `Demo Security Policy`.
3. Enter tags such as `security, policy`.
4. Choose a small `.txt` or `.pdf` file.
5. Click **Upload document**.
6. Show the success message and the new result.

Mention that the backend stores the physical file separately and inserts the
metadata, version 1, tags, and permissions in a transaction.

### 3. Search and inspect metadata

1. Search for `Demo Security Policy`.
2. Open the result.
3. Show uploader, file metadata, tags, access level, and version history.
4. Click **Download latest**.

### 4. Demonstrate restricted access

1. Return to the homepage.
2. Upload another document with **Restrict by department** enabled.
3. Select only `HR`.
4. Open the document as Ahmed/HR and show that it is visible.
5. Switch to Sarah/Finance.
6. Search for the restricted title and show that it is absent.
7. If an existing restricted document is opened by ID, show the graceful
   access error rather than metadata or a file.

### 5. Demonstrate version history

The current UI displays history but does not expose a version-upload control.
Use the API for this portion if required:

```powershell
curl.exe -X POST http://localhost:5000/api/documents/<DOCUMENT_ID>/versions `
  -H "x-demo-user-id: 1" `
  -F "file=@$env:TEMP\new-version.txt"
```

Refresh the detail page and show that the new version is current while the
previous version remains in the history.

## Closing points

- PostgreSQL is the source of truth for metadata and relationships.
- Files are immutable per version and are never overwritten.
- Authorization is enforced in backend queries, not only in the UI.
- Automated tests use a separate database and temporary storage.
- Production follow-up would replace simulated identity and local storage.
