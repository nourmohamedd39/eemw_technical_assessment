import { API_URL } from "./constants";

export async function getApiError(response) {
  try {
    const payload = await response.json();
    return payload.message || "The request could not be completed.";
  } catch {
    return `The request failed with status ${response.status}.`;
  }
}

export async function apiRequest(path, { demoUserId, headers: providedHeaders, ...options } = {}) {
  const headers = new Headers(providedHeaders || {});
  if (demoUserId !== undefined) {
    headers.set("x-demo-user-id", String(demoUserId));
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(await getApiError(response));
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
