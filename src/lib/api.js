import axios from "axios";

// Base URL of the Bizula API, e.g. https://api.example.com/api
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error("VITE_API_URL is not set; the app is calling http://localhost:5000/api.");
}

const TOKEN_KEY = "bizula_token";
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: API_URL, timeout: 20000, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && tokenStore.get() && !err.config?.url?.startsWith("/auth/login")) {
      tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

/** Human-readable message for any API/network error. */
export function errorMessage(err) {
  if (!err) return "";
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (err.request && !err.response) return "Cannot reach the Bizula server. Check your connection or try again shortly.";
  return err.message || "Something went wrong";
}

/** Field-level validation errors ({ field: message }) if the API returned any. */
export const fieldErrors = (err) => err?.response?.data?.details || {};
export const errorCode = (err) => err?.response?.data?.details?.code;

export default api;
