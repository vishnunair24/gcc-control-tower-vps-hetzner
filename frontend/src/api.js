// frontend/src/api.js
import axios from "axios";
import config from "./config";

const api = axios.create({
  baseURL: config.API_BASE_URL || "/api",
  withCredentials: true,   // 🔥 THIS IS THE FIX
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: global response guard (keeps logs clean)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("Session expired / not authenticated");
    }
    return Promise.reject(err);
  }
);

export default api;
