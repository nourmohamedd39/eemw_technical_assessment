const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const { execFile: executeFile } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const { test } = require("node:test");
const { Client } = require("pg");
const dotenv = require("dotenv");

const backendDirectory = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(backendDirectory, ".env") });

const testDatabaseName = `eemw_documents_test_${process.pid}_${Date.now()}`;
const testDatabaseConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: testDatabaseName,
};
const adminDatabaseConfig = {
  ...testDatabaseConfig,
  database: "postgres",
};

const schemaPath = path.resolve(backendDirectory, "../database/schema.sql");
const seedPath = path.resolve(backendDirectory, "../database/seed.sql");
const execFile = promisify(executeFile);

let app;
let repository;
let server;
let baseUrl;
let uploadDirectory;

async function createTestDatabase() {
  const adminClient = new Client(adminDatabaseConfig);
  await adminClient.connect();

  try {
    await adminClient.query(`CREATE DATABASE "${testDatabaseName}"`);
  } finally {
    await adminClient.end();
  }

  const databaseClient = new Client(testDatabaseConfig);
  await databaseClient.connect();
  try {
    await databaseClient.query(await fs.readFile(schemaPath, "utf8"));
    await databaseClient.query(await fs.readFile(seedPath, "utf8"));
  } finally {
    await databaseClient.end();
  }
}

async function dropTestDatabase() {
  const adminClient = new Client(adminDatabaseConfig);
  await adminClient.connect();
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${testDatabaseName}" WITH (FORCE)`);
  } finally {
    await adminClient.end();
  }
}

async function startApplication() {
  uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "eemw-documents-test-"));
  process.env.DB_NAME = testDatabaseName;
  process.env.UPLOAD_DIRECTORY = uploadDirectory;

  app = require("../src/app");
  repository = require("../src/repositories/documentRepository");
  server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;
}

async function stopApplication() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (repository) {
    await repository.pool.end();
  }

  if (uploadDirectory) {
    await fs.rm(uploadDirectory, { recursive: true, force: true });
  }
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.demoUserId !== undefined) {
    headers.set("x-demo-user-id", String(options.demoUserId));
  }

  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });
}

function uploadForm({ title, uploaderId = "1", isRestricted = "false", departmentIds, tags = "", fileName = "document.txt", content = "test content", fileType = "text/plain" } = {}) {
  const form = new FormData();
  if (title !== undefined) form.append("title", title);
  form.append("uploaderId", uploaderId);
  form.append("isRestricted", isRestricted);
  if (departmentIds !== undefined) form.append("departmentIds", departmentIds);
  form.append("tags", tags);
  form.append("file", new Blob([content], { type: fileType }), fileName);
  return form;
}

async function json(response) {
  return response.json();
}

async function uploadCount() {
  return (await fs.readdir(uploadDirectory)).length;
}

test("document API integration suite", async (t) => {
  try {
    await createTestDatabase();
    await startApplication();

    let documentId;
    let restrictedDocumentId;

    await t.test("uploads valid metadata and searchable content", async () => {
      const response = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({
          title: "Integration Policy",
          tags: "Finance, policy",
          content: "policy content",
        }),
      });

      assert.equal(response.status, 201);
      const payload = await json(response);
      documentId = payload.document.id;
      assert.equal(payload.document.version, 1);
      assert.deepEqual(payload.document.tags, ["finance", "policy"]);
      assert.equal(await uploadCount(), 1);

      const storedHash = await repository.pool.query(
        "SELECT content_sha256 FROM document_versions WHERE document_id = $1",
        [documentId]
      );
      assert.match(storedHash.rows[0].content_sha256, /^[0-9a-f]{64}$/);

      await repository.pool.query(
        "UPDATE document_versions SET content_sha256 = NULL WHERE document_id = $1",
        [documentId]
      );
      await execFile(process.execPath, [path.join(backendDirectory, "scripts/backfillContentHashes.js")], {
        env: { ...process.env, DB_NAME: testDatabaseName, UPLOAD_DIRECTORY: uploadDirectory },
      });
      const restoredHash = await repository.pool.query(
        "SELECT content_sha256 FROM document_versions WHERE document_id = $1",
        [documentId]
      );
      assert.match(restoredHash.rows[0].content_sha256, /^[0-9a-f]{64}$/);
    });

    await t.test("rejects accessible exact duplicates and cleans the new file", async () => {
      const before = await uploadCount();
      const response = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({
          title: "Same bytes, new filename",
          fileName: "different-name.txt",
          content: "policy content",
        }),
      });

      assert.equal(response.status, 409);
      const payload = await json(response);
      assert.equal(payload.existingDocument.id, documentId);
      assert.equal(await uploadCount(), before);
    });

    await t.test("rejects missing metadata and cleans the uploaded file", async () => {
      const before = await uploadCount();
      const response = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({ title: "" }),
      });

      assert.equal(response.status, 400);
      assert.match((await json(response)).message, /title is required/i);
      assert.equal(await uploadCount(), before);
    });

    await t.test("rejects identity mismatch, unsupported types, and oversized files", async () => {
      const mismatch = await request("/documents", {
        method: "POST",
        demoUserId: 2,
        body: uploadForm({ title: "Impersonation attempt", uploaderId: "1" }),
      });
      assert.equal(mismatch.status, 403);

      const unsupported = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({ title: "Bad type", fileName: "bad.exe", fileType: "application/octet-stream" }),
      });
      assert.equal(unsupported.status, 400);

      const oversized = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({ title: "Too large", fileName: "large.txt", content: Buffer.alloc(25 * 1024 * 1024 + 1, "x") }),
      });
      assert.equal(oversized.status, 413);
    });

    await t.test("searches by title, tag, and uploader with bounded pagination", async () => {
      for (const query of ["title=Integration", "tag=finance", "uploader=ahmed@example.com"]) {
        const response = await request(`/documents?${query}&limit=10&offset=0`, { demoUserId: 1 });
        assert.equal(response.status, 200);
        const payload = await json(response);
        assert.equal(payload.documents.length, 1);
        assert.equal(payload.pagination.total, 1);
      }

      const invalidPagination = await request("/documents?limit=101", { demoUserId: 1 });
      assert.equal(invalidPagination.status, 400);
    });

    await t.test("enforces department permissions for search, detail, and download", async () => {
      const uploadResponse = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({
          title: "HR Confidential",
          isRestricted: "true",
          departmentIds: "1",
          content: "restricted content",
        }),
      });
      assert.equal(uploadResponse.status, 201);
      restrictedDocumentId = (await json(uploadResponse)).document.id;

      const authorizedSearch = await request(`/documents?title=HR%20Confidential`, { demoUserId: 1 });
      assert.equal((await json(authorizedSearch)).documents.length, 1);

      const unauthorizedSearch = await request(`/documents?title=HR%20Confidential`, { demoUserId: 2 });
      assert.equal((await json(unauthorizedSearch)).documents.length, 0);

      const unauthorizedDetail = await request(`/documents/${restrictedDocumentId}`, { demoUserId: 2 });
      assert.equal(unauthorizedDetail.status, 404);

      const unauthorizedDownload = await request(`/documents/${restrictedDocumentId}/download`, { demoUserId: 2 });
      assert.equal(unauthorizedDownload.status, 404);

      const authorizedDownload = await request(`/documents/${restrictedDocumentId}/download`, { demoUserId: 1 });
      assert.equal(authorizedDownload.status, 200);
      assert.equal(await authorizedDownload.text(), "restricted content");
    });

    await t.test("preserves version history and serializes concurrent version numbers", async () => {
      const uploads = await Promise.all([
        request(`/documents/${documentId}/versions`, {
          method: "POST",
          demoUserId: 1,
          body: uploadForm({ fileName: "version-two.txt", content: "version two" }),
        }),
        request(`/documents/${documentId}/versions`, {
          method: "POST",
          demoUserId: 1,
          body: uploadForm({ fileName: "version-three.txt", content: "version three" }),
        }),
      ]);

      assert.deepEqual(uploads.map((response) => response.status).sort(), [201, 201]);

      const historyResponse = await request(`/documents/${documentId}/versions`, { demoUserId: 1 });
      assert.equal(historyResponse.status, 200);
      const history = await json(historyResponse);
      assert.deepEqual(history.versions.map((version) => version.version_number), [3, 2, 1]);

      const detail = await request(`/documents/${documentId}`, { demoUserId: 1 });
      const detailPayload = await json(detail);
      assert.equal(detailPayload.document.latestVersion, 3);

      const latestDownload = await request(`/documents/${documentId}/download`, { demoUserId: 1 });
      assert.equal(latestDownload.status, 200);
      assert.ok(["version two", "version three"].includes(await latestDownload.text()));

      const before = await uploadCount();
      const duplicateVersion = await request(`/documents/${documentId}/versions`, {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({ fileName: "renamed-version.txt", content: "version two" }),
      });
      assert.equal(duplicateVersion.status, 409);
      assert.equal(await uploadCount(), before);
    });

    await t.test("does not disclose inaccessible duplicates", async () => {
      const restricted = await request("/documents", {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({
          title: "Hidden duplicate source",
          isRestricted: "true",
          departmentIds: "1",
          content: "hidden duplicate bytes",
        }),
      });
      assert.equal(restricted.status, 201);

      const copy = await request("/documents", {
        method: "POST",
        demoUserId: 2,
        body: uploadForm({
          title: "Finance copy",
          uploaderId: "2",
          content: "hidden duplicate bytes",
          fileName: "finance-copy.txt",
        }),
      });
      assert.equal(copy.status, 201);
    });

    await t.test("serializes concurrent identical new uploads", async () => {
      const responses = await Promise.all([
        request("/documents", { method: "POST", demoUserId: 3, body: uploadForm({ title: "Concurrent A", uploaderId: "3", content: "concurrent bytes" }) }),
        request("/documents", { method: "POST", demoUserId: 3, body: uploadForm({ title: "Concurrent B", uploaderId: "3", content: "concurrent bytes" }) }),
      ]);

      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    });

    await t.test("compares authorized TXT versions and validates comparison access", async () => {
      const comparison = await request(`/documents/${documentId}/compare?fromVersion=2&toVersion=3`, { demoUserId: 1 });
      assert.equal(comparison.status, 200);
      const payload = await json(comparison);
      assert.equal(payload.format, "txt");
      assert.equal(payload.fromVersion, 2);
      assert.equal(payload.toVersion, 3);
      assert.ok(payload.changes.some((change) => change.type === "changed"));

      const sameVersion = await request(`/documents/${documentId}/compare?fromVersion=2&toVersion=2`, { demoUserId: 1 });
      assert.equal(sameVersion.status, 400);

      const restrictedVersion = await request(`/documents/${restrictedDocumentId}/versions`, {
        method: "POST",
        demoUserId: 1,
        body: uploadForm({ fileName: "hidden-version.txt", content: "hidden version content" }),
      });
      assert.equal(restrictedVersion.status, 201);

      const unauthorized = await request(`/documents/${restrictedDocumentId}/compare?fromVersion=1&toVersion=2`, { demoUserId: 2 });
      assert.equal(unauthorized.status, 404);

      const missing = await request("/documents/99999/compare?fromVersion=1&toVersion=2", { demoUserId: 1 });
      assert.equal(missing.status, 404);
    });

    await t.test("cleans up failed version uploads and rejects invalid IDs", async () => {
      const before = await uploadCount();
      const unauthorizedVersion = await request(`/documents/${restrictedDocumentId}/versions`, {
        method: "POST",
        demoUserId: 2,
        body: uploadForm({ fileName: "unauthorized.txt", content: "should be removed" }),
      });
      assert.equal(unauthorizedVersion.status, 404);
      assert.equal(await uploadCount(), before);

      const invalidId = await request("/documents/not-an-id", { demoUserId: 1 });
      assert.equal(invalidId.status, 400);

      const missingHeader = await request("/documents");
      assert.equal(missingHeader.status, 400);
    });
  } finally {
    await stopApplication();
    await dropTestDatabase();
  }
});
