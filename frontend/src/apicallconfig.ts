const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE_URL = isLocalhost
  ? "http://localhost:8000/api"
  : `${window.location.origin}/api`;

export default API_BASE_URL;
