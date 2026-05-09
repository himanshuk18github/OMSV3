const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const envApiUrl =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";

function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

const fallbackApiUrl = isLocalhost
  ? "http://localhost:8000/api"
  : `${window.location.origin}/api`;

const API_BASE_URL = normalizeApiBaseUrl(envApiUrl || fallbackApiUrl);

export default API_BASE_URL;
