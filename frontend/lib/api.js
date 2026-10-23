import { API_URL } from "./constants";

export async function getApiError(response) {
  try {
    const payload = await response.json();
    const error = new Error(payload.message || "The request could not be completed.");
    error.status = response.status;
    error.payload = payload;
    return error;
  } catch {
    const error = new Error(`The request failed with status ${response.status}.`);
    error.status = response.status;
    return error;
  }
}

export async function apiRequest(path, { demoUserId, headers: providedHeaders, ...options } = {}) {
  const headers = new Headers(providedHeaders || {});
  if (demoUserId !== undefined) {
    headers.set("x-demo-user-id", String(demoUserId));
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw await getApiError(response);
  }

  return response;
}

export function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatFileType(filename) {
  const extension = typeof filename === "string" ? filename.split(".").pop() : "";
  return extension ? extension.toUpperCase() : "FILE";
}

export async function compareDocumentVersions(documentId, fromVersion, toVersion, demoUserId) {
  const query = new URLSearchParams({
    fromVersion: String(fromVersion),
    toVersion: String(toVersion),
  });
  const response = await apiRequest(`/documents/${documentId}/compare?${query}`, { demoUserId });
  return response.json();
}
