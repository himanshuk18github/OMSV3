const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (window.location.hostname.includes("localhost")
    ? "http://localhost:8000/api"
    : "https://app.apnistationery.com/api");

export default API_BASE_URL;
