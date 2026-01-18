const isLocalhost =
	typeof window !== "undefined" && window.location.hostname === "localhost";

// For local dev, talk to the backend on port 4000 under /api.
// For VPS / nginx, use same-origin /api (matches login.html).
const defaultBase = isLocalhost ? "http://localhost:4000/api" : "/api";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultBase;